# Unified Add Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sidebar "Add Article" button with a unified "Add" button that opens a choice dialog offering Article or Feed creation.

**Architecture:** New `AddChoiceDialog` component with two option buttons that toggle existing `isAddStandaloneOpen` / `isAddFeedOpen` UI store flags. Sidebar reorders footer buttons: Add → Manage Feeds → Settings.

**Tech Stack:** React, TypeScript, Zustand (UI store), shadcn/ui Dialog, lucide-react icons, TanStack Router

---

### Task 1: Add UI store state

**Files:**
- Modify: `frontend/src/store/ui.ts`

- [ ] **Step 1: Add `isAddChoiceOpen` state and setter**

In `frontend/src/store/ui.ts`, add the new state field, setter signature, initial value, and setter implementation:

Add to the `UIState` interface (after `isAddStandaloneOpen`):
```ts
  isAddChoiceOpen: boolean;
```

Add to the `UIState` interface actions section (after `setAddStandaloneOpen`):
```ts
  setAddChoiceOpen: (open: boolean) => void;
```

Add initial value (after `isAddStandaloneOpen: false`):
```ts
  isAddChoiceOpen: false,
```

Add setter implementation (after `setAddStandaloneOpen`):
```ts
  setAddChoiceOpen: (open) => set({ isAddChoiceOpen: open }),
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc -b --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/store/ui.ts
git commit -m "feat: add isAddChoiceOpen state to UI store"
```

---

### Task 2: Add i18n keys

**Files:**
- Modify: `frontend/src/lib/i18n/messages/en.ts`

- [ ] **Step 1: Add new keys and remove old key**

In `frontend/src/lib/i18n/messages/en.ts`, remove line 86:
```ts
  "sidebar.addStandaloneArticle": "Add Article",
```

Add new keys (before the `sidebar.manageFeeds` line, line 81):
```ts
  "sidebar.add": "Add",
  "addChoice.title": "What would you like to add?",
  "addChoice.description": "Choose an option below",
  "addChoice.article": "Article",
  "addChoice.articleDescription": "Save a standalone article by URL",
  "addChoice.feed": "Feed",
  "addChoice.feedDescription": "Subscribe to an RSS or Atom feed",
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc -b --noEmit`
Expected: No errors. The `TranslationKey` type is derived from `enMessages` keys, so removing the old key and adding new ones automatically updates the type.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/i18n/messages/en.ts
git commit -m "feat: add AddChoiceDialog i18n keys"
```

---

### Task 3: Create AddChoiceDialog component

**Files:**
- Create: `frontend/src/components/layout/add-choice-dialog.tsx`

- [ ] **Step 1: Create the component file**

Create `frontend/src/components/layout/add-choice-dialog.tsx`:

```tsx
import { BookOpen, Rss } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { useUIStore } from "@/store";

export function AddChoiceDialog() {
  const { t } = useI18n();
  const isOpen = useUIStore((s) => s.isAddChoiceOpen);
  const setOpen = useUIStore((s) => s.setAddChoiceOpen);
  const setAddStandaloneOpen = useUIStore((s) => s.setAddStandaloneOpen);
  const setAddFeedOpen = useUIStore((s) => s.setAddFeedOpen);

  const handleSelectArticle = () => {
    setOpen(false);
    setAddStandaloneOpen(true);
  };

  const handleSelectFeed = () => {
    setOpen(false);
    setAddFeedOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t("addChoice.title")}</DialogTitle>
          <DialogDescription>
            {t("addChoice.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <button
            onClick={handleSelectArticle}
            className="flex items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-medium">
                {t("addChoice.article")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("addChoice.articleDescription")}
              </div>
            </div>
          </button>

          <button
            onClick={handleSelectFeed}
            className="flex items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Rss className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-medium">
                {t("addChoice.feed")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("addChoice.feedDescription")}
              </div>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc -b --noEmit`
Expected: Should fail if `AddChoiceDialog` isn't used yet — but it should compile since it's just a file on disk. Wait for Task 5 to verify compilation with the import.

- [ ] **Step 3: Run goimports (N/A for .tsx)**

Skip — this is a frontend-only file.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/add-choice-dialog.tsx
git commit -m "feat: create AddChoiceDialog component"
```

---

### Task 4: Update sidebar

**Files:**
- Modify: `frontend/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Replace Add Article button with Add button, reorder footer**

In `frontend/src/components/layout/sidebar.tsx`:

Change import line 1: Replace `BookOpen` with `Plus`:
```tsx
import { Plus, Search, Settings, Rss } from "lucide-react";
```

Change line 10: Replace `setAddStandaloneOpen` with `setAddChoiceOpen`:
```tsx
  const { setSearchOpen, setSettingsOpen, setAddChoiceOpen } = useUIStore();
```

Replace the "Add Article" button (lines 62-68):
```tsx
        <button
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent/50"
          onClick={() => setAddChoiceOpen(true)}
        >
          <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{t("sidebar.add")}</span>
        </button>
```

And swap the order: the new Add button goes above Manage Feeds. The footer section (lines 49-75) should become:
```tsx
      {/* Footer */}
      <div className="p-2">
        <button
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent/50"
          onClick={() => setAddChoiceOpen(true)}
        >
          <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{t("sidebar.add")}</span>
        </button>
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
            isFeedsPage
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50",
          )}
          onClick={() => navigate({ to: "/feeds" })}
        >
          <Rss className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{t("sidebar.manageFeeds")}</span>
        </button>
        <button
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent/50"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{t("sidebar.settings")}</span>
        </button>
      </div>
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc -b --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/sidebar.tsx
git commit -m "feat: replace Add Article with unified Add button in sidebar"
```

---

### Task 5: Mount AddChoiceDialog in AppLayout

**Files:**
- Modify: `frontend/src/components/layout/app-layout.tsx`

- [ ] **Step 1: Import and mount AddChoiceDialog**

In `frontend/src/components/layout/app-layout.tsx`:

Add import (after the `StandaloneAddDialog` import on line 13):
```tsx
import { AddChoiceDialog } from "@/components/layout/add-choice-dialog";
```

Add mount (after `<StandaloneAddDialog />` on line 69):
```tsx
      <AddChoiceDialog />
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc -b --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/app-layout.tsx
git commit -m "feat: mount AddChoiceDialog in AppLayout"
```

---

## Final Verification

- [ ] Run `npx tsc -b --noEmit` — zero errors
- [ ] Run `go build -o /dev/null ./...` from repo root — backend compiles (unaffected but verify)
- [ ] Manual smoke test: Click "Add" in sidebar → choice dialog appears → "Article" opens StandaloneAddDialog → "Feed" opens AddFeedDialog
