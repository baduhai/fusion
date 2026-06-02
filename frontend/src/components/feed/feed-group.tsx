import { useState } from "react";
import { ChevronRight, RefreshCw } from "lucide-react";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useUrlState } from "@/hooks/use-url-state";
import { FeedItem } from "./feed-item";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useRefreshGroupFeeds } from "@/queries/groups";
import type { Feed } from "@/lib/api";

interface FeedGroupProps {
  groupId: number;
  name: string;
  feeds: Feed[];
}

export function FeedGroup({ groupId, name, feeds }: FeedGroupProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { t } = useI18n();
  const { selectedGroupId, setSelectedGroup } = useUrlState();
  const refreshGroup = useRefreshGroupFeeds();
  const isSelected = selectedGroupId === groupId;

  const unreadCount = feeds.reduce(
    (sum, feed) => sum + (feed.unread_count || 0),
    0,
  );

  const handleRefreshClick = () => {
    refreshGroup.mutate(groupId);
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full min-w-0"
    >
      <div
        className={cn(
          "group flex w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors",
          isSelected
            ? "bg-accent text-accent-foreground"
            : "hover:bg-accent/50",
        )}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="shrink-0 p-1 -m-1 rounded-md transition-colors hover:bg-foreground/10"
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isOpen && "rotate-90",
            )}
          />
        </button>
        <button
          type="button"
          onClick={() => setSelectedGroup(groupId)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <span className="block min-w-0 flex-1 truncate">{name}</span>
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          {unreadCount > 0 && (
            <span className="text-[11px] text-muted-foreground md:group-hover:hidden md:group-focus-within:hidden">
              {unreadCount}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            className="inline-flex md:hidden md:group-hover:inline-flex md:group-focus-within:inline-flex"
            onClick={handleRefreshClick}
            disabled={refreshGroup.isPending}
            aria-label={t("sidebar.refreshGroup")}
          >
            <RefreshCw
              className={cn(
                "text-muted-foreground",
                refreshGroup.isPending && "animate-spin",
              )}
            />
          </Button>
        </div>
      </div>
      <CollapsibleContent>
        <div className="w-full min-w-0 pl-5">
          {feeds.map((feed) => (
            <FeedItem key={feed.id} feed={feed} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
