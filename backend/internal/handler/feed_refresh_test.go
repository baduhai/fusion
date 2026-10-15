package handler

import (
	"context"
	"net/http"
	"strconv"
	"testing"
	"time"
)

func TestRefreshAllRunGuard(t *testing.T) {
	h := &Handler{}

	if !h.tryStartRefreshAll() {
		t.Fatal("expected first refresh-all start to succeed")
	}
	if h.tryStartRefreshAll() {
		t.Fatal("expected second refresh-all start to be rejected")
	}

	h.finishRefreshAll()

	if !h.tryStartRefreshAll() {
		t.Fatal("expected refresh-all to be allowed after finish")
	}
}

// blockingPuller signals when a refresh starts and blocks until released, so a
// test can observe whether the HTTP handler waits for the refresh to finish.
type blockingPuller struct {
	noopPuller
	started chan int64
	release chan struct{}
}

func (p *blockingPuller) RefreshFeed(ctx context.Context, feedID int64) error {
	p.started <- feedID
	select {
	case <-p.release:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// TestRefreshFeedWaitsForCompletion pins the manual single-feed refresh to a
// synchronous contract: the response must not be sent until the pull has
// finished, otherwise the client refetches items before they are written.
func TestRefreshFeedWaitsForCompletion(t *testing.T) {
	puller := &blockingPuller{
		started: make(chan int64, 1),
		release: make(chan struct{}),
	}
	h, st := newAnonTestHandler(t, puller)
	router := h.SetupRouter()

	group, err := st.CreateGroup("G")
	if err != nil {
		t.Fatalf("create group: %v", err)
	}
	feed, err := st.CreateFeed(group.ID, "Feed", "https://example.com/feed.xml", "", "", nil, false)
	if err != nil {
		t.Fatalf("create feed: %v", err)
	}

	done := make(chan int, 1)
	go func() {
		w := performRequest(router, http.MethodPost, "/api/feeds/"+strconv.FormatInt(feed.ID, 10)+"/refresh", nil, nil)
		done <- w.Code
	}()

	select {
	case <-puller.started:
	case <-time.After(2 * time.Second):
		t.Fatal("refresh handler never invoked the puller")
	}

	// The pull is blocked, so the handler must not have responded yet.
	select {
	case code := <-done:
		t.Fatalf("refresh responded with %d before the pull completed", code)
	case <-time.After(100 * time.Millisecond):
	}

	close(puller.release)

	select {
	case code := <-done:
		if code != http.StatusOK {
			t.Fatalf("expected 200 after the pull completed, got %d", code)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("refresh handler did not respond after the pull completed")
	}
}
