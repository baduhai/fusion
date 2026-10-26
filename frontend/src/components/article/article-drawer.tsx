import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  Circle,
  CircleCheck,
  ExternalLink,
  FileText,
  Inbox,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUrlState } from "@/hooks/use-url-state";
import type { Item } from "@/lib/api";
import {
  useItem,
  useItems,
  useMarkItemsRead,
  useMarkItemsUnread,
  useFetchItemContent,
  useDeleteItem,
} from "@/queries/items";
import { useFeedLookup } from "@/queries/feeds";
import {
  useBookmarkLookup,
  useCreateBookmark,
  useDeleteBookmark,
  useStarredItems,
} from "@/queries/bookmarks";
import { useArticleNavigation } from "@/hooks/use-keyboard";
import { useI18n } from "@/lib/i18n";
import { usePreferencesStore } from "@/store";
import { formatDate } from "@/lib/utils";
import { processArticleContent } from "@/lib/content";
import { getFaviconUrl } from "@/lib/api/favicon";
import { FeedFavicon } from "@/components/feed/feed-favicon";
import { toSafeExternalUrl } from "@/lib/safe-url";
import { ArticleActionsBar, type ArticleAction } from "./article-actions-bar";
import { EinkArticleView } from "./eink/eink-article-view";

const standaloneFeedLink = "fusion://standalone";

