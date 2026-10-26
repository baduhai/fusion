package handler

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestFetchItemContentReportsBlockedSource(t *testing.T) {
	source := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	defer source.Close()

	h, st := newAnonTestHandler(t, &noopPuller{})
	h.config.AllowPrivateFeeds = true

	group, err := st.CreateGroup("G")
	if err != nil {
		t.Fatalf("create group: %v", err)
	}
	feed, err := st.CreateFeed(group.ID, "Feed", source.URL, "", "", nil, false)
	if err != nil {
		t.Fatalf("create feed: %v", err)
	}
	item, err := st.CreateItem(feed.ID, "guid", "Title", source.URL, "teaser", 0)
	if err != nil {
		t.Fatalf("create item: %v", err)
	}

	router := h.SetupRouter()
	w := performRequest(
		router,
		http.MethodPost,
		"/api/items/"+strconv.FormatInt(item.ID, 10)+"/fetch-content",
		nil,
		nil,
	)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
	if !strings.Contains(w.Body.String(), "source returned HTTP 403") {
		t.Fatalf("expected blocked-source error, got %q", w.Body.String())
	}
}

func TestMarkItemsBatchValidation(t *testing.T) {
	ids := make([]int64, maxBatchUpdateIDs+1)
	for i := range ids {
		ids[i] = int64(i + 1)
	}

	tests := []struct {
		name    string
		path    string
		handler gin.HandlerFunc
		body    any
	}{
		{name: "read rejects too many ids", path: "/api/items/-/read", handler: (&Handler{}).markItemsRead, body: gin.H{"ids": ids}},
		{name: "unread rejects empty ids", path: "/api/items/-/unread", handler: (&Handler{}).markItemsUnread, body: gin.H{"ids": []int64{}}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := newTestRouter()
			r.PATCH(tt.path, tt.handler)

			w := performRequest(
				r,
				http.MethodPatch,
				tt.path,
				mustJSONBody(t, tt.body),
				map[string]string{"Content-Type": "application/json"},
			)

			if w.Code != http.StatusBadRequest {
				t.Fatalf("expected status 400, got %d", w.Code)
			}
		})
	}
}
