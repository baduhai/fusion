-- Rename the per-feed refresh override column to make its unit explicit.
-- The column was introduced as `refresh_interval` in migration 003; renaming
-- in place is impossible because 003 is already applied on existing databases.

ALTER TABLE feeds RENAME COLUMN refresh_interval TO refresh_interval_seconds;

-- The scheduler derives its sleep from MIN(next_check_at); a legacy zero
-- (feeds never pulled since the 002 backfill) would pin the minimum to
-- "due immediately" forever and mask the real earliest due time.
UPDATE feed_fetch_state SET next_check_at = unixepoch(), updated_at = unixepoch()
WHERE next_check_at = 0;
