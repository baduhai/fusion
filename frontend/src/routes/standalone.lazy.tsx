import { createLazyFileRoute } from "@tanstack/react-router";
import { StandaloneArticlesPage } from "@/components/article/standalone-articles-page";

export const Route = createLazyFileRoute("/standalone")({
  component: StandaloneArticlesPage,
});