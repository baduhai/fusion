package handler

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	readability "codeberg.org/readeck/go-readability"
	"github.com/0x2E/fusion/internal/pkg/httpc"
	"github.com/gin-gonic/gin"
)

const standaloneContentFetchTimeout = 30

type createStandaloneArticleRequest struct {
	Link string `json:"link" binding:"required"`
}

func (h *Handler) createStandaloneArticle(c *gin.Context) {
	var req createStandaloneArticleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequestError(c, "invalid request")
		return
	}

	link := strings.TrimSpace(req.Link)
	if link == "" {
		badRequestError(c, "link is required")
		return
	}

	feedID, err := h.store.GetStandaloneFeedID()
	if err != nil {
		internalError(c, err, "get standalone feed")
		return
	}

	exists, err := h.store.ItemExists(feedID, link)
	if err != nil {
		internalError(c, err, "check existing article")
		return
	}
	if exists {
		badRequestError(c, "article already exists")
		return
	}

	client, err := httpc.NewClient(standaloneContentFetchTimeout*time.Second, "", h.config.AllowPrivateFeeds)
	if err != nil {
		internalError(c, err, "create http client")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), standaloneContentFetchTimeout*time.Second)
	defer cancel()

	r, err := http.NewRequestWithContext(ctx, http.MethodGet, link, nil)
	if err != nil {
		internalError(c, err, "create request")
		return
	}
	httpc.SetDefaultHeaders(r)

	resp, err := client.Do(r)
	if err != nil {
		internalError(c, err, "fetch article")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		badRequestError(c, fmt.Sprintf("unexpected status %d", resp.StatusCode))
		return
	}

	parsedURL, err := url.Parse(link)
	if err != nil {
		internalError(c, err, "parse link")
		return
	}

	article, err := readability.FromReader(resp.Body, parsedURL)
	if err != nil {
		internalError(c, err, "extract content")
		return
	}

	title := strings.TrimSpace(article.Title)
	content := strings.TrimSpace(article.Content)
	if content == "" {
		badRequestError(c, "no content extracted")
		return
	}

	now := time.Now().Unix()
	result, err := h.store.CreateItem(feedID, link, title, link, content, now)
	if err != nil {
		internalError(c, err, "save article")
		return
	}

	dataResponse(c, result)
}
