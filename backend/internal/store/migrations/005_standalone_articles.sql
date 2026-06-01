CREATE TABLE standalone_articles (
    id         INTEGER PRIMARY KEY,
    link       TEXT NOT NULL UNIQUE,
    title      TEXT DEFAULT '',
    content    TEXT DEFAULT '',
    pub_date   INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
