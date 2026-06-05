export const articleFilters = ["all", "unread", "starred", "inbox"] as const;

export type ArticleFilter = (typeof articleFilters)[number];

export const defaultArticleFilter: ArticleFilter = "inbox";

export function isArticleFilter(value: string): value is ArticleFilter {
  return articleFilters.includes(value as ArticleFilter);
}
