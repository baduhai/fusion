import { RefreshCw, Settings, CheckCheck, Archive, ListChecks } from "lucide-react";
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
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  canSelect: boolean;
  einkAbovePager?: boolean;
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
  selectionMode,
  onToggleSelectionMode,
  canSelect,
  einkAbovePager = false,
}: FloatingActionBarProps) {
  const { t } = useI18n();
  const { setEditFeedOpen } = useUIStore();
  const refreshFeed = useRefreshFeed();
  const refreshGroup = useRefreshGroupFeeds();

  const showRefresh = context === "feed" || context === "group";
  const showSettings = context === "feed" && feed;

  const markReadLabel = selectionMode
    ? t("article.list.markSelectedRead")
    : t("article.list.markAllRead");
  const archiveLabel = selectionMode
    ? t("article.list.archiveSelected")
    : t("article.list.archiveAll");

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
    <div
      className={cn(
        "fixed right-6 z-40 rounded-lg border bg-background shadow-md p-1",
        einkAbovePager ? "bottom-20" : "bottom-6",
      )}
    >
      <div className="flex flex-col gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={selectionMode ? "secondary" : "ghost"}
              size="icon"
              onClick={onToggleSelectionMode}
              disabled={!canSelect}
              aria-label={
                selectionMode
                  ? t("article.list.exitSelectMode")
                  : t("article.list.selectMode")
              }
              aria-pressed={selectionMode}
            >
              <ListChecks />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {selectionMode
              ? t("article.list.exitSelectMode")
              : t("article.list.selectMode")}
          </TooltipContent>
        </Tooltip>
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
              aria-label={markReadLabel}
            >
              <CheckCheck />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{markReadLabel}</TooltipContent>
        </Tooltip>
        {showArchiveAll && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onArchiveAll}
                disabled={!canArchiveAll}
                aria-label={archiveLabel}
              >
                <Archive />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{archiveLabel}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
