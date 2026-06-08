# Unified "Add" Button in Sidebar

## Summary

Replace the "Add Article" button in the sidebar with a unified "Add" button. Clicking it opens a choice dialog offering "Add Article" or "Add Feed". The "Manage Feeds" button moves below the new Add button.

## Current State

Sidebar footer buttons (top to bottom):
1. **Manage Feeds** - navigates to `/feeds`
2. **Add Article** - opens `StandaloneAddDialog`
3. **Settings** - opens `SettingsDialog`

Both `StandaloneAddDialog` and `AddFeedDialog` are already global dialogs mounted in `AppLayout`.

## Desired State

Sidebar footer buttons (top to bottom):
1. **Add** (new) - opens `AddChoiceDialog`
2. **Manage Feeds** - navigates to `/feeds` (unchanged)
3. **Settings** - opens `SettingsDialog` (unchanged)

## Design

### New Component: `AddChoiceDialog`

**File:** `frontend/src/components/layout/add-choice-dialog.tsx`

A simple `<Dialog>` with two large buttons:

- **Add Article** (BookOpen icon) — sets `isAddStandaloneOpen = true`
- **Add Feed** (Rss icon) — sets `isAddFeedOpen = true`

The dialog closes after selection. Both target dialogs already exist and handle their own open/close lifecycle.

### UI Store Addition

**File:** `frontend/src/store/ui.ts`

Add:
```ts
isAddChoiceOpen: boolean;
setAddChoiceOpen: (open: boolean) => void;
```

### Sidebar Changes

**File:** `frontend/src/components/layout/sidebar.tsx`

- Replace the "Add Article" `<button>` with a new "Add" `<button>` that calls `setAddChoiceOpen(true)`.
- Use a `Plus` icon for the button.
- Move the "Manage Feeds" button below the new Add button.
- Remove the unused `BookOpen` import.

### AppLayout Changes

**File:** `frontend/src/components/layout/app-layout.tsx`

- Import and mount `<AddChoiceDialog />` alongside the other global dialogs.

### i18n Translations

**File:** `frontend/src/lib/i18n/messages/en.ts`

New keys:
```ts
"sidebar.add": "Add",
"addChoice.title": "What would you like to add?",
"addChoice.description": "Choose an option below",
"addChoice.article": "Article",
"addChoice.articleDescription": "Save a standalone article by URL",
"addChoice.feed": "Feed",
"addChoice.feedDescription": "Subscribe to an RSS or Atom feed",
```

Remove key: `"sidebar.addStandaloneArticle"`.

### Files Changed

| File | Action |
|------|--------|
| `frontend/src/store/ui.ts` | Add `isAddChoiceOpen` + `setAddChoiceOpen` |
| `frontend/src/components/layout/sidebar.tsx` | Replace button, reorder footer |
| `frontend/src/components/layout/add-choice-dialog.tsx` | New file |
| `frontend/src/components/layout/app-layout.tsx` | Mount `AddChoiceDialog` |
| `frontend/src/lib/i18n/messages/en.ts` | Add new keys, remove old key |

## Verification

1. `npx tsc -b --noEmit` — compiles clean
2. `go build -o /dev/null ./...` (backend) — compiles clean
3. Manual: Click "Add" in sidebar → dialog appears with Article and Feed options → choosing one opens the corresponding dialog
4. Manual: "Manage Feeds" and "Settings" buttons still work correctly
