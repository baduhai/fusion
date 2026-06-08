# Move Action Buttons from Sidebar to Floating Action Bar

## Summary

Remove the refresh and settings icon buttons from the sidebar feed items and group headers. Add a floating action bar (FAB) to the article list detail pages containing all action buttons: refresh, settings, mark all as read, and archive all.

## Architecture

```
ArticleList
  ├── ContentHeader (title + tabs only, no action buttons)
  ├── Article scroll area
  └── FloatingActionBar (fixed bottom-right, z-40)
        ├── Refresh (feed/group pages)
        ├── Settings (feed pages only)
        ├── Mark All Read (all pages)
        └── Archive All (inbox only)
```

## Changes

| File | Change |
|------|--------|
| **New:** `frontend/src/components/article/floating-action-bar.tsx` | FAB component |
| `frontend/src/components/article/article-list.tsx` | Replace header buttons with `<FloatingActionBar>`, pass handlers |
| `frontend/src/components/feed/feed-item.tsx` | Remove refresh + settings buttons, keep unread count always visible |
| `frontend/src/components/feed/feed-group.tsx` | Remove refresh button, keep unread count always visible |

## Component: `FloatingActionBar`

### Props

| Prop | Type | Purpose |
|------|------|---------|
| `context` | `"feed" \| "group" \| "inbox" \| "all" \| "standalone"` | Which buttons to show |
| `feed?` | `Feed` | For settings dialog (feed pages) |
| `onMarkAllRead` | `() => void` | Callback for mark all read |
| `onArchiveAll` | `() => void` | Callback for archive all |
| `canMarkAllRead` | `boolean` | Disable when no unread |
| `canArchiveAll` | `boolean` | Disable when no articles |
| `feedId?` | `number` | For refresh (feed pages) |
| `groupId?` | `number` | For refresh (group pages) |

### Internal mutations
- `useRefreshFeed(feedId)` - feed refresh
- `useRefreshGroupFeeds(groupId)` - group refresh
- `useUIStore().setEditFeedOpen(true, feed)` - opens settings dialog

### Button visibility matrix

| Context | Refresh | Settings | Mark All Read | Archive All |
|---------|---------|----------|---------------|-------------|
| feed (inbox) | Yes | Yes | Yes | Yes |
| feed (other) | Yes | Yes | Yes | No |
| group | Yes | No | Yes | No |
| inbox | No | No | Yes | Yes |
| all | No | No | Yes | No |
| standalone | No | No | Yes | No |

### Styling

- Container: `fixed bottom-6 right-6 z-40 rounded-lg border bg-background shadow-md p-1`
- Layout: `flex flex-col gap-0.5`
- Buttons: `<Button variant="ghost" size="icon">` wrapped in `<Tooltip>`
- Refresh: `animate-spin` while mutation is pending

## Sidebar Cleanup

- `feed-item.tsx`: Remove the button div containing refresh and settings. Unread count becomes always visible (remove hover toggle logic).
- `feed-group.tsx`: Remove only the refresh button. Unread count stays visible.

## Error Handling

No new error handling needed:
- Refresh mutations: existing cache invalidation on success
- Mark all read / Archive all: existing try/catch in ArticleList handlers
- Settings dialog: existing dialog handles its own state

## Edge Cases

- **No articles**: Mark All Read and Archive All disabled
- **No unread articles**: Mark All Read disabled
- **Empty feeds/groups**: FAB still renders (refresh still useful)
- **Mutation in progress**: Buttons disabled, refresh shows spinner with `animate-spin`
