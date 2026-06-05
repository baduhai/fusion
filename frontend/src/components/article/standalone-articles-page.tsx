import { useMemo } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { ArticleList } from "./article-list";
import { useFeedLookup } from "@/queries/feeds";

const standaloneFeedLink = "fusion://standalone";

export function StandaloneArticlesPage() {
  const { feeds } = useFeedLookup();
  const standaloneFeed = useMemo(
    () => feeds.find((f) => f.link === standaloneFeedLink),
    [feeds],
  );
  const standaloneFeedId = standaloneFeed?.id;

  if (standaloneFeedId === undefined) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ArticleList standaloneFeedId={standaloneFeedId} />
    </AppLayout>
  );
}
