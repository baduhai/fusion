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

const maxListLimit = 100
const maxBatchUpdateIDs = 1000

type markItemsReadRequest struct {
	IDs []int64 `json:"ids" binding:"required"`
}

func (h *Handler) listItems(c *gin.Context) {
	params := store.ListItemsParams{}

	if feedID := c.Query("feed_id"); feedID != "" {
		id, err := strconv.ParseInt(feedID, 10, 64)
		if err != nil {
			badRequestError(c, "invalid feed_id")
			return
		}
		params.FeedID = &id
	}

	if groupID := c.Query("group_id"); groupID != "" {
		id, err := strconv.ParseInt(groupID, 10, 64)
		if err != nil {
			badRequestError(c, "invalid group_id")
			return
		}
		params.GroupID = &id
	}

	if unread := c.Query("unread"); unread != "" {
		val, err := strconv.ParseBool(unread)
		if err != nil {
			badRequestError(c, "invalid unread")
			return
		}
		params.Unread = &val
	}

	if limit := c.Query("limit"); limit != "" {
		val, err := strconv.Atoi(limit)
		if err != nil || val <= 0 {
			badRequestError(c, "invalid limit")
			return
		}
		if val > maxListLimit {
			val = maxListLimit
		}
		params.Limit = val
	} else {
		params.Limit = 10
	}

	if offset := c.Query("offset"); offset != "" {
		val, err := strconv.Atoi(offset)
		if err != nil || val < 0 {
			badRequestError(c, "invalid offset")
			return
		}
		params.Offset = val
	}

	if orderBy := c.Query("order_by"); orderBy != "" {
		params.OrderBy = orderBy
	} else {
		params.OrderBy = "pub_date"
	}

	items, err := h.store.ListItems(params)
	if err != nil {
		internalError(c, err, "list items")
		return
	}

	total, err := h.store.CountItems(params)
	if err != nil {
		internalError(c, err, "count items")
		return
	}

	listResponse(c, items, total)
}

func (h *Handler) getItem(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		badRequestError(c, "invalid id")
		return
	}

	item, err := h.store.GetItem(id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			notFoundError(c, "item")
			return
		}
		internalError(c, err, "get item")
		return
	}

	dataResponse(c, item)
}

func (h *Handler) markItemsRead(c *gin.Context) {
	var req markItemsReadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequestError(c, "invalid request")
		return
	}
	if len(req.IDs) == 0 || len(req.IDs) > maxBatchUpdateIDs {
		badRequestError(c, "invalid ids")
		return
	}

	if err := h.store.BatchUpdateItemsUnread(req.IDs, false); err != nil {
		internalError(c, err, "mark items as read")
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *Handler) markItemsUnread(c *gin.Context) {
	var req markItemsReadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequestError(c, "invalid request")
		return
	}
	if len(req.IDs) == 0 || len(req.IDs) > maxBatchUpdateIDs {
		badRequestError(c, "invalid ids")
		return
	}

	if err := h.store.BatchUpdateItemsUnread(req.IDs, true); err != nil {
		internalError(c, err, "mark items as unread")
		return
	}

	c.Status(http.StatusNoContent)
}

const contentFetchTimeout = 30

func (h *Handler) fetchItemContent(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		badRequestError(c, "invalid id")
		return
	}

	item, err := h.store.GetItem(id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			notFoundError(c, "item")
			return
		}
		internalError(c, err, "get item")
		return
	}

	if item.Link == "" {
		badRequestError(c, "item has no link")
		return
	}

	client, err := httpc.NewClient(contentFetchTimeout*time.Second, "", h.config.AllowPrivateFeeds)
	if err != nil {
		internalError(c, err, "create http client")
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), contentFetchTimeout*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, item.Link, nil)
	if err != nil {
		internalError(c, err, "create request")
		return
	}
	httpc.SetDefaultHeaders(req)

	resp, err := client.Do(req)
	if err != nil {
		internalError(c, err, "fetch article")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		badRequestError(c, fmt.Sprintf("unexpected status %d", resp.StatusCode))
		return
	}

	parsedURL, err := url.Parse(item.Link)
	if err != nil {
		internalError(c, err, "parse item link")
		return
	}

	article, err := readability.FromReader(resp.Body, parsedURL)
	if err != nil {
		internalError(c, err, "extract content")
		return
	}

	content := strings.TrimSpace(article.Content)
	if content == "" {
		badRequestError(c, "no content extracted")
		return
	}

	if err := h.store.UpdateItemFullContent(item.FeedID, item.GUID, content); err != nil {
		internalError(c, err, "save content")
		return
	}

	item.FullContent = content
	dataResponse(c, item)
}
