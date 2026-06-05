# Swipe Actions Design

**Date**: 2026-06-05
**Status**: Draft

## Summary

Add touch swipe gestures to article items for quick actions. Swipe left (RTL) toggles read/unread on all pages. Swipe right (LTR) performs a page-specific action: archive on inbox, remove on standalone, nothing on feed pages.

## Behavior

| Page | Swipe right (LTR) | Swipe left (RTL) |
|------|------------------|-------------------|
| Inbox | Archive | Toggle read/unread |
| Standalone | Remove | Toggle read/unread |
| All / Unread / Starred | -- | Toggle read/unread |
| Feed pages | -- | Toggle read/unread |

- **Toggle behavior**: If unread, mark read; if read, mark unread. Icon underneath reflects the target state.
- **Touch only** — no mouse drag support.
- **Visual feedback**: Card slides horizontally to reveal a colored background with an action icon underneath.
- **Threshold**: 40% of item width, minimum 80px.
- **Snap back**: If released before threshold, card animates back to position.
- **On trigger**: Card animates off-screen, action fires.

## Architecture

### Hook: `use-swipe.ts`

Manages touch drag state: `idle -> dragging -> triggered`.

On `touchmove`: track deltaX. If horizontal > vertical, preventDefault to disable page scroll. Update offsetX.
On `touchend`: if offsetX exceeds threshold * width, fire callback and animate card off-screen. Otherwise, spring back.

### Component: `ArticleItem`

New prop `swipeActions?: { left?: SwipeAction; right?: SwipeAction }` where `SwipeAction = { icon, background: string, label: string }`.

Layout: outer container (overflow-hidden) contains background layer (absolute, full size with icon + bg) and card layer (translateX(offsetX) with transitions).

### Component: `ArticleList`

Passes `swipeActions` to each `ArticleItem` based on page context (`articleFilter`, `isStandalone`).

## Files

```
Created:
  frontend/src/hooks/use-swipe.ts

Modified:
  frontend/src/components/article/article-item.tsx
  frontend/src/components/article/article-list.tsx
```
