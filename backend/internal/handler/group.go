package handler

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/0x2E/fusion/internal/store"
	"github.com/gin-gonic/gin"
)

type groupRequest struct {
	Name string `json:"name" binding:"required"`
}

func (h *Handler) listGroups(c *gin.Context) {
	groups, err := h.store.ListGroups()
	if err != nil {
		internalError(c, err, "list groups")
		return
	}

	listResponse(c, groups, len(groups))
}

func (h *Handler) getGroup(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		badRequestError(c, "invalid id")
		return
	}

	group, err := h.store.GetGroup(id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			notFoundError(c, "group")
			return
		}
		internalError(c, err, "get group")
		return
	}

	dataResponse(c, group)
}

func (h *Handler) createGroup(c *gin.Context) {
	var req groupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequestError(c, "invalid request")
		return
	}

	group, err := h.store.CreateGroup(req.Name)
	if err != nil {
		internalError(c, err, "create group")
		return
	}

	dataResponse(c, group)
}

func (h *Handler) updateGroup(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		badRequestError(c, "invalid id")
		return
	}

	var req groupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequestError(c, "invalid request")
		return
	}

	if err := h.store.UpdateGroup(id, req.Name); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			notFoundError(c, "group")
			return
		}
		internalError(c, err, "update group")
		return
	}

	group, err := h.store.GetGroup(id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			notFoundError(c, "group")
			return
		}
		internalError(c, err, "get group after update")
		return
	}

	dataResponse(c, group)
}

func (h *Handler) deleteGroup(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		badRequestError(c, "invalid id")
		return
	}

	if err := h.store.DeleteGroup(id); err != nil {
		if errors.Is(err, store.ErrInvalid) {
			badRequestError(c, err.Error())
			return
		}
		if errors.Is(err, store.ErrNotFound) {
			notFoundError(c, "group")
			return
		}
		internalError(c, err, "delete group")
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *Handler) refreshGroupFeeds(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		badRequestError(c, "invalid id")
		return
	}

	if _, err := h.store.GetGroup(id); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			notFoundError(c, "group")
			return
		}
		internalError(c, err, "get group for refresh")
		return
	}

	feeds, err := h.store.ListFeedsByGroup(id)
	if err != nil {
		internalError(c, err, "list feeds by group")
		return
	}

	refreshTimeout := time.Duration(h.config.PullTimeout) * time.Second
	for _, feed := range feeds {
		go func(feedID int64) {
			ctx, cancel := context.WithTimeout(context.Background(), refreshTimeout)
			defer cancel()
			if err := h.puller.RefreshFeed(ctx, feedID); err != nil && !errors.Is(err, context.Canceled) && !errors.Is(err, context.DeadlineExceeded) {
				slog.Warn("refresh feed failed", "feed_id", feedID, "error", err)
			}
		}(feed.ID)
	}

	c.Status(http.StatusAccepted)
}
