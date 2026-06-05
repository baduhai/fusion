import { Archive, Circle, CircleCheck, Star, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn, formatDate, extractSummary, estimateReadingTimeMinutes } from "@/lib/utils";
import type { Item } from "@/lib/api";
import { FeedFavicon } from "@/components/feed/feed-favicon";
import { toSafeExternalUrl } from "@/lib/safe-url";
import { useSwipe } from "@/hooks/use-swipe";

export interface SwipeAction {
  icon: React.ReactNode;
  background: string;
  label: string;
}

interface ArticleItemProps {
  article: Item;
  selectedArticleId: number | null;
  onSelectArticle: (articleId: number | null) => void;
  onToggleRead: (article: Item) => Promise<void>;
  onToggleStar: (article: Item) => Promise<void>;
  canToggleRead: boolean;
  isStarred: boolean;
  feedName: string;
  feedFaviconUrl: string | null;
  onRemove?: (id: number) => Promise<void>;
  onArchive?: (id: number) => Promise<void>;
  swipeActions?: { left?: SwipeAction; right?: SwipeAction };
}

export function ArticleItem({
  article,
  selectedArticleId,
  onSelectArticle,
  onToggleRead,
  onToggleStar,
  canToggleRead,
  isStarred,
  feedName,
  feedFaviconUrl,
  onRemove,
  onArchive,
  swipeActions,
}: ArticleItemProps) {
  const { t } = useI18n();

  const readingTimeMinutes = estimateReadingTimeMinutes(
    article.full_content || article.content,
  );
  const readingTime =
    readingTimeMinutes < 1
      ? t("article.readingTime.lessThanOne")
      : t("article.readingTime.minutes", { minutes: readingTimeMinutes });

  const isSelected = selectedArticleId === article.id;
  const safeArticleLink = toSafeExternalUrl(article.link);

  const handleSwipeLeft = () => {
    if (!canToggleRead) return;
    onToggleRead(article).catch((error) => {
      console.error("Failed to toggle read via swipe:", error);
    });
  };

  const handleSwipeRight = () => {
    if (onArchive) {
      onArchive(article.id).catch((error) => {
        console.error("Failed to archive via swipe:", error);
      });
    } else if (onRemove) {
      onRemove(article.id).catch((error) => {
        console.error("Failed to remove via swipe:", error);
      });
    }
  };

  const { offsetX, state, containerRef, onTouchStart, onTouchMove, onTouchEnd } =
    useSwipe({
      onSwipeLeft: swipeActions?.right ? handleSwipeLeft : undefined,
      onSwipeRight: swipeActions?.left ? handleSwipeRight : undefined,
    });

  const handleToggleRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canToggleRead) return;

    try {
      await onToggleRead(article);
    } catch (error) {
      console.error("Failed to toggle read status:", error);
    }
  };

  const handleToggleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await onToggleStar(article);
    } catch (error) {
      console.error("Failed to toggle star:", error);
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRemove) return;
    try {
      await onRemove(article.id);
    } catch (error) {
      console.error("Failed to remove article:", error);
    }
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onArchive) return;
    try {
      await onArchive(article.id);
    } catch (error) {
      console.error("Failed to archive article:", error);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Background layer - right action (revealed on swipe left) */}
      {swipeActions?.right && (
        <div
          className={cn(
            "absolute right-0 top-0 flex h-full items-center justify-end px-5 transition-opacity",
            swipeActions.right.background,
            offsetX < -30 ? "opacity-100" : "opacity-0",
          )}
        >
          <div className="flex flex-col items-center gap-1">
            {swipeActions.right.icon}
            <span className="text-[10px] text-white">
              {swipeActions.right.label}
            </span>
          </div>
        </div>
      )}

      {/* Background layer - left action (revealed on swipe right) */}
      {swipeActions?.left && (
        <div
          className={cn(
            "absolute left-0 top-0 flex h-full items-center px-5 transition-opacity",
            swipeActions.left.background,
            offsetX > 30 ? "opacity-100" : "opacity-0",
          )}
        >
          <div className="flex flex-col items-center gap-1">
            {swipeActions.left.icon}
            <span className="text-[10px] text-white">
              {swipeActions.left.label}
            </span>
          </div>
        </div>
      )}

      {/* Card */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelectArticle(article.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelectArticle(article.id);
          }
        }}
        className={cn(
          "relative bg-background transition-transform",
          state === "idle" ? "duration-200" : "",
          "group flex w-full cursor-pointer items-start gap-4 border-b px-4 py-4 text-left hover:bg-accent/50",
          isSelected && "bg-accent",
        )}
        style={{ transform: `translateX(${offsetX}px)` }}
      >
        {/* Article Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h3
            className={cn(
              "line-clamp-2 text-[15px] leading-snug font-medium",
              article.unread ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {article.title}
          </h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {extractSummary(article.content, 150)}
          </p>
          <div className="flex items-center gap-2 text-xs">
            <FeedFavicon src={feedFaviconUrl} className="h-3.5 w-3.5 rounded-sm" />
            <span className="truncate font-medium text-muted-foreground">
              {feedName}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="shrink-0 text-muted-foreground">
              {formatDate(article.pub_date)}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="shrink-0 text-muted-foreground">
              {readingTime}
            </span>
          </div>
        </div>

        {/* Article Actions */}
        <div className="absolute right-2 top-2 hidden items-center gap-1 group-hover:flex">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleToggleRead}
            disabled={!canToggleRead}
            className={cn(article.unread ? "bg-muted" : "bg-primary/10")}
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
              <Circle className="text-muted-foreground" />
            ) : (
              <CircleCheck className="text-primary" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleToggleStar}
            className={cn(isStarred ? "bg-amber-100 dark:bg-amber-950/40" : "bg-muted")}
            aria-label={
              isStarred ? t("article.action.unstar") : t("article.action.star")
            }
            title={isStarred ? t("article.action.unstar") : t("article.action.star")}
          >
            <Star
              className={cn(
                isStarred
                  ? "fill-amber-500 text-amber-500"
                  : "text-muted-foreground",
              )}
            />
          </Button>
          {onArchive && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleArchive}
              className="bg-muted"
              aria-label={t("article.action.archive")}
              title={t("article.action.archive")}
            >
              <Archive className="text-muted-foreground" />
            </Button>
          )}
          {onRemove && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleRemove}
              className="bg-muted"
              aria-label={t("article.action.remove")}
              title={t("article.action.remove")}
            >
              <Trash2 className="text-destructive" />
            </Button>
          )}
          {safeArticleLink ? (
            <Button
              asChild
              variant="ghost"
              size="icon-sm"
              className="bg-muted"
              aria-label={t("article.action.openInBrowser")}
              title={t("article.action.openInBrowser")}
            >
              <a
                href={safeArticleLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="text-muted-foreground" />
              </a>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              disabled
              className="bg-muted"
              aria-label={t("article.action.openInBrowser")}
              title={t("article.action.openInBrowser")}
            >
              <ExternalLink className="text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
