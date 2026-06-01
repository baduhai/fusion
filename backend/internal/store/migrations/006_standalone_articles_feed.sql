-- Create a special feed for standalone articles.
-- Uses a custom URI scheme so the puller can identify and skip it.
INSERT INTO feeds (group_id, name, link, site_url, suspended, proxy, created_at, updated_at)
VALUES (1, 'Standalone Articles', 'fusion://standalone', '', 1, '', unixepoch(), unixepoch());

-- Init fetch state for the new feed (required by feed_fetch_state FK and puller read paths).
INSERT INTO feed_fetch_state (feed_id, next_check_at)
VALUES ((SELECT id FROM feeds WHERE link = 'fusion://standalone'), unixepoch());

-- Migrate existing standalone articles into items.
-- pub_date is preserved from the original table; new articles will use add-time.
INSERT INTO items (feed_id, guid, title, link, content, pub_date, unread, created_at)
SELECT
    (SELECT id FROM feeds WHERE link = 'fusion://standalone'),
    link,
    title,
    link,
    content,
    pub_date,
    1,
    created_at
FROM standalone_articles;

-- Drop the now-obsolete standalone_articles table.
DROP TABLE standalone_articles;
