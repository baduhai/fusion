import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  defaultArticleFilter,
  isArticleFilter,
} from "@/lib/article-filter";

export const Route = createFileRoute("/standalone/$filter")({
  beforeLoad: ({ params }) => {
    if (isArticleFilter(params.filter)) {
      return;
    }

    throw redirect({
      to: "/standalone/$filter",
      params: { filter: defaultArticleFilter },
      replace: true,
    });
  },
});
