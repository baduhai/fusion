package store

import (
	"database/sql"
	"testing"
)

// TestMigration008UpgradeFromPreRename simulates upgrading a database that
// predates migration 008: it still carries the old `refresh_interval` column
// and a legacy zero next_check_at. Reopening the store must rename the column
// in place, keep the stored override, and backfill the zero-state row.
func TestMigration008UpgradeFromPreRename(t *testing.T) {
	s, dbPath := setupTestDB(t)

	group, err := s.CreateGroup("G")
	if err != nil {
		t.Fatalf("CreateGroup: %v", err)
	}

	interval := int64(3600)
	feed, err := s.CreateFeed(group.ID, "Feed", "https://example.com/feed", "", "", &interval, false)
	if err != nil {
		t.Fatalf("CreateFeed: %v", err)
	}

	// Downgrade to the pre-008 shape: old column name, no version 8 record,
	// and a legacy zero next_check_at row.
	if _, err := s.db.Exec(`UPDATE feed_fetch_state SET next_check_at = 0 WHERE feed_id = :id`,
		sql.Named("id", feed.ID)); err != nil {
		t.Fatalf("set legacy zero next_check_at: %v", err)
	}
	if _, err := s.db.Exec(`ALTER TABLE feeds RENAME COLUMN refresh_interval_seconds TO refresh_interval`); err != nil {
		t.Fatalf("downgrade column: %v", err)
	}
	if _, err := s.db.Exec(`DELETE FROM schema_migrations WHERE version = 8`); err != nil {
		t.Fatalf("drop migration record: %v", err)
	}
	if err := s.Close(); err != nil {
		t.Fatalf("close store: %v", err)
	}

	upgraded, err := New(dbPath)
	if err != nil {
		t.Fatalf("reopen after downgrade: %v", err)
	}
	defer upgraded.Close()

	got, err := upgraded.GetFeed(feed.ID)
	if err != nil {
		t.Fatalf("GetFeed after upgrade: %v", err)
	}
	if got.RefreshIntervalSeconds == nil || *got.RefreshIntervalSeconds != interval {
		t.Fatalf("override lost across upgrade: got %v, want %d", got.RefreshIntervalSeconds, interval)
	}
	if got.FetchState.NextCheckAt <= 0 {
		t.Fatalf("legacy zero next_check_at not backfilled: %d", got.FetchState.NextCheckAt)
	}
}
