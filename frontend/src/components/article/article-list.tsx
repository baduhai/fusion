import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArticleItem } from "./article-item";
import { ContentHeader } from "@/components/layout/content-header";
import { SidebarTrigger } from "@/components/layout/sidebar-trigger";
import { useArticleNavigation } from "@/hooks/use-keyboard";
import { useUrlState, type ArticleFilter } from "@/hooks/use-url-state";
import {
  itemQueries,
  useItems,
  useMarkItemsRead,
  useMarkItemsUnread,
  useArchiveItems,
  useDeleteItem,
} from "@/queries/items";
import { useFeedLookup } from "@/queries/feeds";
import { useGroups } from "@/queries/groups";
import {
  useBookmarkLookup,
  useCreateBookmark,
  useDeleteBookmark,
  useStarredItems,
} from "@/queries/bookmarks";
import { queryKeys } from "@/queries/keys";
import { getFaviconUrl } from "@/lib/api/favicon";
import { useI18n } from "@/lib/i18n";
import { useUIStore } from "@/store";
import { toast } from "sonner";
import type { Item } from "@/lib/api";

interface ArticleListProps {
  standaloneFeedId?: number;
}

export function ArticleList({ standaloneFeedId }: ArticleListProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const {
    articleFilter,
    setArticleFilter,
    selectedFeedId,
    selectedGroupId,
    selectedArticleId,
    setSelectedArticle,
  } = useUrlState();
  const queryClient = useQueryClient();
  const [starredUnreadOverrides, setStarredUnreadOverrides] = useState<
    Record<number, boolean>
  >({});

  const isStandalone = standaloneFeedId !== undefined;
  const deleteItem = useDeleteItem();
  const { setAddStandaloneOpen } = useUIStore();

  const isStarredMode = articleFilter === "starred";

  const effectiveFeedId = isStandalone ? standaloneFeedId : selectedFeedId;
  const effectiveGroupId = isStandalone ? null : selectedGroupId;

  // Items query for non-starred modes
  const itemsQuery = useItems({
    feedId: effectiveFeedId,
    groupId: effectiveGroupId,
    unread: articleFilter === "unread" ? true : undefined,
    inbox: articleFilter === "inbox" ? true : undefined,
  });

  const { data: groups = [] } = useGroups();
  const { feeds, getFeedById, isLoading: isFeedsLoading } = useFeedLookup();
  const markItemsRead = useMarkItemsRead();
  const markItemsUnread = useMarkItemsUnread();
  const archiveItems = useArchiveItems();
  const { isItemStarred, getBookmarkByItemId } = useBookmarkLookup();
  const createBookmark = useCreateBookmark();
  const deleteBookmark = useDeleteBookmark();

  // Flatten infinite query pages
  const items = useMemo(
    () => itemsQuery.data?.pages.flatMap((p) => p.data) ?? [],
    [itemsQuery.data],
  );

  const starredArticles = useStarredItems({
    feedId: effectiveFeedId,
    groupId: effectiveGroupId,
  });

  const articles = isStarredMode ? starredArticles : items;
  const getArticleUnread = useCallback(
    (article: Item) => {
      if (!isStarredMode) return article.unread;

      const override = starredUnreadOverrides[article.id];
      if (override !== undefined) return override;

      if (article.id > 0) {
        const cachedItem = queryClient.getQueryData<Item>(
          queryKeys.items.detail(article.id),
        );
        if (cachedItem) return cachedItem.unread;
      }

      return article.unread;
    },
    [isStarredMode, queryClient, starredUnreadOverrides],
  );

  const displayArticles = useMemo(
    () =>
      articles.map((article) => ({
        ...article,
        unread: getArticleUnread(article),
      })),
    [articles, getArticleUnread],
  );

  const hasMore = isStarredMode ? false : itemsQuery.hasNextPage;
  const isLoading = isStarredMode ? false : itemsQuery.isLoading;
  const isLoadingMore = itemsQuery.isFetchingNextPage;

  // Setup keyboard navigation
  const articleIds = displayArticles.map((a) => a.id);
  useArticleNavigation(articleIds, {
    enabled: selectedArticleId === null,
  });

  // Determine title
  let title = t("article.list.all");
  if (isStandalone) {
    title = t("feed.standaloneArticles");
  } else if (selectedFeedId) {
    const feed = getFeedById(selectedFeedId);
    title = feed?.name ?? t("article.feedFallback");
  } else if (selectedGroupId) {
    const group = groups.find((g) => g.id === selectedGroupId);
    title = group?.name ?? t("article.groupFallback");
  } else if (articleFilter === "inbox") {
    title = t("article.list.inbox");
  }

  const unreadCount = displayArticles.filter((a) => a.unread).length;
  const hasNoFeeds = !isStandalone && !isFeedsLoading && feeds.length === 0;

  const handleToggleRead = useCallback(
    async (article: Item) => {
      if (isStarredMode && article.id <= 0) {
        return;
      }

      let unread = getArticleUnread(article);

      if (isStarredMode && article.id > 0) {
        try {
          const detail = await queryClient.ensureQueryData(
            itemQueries.detail(article.id),
          );
          if (detail === undefined) {
            return;
          }

          unread = detail.unread;
        } catch {
          return;
        }
      }

      try {
        if (unread) {
          await markItemsRead.mutateAsync([article.id]);
        } else {
          await markItemsUnread.mutateAsync([article.id]);
        }

        if (isStarredMode) {
          setStarredUnreadOverrides((prev) => ({
            ...prev,
            [article.id]: !unread,
          }));
        }
      } catch (error) {
        console.error("Failed to toggle read status:", error);
      }
    },
    [
      getArticleUnread,
      isStarredMode,
      markItemsRead,
      markItemsUnread,
      queryClient,
    ],
  );

  const handleToggleStar = useCallback(
    async (article: Item) => {
      try {
        if (isItemStarred(article.id)) {
          const bookmark = getBookmarkByItemId(article.id);
          if (bookmark) {
            await deleteBookmark.mutateAsync(bookmark.id);
          }
          return;
        }

        await createBookmark.mutateAsync(article);
      } catch (error) {
        console.error("Failed to toggle star:", error);
      }
    },
    [createBookmark, deleteBookmark, getBookmarkByItemId, isItemStarred],
  );

  const handleArchive = useCallback(
    async (id: number) => {
      try {
        await archiveItems.mutateAsync([id]);
      } catch (error) {
        console.error("Failed to archive article:", error);
      }
    },
    [archiveItems],
  );

  const handleMarkAllAsRead = async () => {
    let unreadIds = displayArticles
      .filter((a) => a.unread && a.id > 0)
      .map((a) => a.id);

    if (isStarredMode) {
      const ids = displayArticles.filter((a) => a.id > 0).map((a) => a.id);
      const detailEntries = await Promise.all(
        ids.map(async (id) => {
          try {
            const detail = await queryClient.ensureQueryData(
              itemQueries.detail(id),
            );
            return [id, detail?.unread ?? false] as const;
          } catch {
            return [id, false] as const;
          }
        }),
      );

      unreadIds = detailEntries
        .filter(([, unread]) => unread)
        .map(([id]) => id);
    }

    if (unreadIds.length === 0) return;

    try {
      await markItemsRead.mutateAsync(unreadIds);

      if (isStarredMode) {
        setStarredUnreadOverrides((prev) => {
          const next = { ...prev };
          for (const id of unreadIds) {
            next[id] = false;
          }
          return next;
        });
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleFilterChange = useCallback(
    (filter: ArticleFilter) => {
      if (isStandalone) {
        navigate({
          to: "/standalone/$filter",
          params: { filter },
          search: { article: undefined },
          replace: true,
        });
        return;
      }
      setArticleFilter(filter);
    },
    [isStandalone, navigate, setArticleFilter],
  );

  const handleRemoveArticle = useCallback(
    async (id: number) => {
      try {
        await deleteItem.mutateAsync(id);
        toast.success(t("standalone.toast.removed"));
      } catch {
        toast.error(t("standalone.toast.removeFailed"));
      }
    },
    [deleteItem, t],
  );

  return (
    <div className="flex h-full flex-col">
      <ContentHeader>
        <div className="flex min-w-0 items-center gap-1">
          <SidebarTrigger />
          <h2 className="truncate text-lg font-semibold">{title}</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAllAsRead}
          disabled={unreadCount === 0}
          className="gap-1.5 text-xs"
        >
          <CheckCheck className="h-4 w-4" />
          {t("article.list.markAllRead")}
        </Button>
      </ContentHeader>

      {/* Article area with filter tabs */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-4 sm:px-6">
        {/* Filter tabs - hidden when no articles exist */}
        {!hasNoFeeds && articleFilter !== "inbox" && (articles.length > 0 || articleFilter !== "all" || isStandalone) && (
          <div className="flex items-center gap-2">
            <Tabs
              value={articleFilter}
              onValueChange={(v) => handleFilterChange(v as ArticleFilter)}
            >
              <TabsList>
                <TabsTrigger value="all">{t("article.filter.all")}</TabsTrigger>
                <TabsTrigger value="unread">{t("article.filter.unread")}</TabsTrigger>
                <TabsTrigger value="starred">
                  {t("article.filter.starred")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {isStandalone && (
              <div className="ml-auto">
                <Button
                  size="sm"
                  onClick={() => setAddStandaloneOpen(true)}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {t("standalone.addArticle")}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Article list */}
        <ScrollArea className="min-h-0 flex-1">
          <div>
            {isLoading && articles.length === 0 ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-md bg-accent"
                  />
                ))}
              </div>
            ) : articles.length === 0 ? (
              isStandalone ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t("standalone.empty")}
                  </p>
                </div>
              ) : hasNoFeeds ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t("article.list.noFeeds")}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate({ to: "/feeds" })}
                  >
                    {t("article.list.openFeedManagement")}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t("article.list.noArticles")}
                  </p>
                </div>
              )
            ) : (
              <>
                {displayArticles.map((article) => {
                  const feed = isStandalone ? null : getFeedById(article.feed_id);
                  const bookmark = getBookmarkByItemId(article.id);
                  const feedName = isStandalone
                    ? (() => {
                        try { return new URL(article.link).hostname; }
                        catch { return article.link; }
                      })()
                    : (feed?.name ?? bookmark?.feed_name ?? t("common.unknown"));

                  return (
                    <ArticleItem
                      key={article.id}
                      article={article}
                      selectedArticleId={selectedArticleId}
                      onSelectArticle={setSelectedArticle}
                      onToggleRead={handleToggleRead}
                      onToggleStar={handleToggleStar}
                      canToggleRead={article.id > 0}
                      isStarred={isItemStarred(article.id)}
                      feedName={feedName}
                      feedFaviconUrl={
                        feed ? getFaviconUrl(feed.link, feed.site_url) : null
                      }
                      onRemove={isStandalone ? handleRemoveArticle : undefined}
                      onArchive={articleFilter === "inbox" && !isStandalone ? handleArchive : undefined}
                    />
                  );
                })}
                {hasMore && (
                  <div className="flex justify-center py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => itemsQuery.fetchNextPage()}
                      disabled={isLoadingMore}
                      className="gap-2"
                    >
                      {isLoadingMore && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {isLoadingMore
                        ? t("article.list.loading")
                        : t("article.list.loadMore")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
