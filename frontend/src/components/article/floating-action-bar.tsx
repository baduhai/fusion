import { RefreshCw, Settings, CheckCheck, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useUIStore } from "@/store";
import { useRefreshFeed } from "@/queries/feeds";
import { useRefreshGroupFeeds } from "@/queries/groups";
import type { Feed } from "@/lib/api";

export interface FloatingActionBarProps {
  context: "feed" | "group" | "inbox" | "all" | "standalone";
  feed?: Feed;
  feedId?: number;
  groupId?: number;
  showArchiveAll?: boolean;
  canMarkAllRead: boolean;
  canArchiveAll: boolean;
  onMarkAllRead: () => void;
  onArchiveAll: () => void;
}

export function FloatingActionBar({
  context,
  feed,
  feedId,
  groupId,
  showArchiveAll,
  canMarkAllRead,
  canArchiveAll,
  onMarkAllRead,
  onArchiveAll,
}: FloatingActionBarProps) {
  const { t } = useI18n();
  const { setEditFeedOpen } = useUIStore();
  const refreshFeed = useRefreshFeed();
  const refreshGroup = useRefreshGroupFeeds();

  const showRefresh = context === "feed" || context === "group";
  const showSettings = context === "feed" && feed;

  const handleRefresh = () => {
    if (context === "feed" && feedId) {
      refreshFeed.mutate(feedId);
    } else if (context === "group" && groupId) {
      refreshGroup.mutate(groupId);
    }
  };

  const isRefreshing =
    (context === "feed" && refreshFeed.isPending) ||
    (context === "group" && refreshGroup.isPending);

  return (
    <div className="fixed bottom-6 right-6 z-40 rounded-lg border bg-background shadow-md p-1">
      <div className="flex flex-col gap-0.5">
        {showRefresh && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                aria-label={
                  context === "feed"
                    ? t("sidebar.refreshFeed")
                    : t("sidebar.refreshGroup")
                }
              >
                <RefreshCw
                  className={cn(isRefreshing && "animate-spin")}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {context === "feed"
                ? t("sidebar.refreshFeed")
                : t("sidebar.refreshGroup")}
            </TooltipContent>
          </Tooltip>
        )}
        {showSettings && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditFeedOpen(true, feed)}
                aria-label={t("feed.edit.title")}
              >
                <Settings />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("feed.edit.title")}</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onMarkAllRead}
              disabled={!canMarkAllRead}
              aria-label={t("article.list.markAllRead")}
            >
              <CheckCheck />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("article.list.markAllRead")}</TooltipContent>
        </Tooltip>
        {showArchiveAll && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onArchiveAll}
                disabled={!canArchiveAll}
                aria-label={t("article.list.archiveAll")}
              >
                <Archive />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("article.list.archiveAll")}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
