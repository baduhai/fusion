package pull

import (
	"context"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	readability "codeberg.org/readeck/go-readability"
	"github.com/0x2E/fusion/internal/pkg/httpc"
	"github.com/0x2E/fusion/internal/store"
	"golang.org/x/sync/semaphore"
)

const contentFetchTimeout = 30 * time.Second
const contentFetchConcurrency = 3

type ContentFetcher struct {
	store             *store.Store
	logger            *slog.Logger
	allowPrivateFeeds bool
	concurrency       *semaphore.Weighted
	timeout           time.Duration
}

func NewContentFetcher(st *store.Store, allowPrivateFeeds bool) *ContentFetcher {
	return &ContentFetcher{
		store:             st,
		logger:            slog.Default(),
		allowPrivateFeeds: allowPrivateFeeds,
		concurrency:       semaphore.NewWeighted(contentFetchConcurrency),
		timeout:           contentFetchTimeout,
	}
}

// FetchAndStore fetches the full article content from the given URL, extracts
// readable content using go-readability, and stores it for the item identified
// by (feedID, guid). It only updates if full_content is currently empty.
func (cf *ContentFetcher) FetchAndStore(ctx context.Context, feedID int64, guid, link string) {
	if err := cf.concurrency.Acquire(ctx, 1); err != nil {
		return
	}
	defer cf.concurrency.Release(1)

	if link == "" {
		return
	}

	client, err := httpc.NewClient(cf.timeout, "", cf.allowPrivateFeeds)
	if err != nil {
		cf.logger.Warn("failed to create content fetch client", "link", link, "error", err)
		return
	}

	fetchCtx, cancel := context.WithTimeout(ctx, cf.timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(fetchCtx, http.MethodGet, link, nil)
	if err != nil {
		cf.logger.Warn("failed to create content fetch request", "link", link, "error", err)
		return
	}
	httpc.SetDefaultHeaders(req)

	resp, err := client.Do(req)
	if err != nil {
		cf.logger.Warn("failed to fetch article", "link", link, "error", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		cf.logger.Warn("unexpected status fetching article", "link", link, "status", resp.StatusCode)
		return
	}

	parsedURL, err := url.Parse(link)
	if err != nil {
		cf.logger.Warn("failed to parse article URL", "link", link, "error", err)
		return
	}

	article, err := readability.FromReader(resp.Body, parsedURL)
	if err != nil {
		cf.logger.Warn("failed to extract readable content", "link", link, "error", err)
		return
	}

	content := strings.TrimSpace(article.Content)
	if content == "" {
		return
	}

	if err := cf.store.UpdateItemFullContent(feedID, guid, content); err != nil {
		cf.logger.Error("failed to store full content", "feed_id", feedID, "guid", guid, "error", err)
		return
	}

	cf.logger.Debug("fetched full article content", "feed_id", feedID, "guid", guid)
}

// FetchForFeed dispatches content fetches for items from a feed that has
// auto_fetch_content enabled. It runs asynchronously and returns immediately.
func (cf *ContentFetcher) FetchForFeed(feedID int64, items []*ParsedItem) {
	for i := range items {
		go cf.FetchAndStore(context.Background(), feedID, items[i].GUID, items[i].Link)
	}
}
