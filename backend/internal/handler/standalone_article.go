package handler

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	readability "codeberg.org/readeck/go-readability"
	"github.com/0x2E/fusion/internal/pkg/httpc"
	"github.com/0x2E/fusion/internal/store"
	"github.com/gin-gonic/gin"
)

const standaloneContentFetchTimeout = 30

type createStandaloneArticleRequest struct {
	Link string `json:"link" binding:"required"`
}

func (h *Handler) listStandaloneArticles(c *gin.Context) {
	limit := 50
	offset := 0

	if limitStr := c.Query("limit"); limitStr != "" {
		val, err := strconv.Atoi(limitStr)
		if err != nil || val <= 0 {
			badRequestError(c, "invalid limit")
			return
		}
		if val > maxListLimit {
			val = maxListLimit
		}
		limit = val
	}

	if offsetStr := c.Query("offset"); offsetStr != "" {
		val, err := strconv.Atoi(offsetStr)
		if err != nil || val < 0 {
			badRequestError(c, "invalid offset")
			return
		}
		offset = val
	}

	articles, err := h.store.ListStandaloneArticles(limit, offset)
	if err != nil {
		internalError(c, err, "list standalone articles")
		return
	}

	total, err := h.store.CountStandaloneArticles()
	if err != nil {
		internalError(c, err, "count standalone articles")
		return
	}

	listResponse(c, articles, total)
}

func (h *Handler) getStandaloneArticle(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		badRequestError(c, "invalid id")
		return
	}

	article, err := h.store.GetStandaloneArticle(id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			notFoundError(c, "standalone article")
			return
		}
		internalError(c, err, "get standalone article")
		return
	}

	dataResponse(c, article)
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

	existing, err := h.store.GetStandaloneArticleByLink(link)
	if err == nil {
		dataResponse(c, existing)
		return
	}
	if !errors.Is(err, store.ErrNotFound) {
		internalError(c, err, "check existing standalone article")
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

	var pubDate int64
	if article.PublishedTime != nil {
		pubDate = article.PublishedTime.Unix()
	}

	result, err := h.store.CreateStandaloneArticle(link, title, content, pubDate)
	if err != nil {
		internalError(c, err, "save standalone article")
		return
	}

	dataResponse(c, result)
}

func (h *Handler) deleteStandaloneArticle(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		badRequestError(c, "invalid id")
		return
	}

	if err := h.store.DeleteStandaloneArticle(id); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			notFoundError(c, "standalone article")
			return
		}
		internalError(c, err, "delete standalone article")
		return
	}

	c.Status(http.StatusNoContent)
}
