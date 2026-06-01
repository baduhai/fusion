import { BookOpen, ExternalLink, Trash2, Plus, Star, Circle, CircleCheck } from "lucide-react";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/app-layout";
import { ContentHeader } from "@/components/layout/content-header";
import { SidebarTrigger } from "@/components/layout/sidebar-trigger";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/lib/i18n";
import { cn, formatDate, extractSummary } from "@/lib/utils";
import { toSafeExternalUrl } from "@/lib/safe-url";
import { useUrlState } from "@/hooks/use-url-state";
import { useItems, useMarkItemsRead, useMarkItemsUnread, useDeleteItem } from "@/queries/items";
import { useFeedLookup } from "@/queries/feeds";
import {
  useBookmarkLookup,
  useCreateBookmark,
  useDeleteBookmark,
} from "@/queries/bookmarks";
import { useUIStore } from "@/store";
import type { Item } from "@/lib/api";

const standaloneFeedLink = "fusion://standalone";

export function StandaloneArticlesPage() {
  const { t } = useI18n();
  const { feeds } = useFeedLookup();
  const standaloneFeed = useMemo(
    () => feeds.find((f) => f.link === standaloneFeedLink),
    [feeds],
  );
  const standaloneFeedId = standaloneFeed?.id ?? 0;

  const { data, isLoading } = useItems({ feedId: standaloneFeedId });
  const articles = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  );
  const deleteItem = useDeleteItem();
  const markItemsRead = useMarkItemsRead();
  const markItemsUnread = useMarkItemsUnread();
  const { selectedArticleId, setSelectedArticle } = useUrlState();
  const { isItemStarred, getBookmarkByItemId } = useBookmarkLookup();
  const createBookmark = useCreateBookmark();
  const deleteBookmark = useDeleteBookmark();
  const { setAddStandaloneOpen } = useUIStore();

  const handleRemove = async (id: number) => {
    try {
      await deleteItem.mutateAsync(id);
      toast.success(t("standalone.toast.removed"));
    } catch {
      toast.error(t("standalone.toast.removeFailed"));
    }
  };

  const handleToggleRead = useCallback(
    async (article: Item) => {
      try {
        if (article.unread) {
          await markItemsRead.mutateAsync([article.id]);
        } else {
          await markItemsUnread.mutateAsync([article.id]);
        }
      } catch {
        console.error("Failed to toggle read status");
      }
    },
    [markItemsRead, markItemsUnread],
  );

  const handleToggleStar = async (article: Item) => {
    try {
      if (isItemStarred(article.id)) {
        const bookmark = getBookmarkByItemId(article.id);
        if (bookmark) {
          await deleteBookmark.mutateAsync(bookmark.id);
        }
      } else {
        await createBookmark.mutateAsync(article);
      }
    } catch {
      console.error("Failed to toggle star");
    }
  };

  const getLinkDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  const unreadCount = articles.filter((a) => a.unread).length;

  return (
    <AppLayout>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <ContentHeader>
          <div className="flex items-center gap-1">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">
              {t("feed.standaloneArticles")}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span className="font-medium">
              {t("standalone.count", { count: unreadCount })}
            </span>
          </div>
        </ContentHeader>

        <div className="flex items-center gap-2 px-4 py-3 sm:px-6">
          <Button
            size="sm"
            onClick={() => setAddStandaloneOpen(true)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t("standalone.addArticle")}
          </Button>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-md bg-accent"
                  />
                ))}
              </div>
            ) : articles.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {t("standalone.empty")}
              </div>
            ) : (
              <div>
                {articles.map((article) => {
                  const isSelected = selectedArticleId === article.id;
                  const starred = isItemStarred(article.id);
                  const safeLink = toSafeExternalUrl(article.link);

                  return (
                    <div
                      key={article.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedArticle(article.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedArticle(article.id);
                        }
                      }}
                      className={cn(
                        "group relative flex w-full cursor-pointer items-start gap-4 border-b px-4 py-4 text-left transition-colors hover:bg-accent/50",
                        isSelected && "bg-accent",
                        !article.unread && "opacity-60",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await handleToggleRead(article);
                          }}
                          className="mt-0.5 shrink-0"
                          aria-label={
                            article.unread
                              ? t("article.action.markRead")
                              : t("article.action.markUnread")
                          }
                        >
                          {article.unread ? (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <CircleCheck className="h-4 w-4 text-primary" />
                          )}
                        </Button>
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <h3 className="line-clamp-2 text-[15px] leading-snug font-medium">
                          {article.title}
                        </h3>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {extractSummary(article.content, 150)}
                        </p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="truncate font-medium text-muted-foreground">
                            {getLinkDomain(article.link)}
                          </span>
                          {article.pub_date > 0 && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              <span className="shrink-0 text-muted-foreground">
                                {formatDate(article.pub_date)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="absolute right-2 top-2 hidden items-center gap-1 group-hover:flex">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await handleToggleRead(article);
                          }}
                          className="bg-muted"
                          aria-label={
                            article.unread
                              ? t("article.action.markRead")
                              : t("article.action.markUnread")
                          }
                          title={
                            article.unread
                              ? t("article.action.markRead")
                              : t("article.action.markUnread")
                          }
                        >
                          {article.unread ? (
                            <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <CircleCheck className="h-3.5 w-3.5 text-primary" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await handleToggleStar(article);
                          }}
                          className={cn(
                            starred
                              ? "bg-amber-100 dark:bg-amber-950/40"
                              : "bg-muted",
                          )}
                          aria-label={
                            starred
                              ? t("article.action.unstar")
                              : t("article.action.star")
                          }
                          title={
                            starred
                              ? t("article.action.unstar")
                              : t("article.action.star")
                          }
                        >
                          <Star
                            className={cn(
                              "h-3.5 w-3.5",
                              starred
                                ? "fill-amber-500 text-amber-500"
                                : "text-muted-foreground",
                            )}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await handleRemove(article.id);
                          }}
                          className="bg-muted"
                          aria-label={t("standalone.remove")}
                          title={t("standalone.remove")}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                        {safeLink ? (
                          <Button
                            asChild
                            variant="ghost"
                            size="icon-sm"
                            className="bg-muted"
                            aria-label={t("article.action.openInBrowser")}
                            title={t("article.action.openInBrowser")}
                          >
                            <a
                              href={safeLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </AppLayout>
  );
}
