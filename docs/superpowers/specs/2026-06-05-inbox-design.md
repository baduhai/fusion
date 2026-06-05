# Inbox Feature Design

**Date**: 2026-06-05
**Status**: Draft

## Summary

Add a proper Inbox to Fusion. The inbox holds unread articles by default, and articles can be removed (archived) from the inbox without marking them as read. Inbox membership is independent of read status.

**Sidebar**: Inbox (default page) | All (with filter bar: All / Unread / Starred)

## Behavior

- **Inbox rule**: an item is in the inbox when `unread = 1 AND archived = 0`.
- New items default to `unread=1, archived=0` — they appear in the inbox.
- Marking an item as read sets `archived=1` — it leaves the inbox.
- Marking an item as unread sets `archived=0` — it re-enters the inbox.
- Archiving an item manually sets `archived=1` without changing `unread` — it leaves the inbox while staying unread.
- Unarchiving sets `archived=0` — it re-enters the inbox.

## Data Model

**Migration `007_inbox.sql`:**
```sql
ALTER TABLE items ADD COLUMN archived INTEGER DEFAULT 0;
```

Existing items get `archived = 0`. All existing unread items will appear in the inbox; read items won't (they're filtered by `unread = 1`).

## Backend Changes

### Store (`backend/internal/store/item.go`)

**New functions:**
- `ArchiveItems(ids []int64) error` — sets `archived = 1` (does not change `unread`)
- `UnarchiveItems(ids []int64) error` — sets `archived = 0` (does not change `unread`)

**Modified functions** — all mark-as-read operations additionally set `archived=1`; all mark-as-unread operations set `archived=0`:
- `UpdateItemUnread`
- `BatchUpdateItemsUnread`
- `MarkAllAsRead`
- `MarkGroupAsRead`
- `MarkFeedAsReadBefore`
- `MarkGroupAsReadBefore`
- `MarkAllAsReadBefore`

**Modified queries:**
- `ListItems` supports a new `Inbox` filter: adds `AND archived = 0` alongside `unread = 1`.
- Feed/group unread counts remain unchanged — they count `unread = 1` regardless of `archived`.

**New item creation:**
- New items from feed refresh default to `unread=1, archived=0`.

### API (`backend/internal/handler/`)

**New endpoints:**
```
POST /api/items/-/archive    { ids: number[] }   → sets archived=1
POST /api/items/-/unarchive  { ids: number[] }   → sets archived=0
```

**Modified endpoints:**
```
PATCH /api/items/-/read      → additionally sets archived=1
PATCH /api/items/-/unread    → additionally sets archived=0
```

**New query parameter on `GET /api/items`:**
```
?in_inbox=true   → filters to WHERE unread=1 AND archived=0
```

The existing `?unread=true` filter continues to show all unread items regardless of archive status.

## Frontend Changes

### Sidebar (`feed-list.tsx`)
- Remove "Starred" button from the top section.
- Replace "Unread" button with "Inbox" (Inbox icon), linking to `/inbox`, showing count of items where `unread=1 AND archived=0`.
- "All" button stays (BookOpen icon), linking to `/all`.
- Feed list stays unchanged; feed unread badges continue to count `unread=1` regardless of `archived`.

### Routing
- `/` → redirects to `/inbox`
- `/inbox` → new page, inbox items, no filter bar
- `/all` → stays, with filter bar (All / Unread / Starred)
- `/unread` → redirects to `/all?filter=unread`
- `/starred` → redirects to `/all?filter=starred`
- `/feeds/:id/:filter`, `/groups/:id/:filter`, `/standalone/:filter` → unchanged

### Article Filter (`article-filter.ts`)
- Add `"inbox"` to `articleFilters`.

### Queries (`queries/items.ts`)
- `useItems()`: when filter is `"inbox"`, pass `in_inbox=true` to the API.
- New mutation `useArchiveItems()`: calls `POST /api/items/-/archive`.
- New mutation `useUnarchiveItems()`: calls `POST /api/items/-/unarchive`.

### Article List (`article-list.tsx`)
- When `filter === "inbox"`, show an Archive button (Archive icon) on each article row.
- Clicking Archive calls `useArchiveItems` and optimistically removes the article from the list.
- Marking as read also optimistically removes the article from the list (since read sets `archived=1`).

### Inbox Page
- New component rendering article list with `filter="inbox"`, no filter bar above the list.

## Items NOT Affected

- Fever API — no changes.
- Search — no changes.
- OPML import/export — no changes.
- Bookmarks/starred — no changes; still accessible via All page filter bar.
- Standalone articles — no changes; they appear in inbox when unread and unarchived.

## Migration Strategy

Backward-compatible. The new `archived` column defaults to `0`. Existing behavior (Unread filter, Starred filter, feed unread counts) is preserved on the All page. The old `/unread` and `/starred` routes redirect to the equivalent All page filters.
