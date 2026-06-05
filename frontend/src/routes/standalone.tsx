import { createFileRoute, redirect } from "@tanstack/react-router";
import { defaultArticleFilter } from "@/lib/article-filter";

export const Route = createFileRoute("/standalone")({
  beforeLoad: () => {
    throw redirect({
      to: "/standalone/$filter",
      params: { filter: defaultArticleFilter },
      replace: true,
    });
  },
});