export function ArticleDrawer() {
  const { t } = useI18n();
  const {
    selectedArticleId,
    setSelectedArticle,
    setSelectedFeed,
    selectedFeedId,
    selectedGroupId,
    articleFilter,
  } = useUrlState();
  const { getFeedById } = useFeedLookup();
  const isStarredMode = articleFilter === "starred";

  const itemsQuery = useItems({
    feedId: selectedFeedId,
    groupId: selectedGroupId,
    unread: articleFilter === "unread" ? true : undefined,
  });
  const articles = useMemo(
    () => itemsQuery.data?.pages.flatMap((p) => p.data) ?? [],
    [itemsQuery.data],
  );
  const starredArticles = useStarredItems({
    feedId: selectedFeedId,
    groupId: selectedGroupId,
  });

  const listArticles = isStarredMode ? starredArticles : articles;

  const markRead = useMarkItemsRead();
  const markUnread = useMarkItemsUnread();
  const { isItemStarred, getBookmarkByItemId } = useBookmarkLookup();
  const createBookmark = useCreateBookmark();
  const deleteBookmark = useDeleteBookmark();

  const fetchContent = useFetchItemContent();
  const deleteItem = useDeleteItem();

  const articleIds = listArticles.map((a) => a.id);

  const storeArticle = selectedArticleId
    ? (listArticles.find((i) => i.id === selectedArticleId) ?? null)
    : null;

  const shouldFetchArticle =
    selectedArticleId !== null &&
    selectedArticleId > 0 &&
    (isStarredMode || storeArticle === null);
  const { data: fetchedArticle } = useItem(
    selectedArticleId,
    shouldFetchArticle,
  );

  const article: Item | null =
    (isStarredMode ? fetchedArticle ?? storeArticle : storeArticle ?? fetchedArticle) ??
    null;
  const isStandalone = article !== null && article.feed_id > 0 && getFeedById(article.feed_id)?.link === standaloneFeedLink;
  const canToggleRead =
    article !== null && article.id > 0 && (!isStarredMode || fetchedArticle !== undefined);
  const feed = article ? getFeedById(article.feed_id) : null;
  const bookmark = article ? getBookmarkByItemId(article.id) : null;
  const starred = article ? isItemStarred(article.id) : false;
  const safeArticleLink = article ? toSafeExternalUrl(article.link) : null;

  const autoMarkRead = usePreferencesStore((s) => s.autoMarkRead);
  const einkMode = usePreferencesStore((s) => s.einkMode);
  const einkTextScale = usePreferencesStore((s) => s.einkTextScale);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const autoMarkedRef = useRef<number | null>(null);
  const addedToInboxRef = useRef<number | null>(null);

  // Reset per-article bookkeeping when the open article changes. Declared
  // before the auto-mark effect so the refs are clear when it runs.
  useEffect(() => {
    autoMarkedRef.current = null;
    addedToInboxRef.current = null;
  }, [article?.id]);

  useEffect(() => {
    if (!article || !article.unread || !autoMarkRead || !canToggleRead) {
      return;
    }

    if (addedToInboxRef.current === article.id) {
      return;
    }

    if (autoMarkedRef.current === article.id) {
      return;
    }

    const viewport = scrollAreaRef.current?.querySelector<HTMLDivElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    if (!viewport) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      if (clientHeight === 0) return;
      if (scrollTop + clientHeight >= scrollHeight * 0.8) {
        autoMarkedRef.current = article.id;
        markRead.mutateAsync([article.id]).catch(() => {});
      }
    };

    viewport.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      viewport.removeEventListener("scroll", handleScroll);
    };
  }, [article, article?.id, autoMarkRead, canToggleRead, markRead]);

  // Focus the article so the browser natively routes PageUp/PageDown (and
  // Space/Home/End) to the surrounding scroll viewport. Reset scroll on change.
  // In e-ink mode pagination owns the keys, so this is a no-op there.
  const activeArticleId = article?.id ?? null;
  useEffect(() => {
    if (activeArticleId === null) {
      return;
    }
    const viewport = scrollAreaRef.current?.querySelector<HTMLDivElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    if (viewport) {
      viewport.scrollTop = 0;
    }
    articleRef.current?.focus({ preventScroll: true });
  }, [activeArticleId]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedArticle(null);
    }
  };

  const handleToggleRead = async () => {
    if (!article || !canToggleRead) return;
    try {
      if (article.unread) {
        await markRead.mutateAsync([article.id]);
      } else {
        await markUnread.mutateAsync([article.id]);
      }
    } catch (error) {
      console.error("Failed to toggle read status:", error);
    }
  };

  const handleToggleStar = async () => {
    if (!article) return;
    try {
      if (starred) {
        const bookmark = getBookmarkByItemId(article.id);
        if (bookmark) {
          await deleteBookmark.mutateAsync(bookmark.id);
        }
      } else {
        await createBookmark.mutateAsync(article);
      }
    } catch (error) {
      console.error("Failed to toggle star:", error);
    }
  };

  const handleAddToInbox = async () => {
    if (!article || !canToggleRead) return;
    addedToInboxRef.current = article.id;
    try {
      await markUnread.mutateAsync([article.id]);
    } catch (error) {
      console.error("Failed to add to inbox:", error);
    }
  };

  const handleOpenOriginal = () => {
    if (!safeArticleLink) return;
    window.open(safeArticleLink, "_blank", "noopener,noreferrer");
  };

  const handleFetchContent = async () => {
    if (!article) return;
    const wasRead = !article.unread;
    try {
      await fetchContent.mutateAsync(article.id);
    } catch (error) {
      console.error("Failed to fetch content:", error);
      toast.error(t("article.toast.fetchContentFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
      return;
    }

    // The feed only provided a truncated body. Reset the reading position and
    // treat the article as unread so the full version must be read to its end
    // before it is auto-marked read again.
    const viewport = scrollAreaRef.current?.querySelector<HTMLDivElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    if (viewport) {
      viewport.scrollTop = 0;
    }
    autoMarkedRef.current = null;
    if (wasRead) {
      markUnread.mutateAsync([article.id]).catch(() => {});
    }
  };

  const handleRemove = async () => {
    if (!article) return;
    try {
      await deleteItem.mutateAsync(article.id);
      setSelectedArticle(null);
    } catch (error) {
      console.error("Failed to remove article:", error);
    }
  };

  const handleOpenFeed = () => {
    if (!article || article.feed_id <= 0) return;
    setSelectedFeed(article.feed_id);
  };

  const getLinkDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  useArticleNavigation(articleIds, {
    enabled: selectedArticleId !== null,
    onToggleRead: () => {
      void handleToggleRead();
    },
    onToggleStar: () => {
      void handleToggleStar();
    },
    onOpenOriginal: handleOpenOriginal,
  });

  // In e-ink mode, reaching the last page marks the article read (there is no
  // scroll-bottom to observe).
  const handlePageChange = (page: number, pageCount: number) => {
    if (!einkMode || !autoMarkRead || !article || !article.unread || !canToggleRead) {
      return;
    }
    if (page < pageCount - 1 || autoMarkedRef.current === article.id) {
      return;
    }
    autoMarkedRef.current = article.id;
    markRead.mutateAsync([article.id]).catch(() => {});
  };

  const articleBody = article ? (
    <>
      <div className="space-y-3">
        <h1 className="text-[28px] font-bold leading-[1.3]">
          {article.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {article.feed_id > 0 ? (
            <button
              type="button"
              onClick={handleOpenFeed}
              className="flex max-w-48 items-center gap-1.5 rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
            >
              {feed && (
                <FeedFavicon
                  src={getFaviconUrl(feed.link, feed.site_url)}
                  className="h-3.5 w-3.5 rounded-sm"
                />
              )}
              <span className="truncate hover:underline">
                {feed?.name ?? bookmark?.feed_name ?? t("common.unknown")}
              </span>
            </button>
          ) : (
            <span className="flex max-w-48 items-center gap-1.5 rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
              <span className="truncate">
                {bookmark?.feed_name ?? t("common.unknown")}
              </span>
            </span>
          )}
          <span className="text-muted-foreground">
            {formatDate(article.pub_date)}
          </span>
          {safeArticleLink ? (
            <a
              href={safeArticleLink}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-primary hover:underline"
            >
              {getLinkDomain(safeArticleLink)}
            </a>
          ) : null}
        </div>
      </div>

      <div
        className="prose prose-neutral mt-6 min-w-0 max-w-none break-words dark:prose-invert"
        dangerouslySetInnerHTML={{
          __html: processArticleContent(
            article.full_content || article.content,
            safeArticleLink ?? undefined,
          ),
        }}
      />
    </>
  ) : null;

  // Ordered by priority: the actions bar keeps the highest-priority items
  // inline and only moves the tail into the overflow menu. Remove stays last
  // because it is destructive and only applies to standalone articles.
  const actions: ArticleAction[] = article
    ? [
        {
          id: "toggle-read",
          label: article.unread
            ? t("article.action.markRead")
            : t("article.action.markUnread"),
          icon: article.unread ? (
            <Circle className="h-4 w-4 text-muted-foreground" />
          ) : (
            <CircleCheck className="h-4 w-4 text-primary" />
          ),
          onSelect: () => {
            void handleToggleRead();
          },
          disabled: !canToggleRead,
        },
        {
          id: "star",
          label: starred ? t("article.action.unstar") : t("article.action.star"),
          icon: (
            <Star
              className={`h-4 w-4 ${starred ? "fill-current text-amber-500" : ""}`}
            />
          ),
          onSelect: () => {
            void handleToggleStar();
          },
        },
        {
          id: "fetch-content",
          label: fetchContent.isPending
            ? t("article.action.fetchingContent")
            : t("article.action.fetchContent"),
          icon: (
            <FileText
              className={`h-4 w-4 ${fetchContent.isPending ? "animate-pulse" : ""}`}
            />
          ),
          onSelect: () => {
            void handleFetchContent();
          },
          disabled: fetchContent.isPending || Boolean(article.full_content),
        },
        {
          id: "original",
          label: t("article.action.original"),
          icon: <ExternalLink className="h-4 w-4" />,
          href: safeArticleLink ?? undefined,
          disabled: !safeArticleLink,
        },
        ...((!article.unread || article.archived) && canToggleRead
          ? [
              {
                id: "add-to-inbox",
                label: t("article.action.addToInbox"),
                icon: <Inbox className="h-4 w-4" />,
                onSelect: () => {
                  void handleAddToInbox();
                },
              } satisfies ArticleAction,
            ]
          : []),
        ...(isStandalone
          ? [
              {
                id: "remove",
                label: deleteItem.isPending
                  ? t("common.deleting")
                  : t("standalone.remove"),
                icon: <Trash2 className="h-4 w-4 text-destructive" />,
                onSelect: () => {
                  void handleRemove();
                },
                disabled: deleteItem.isPending,
                destructive: true,
              } satisfies ArticleAction,
            ]
          : []),
      ]
    : [];

  return (
    <Sheet open={selectedArticleId !== null} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[max(720px,50vw)] p-0"
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          articleRef.current?.focus();
        }}
      >
        {article && (
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 border-b px-4 py-3 sm:px-6">
              <ArticleActionsBar actions={actions} />

              <SheetTitle className="sr-only">{article.title}</SheetTitle>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSelectedArticle(null)}
                aria-label={t("common.cancel")}
              >
                <X className="h-[18px] w-[18px] text-muted-foreground" />
              </Button>
            </div>

            {/* Content */}
            {einkMode ? (
              <EinkArticleView
                key={`${article.id}:${(article.full_content || article.content).length}`}
                remeasureKey={`${(article.full_content || article.content).length}:${einkTextScale}`}
                onPageChange={handlePageChange}
              >
                {articleBody}
              </EinkArticleView>
            ) : (
              <ScrollArea ref={scrollAreaRef} className="min-h-0 flex-1">
                <article
                  ref={articleRef}
                  tabIndex={-1}
                  className="min-w-0 px-5 py-6 outline-none sm:px-12 sm:py-8"
                >
                  {articleBody}
                </article>
              </ScrollArea>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
