import { useMemo } from "react";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  standaloneArticleAPI,
  type StandaloneArticle,
  type Item,
} from "@/lib/api";
import { queryKeys } from "./keys";

export const standaloneArticleQueries = {
  list: () =>
    queryOptions({
      queryKey: queryKeys.standaloneArticles.list(),
      queryFn: async () => {
        const res = await standaloneArticleAPI.list(100, 0);
        return res.data;
      },
      staleTime: Number.POSITIVE_INFINITY,
    }),
};

export function useStandaloneArticles() {
  return useQuery(standaloneArticleQueries.list());
}

export function useStandaloneArticlesItems() {
  const { data: articles = [] } = useStandaloneArticles();

  return useMemo(() => {
    return articles.map(
      (article): Item => ({
        id: article.id,
        feed_id: 0,
        guid: article.link,
        title: article.title,
        link: article.link,
        content: article.content,
        full_content: article.content,
        pub_date: article.pub_date,
        unread: false,
        created_at: article.created_at,
      }),
    );
  }, [articles]);
}

export function useCreateStandaloneArticle() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (link: string) => {
      const res = await standaloneArticleAPI.create({ link });
      return res.data!;
    },
    onSuccess: (article) => {
      qc.setQueryData(
        queryKeys.standaloneArticles.list(),
        (old: StandaloneArticle[] | undefined) => {
          if (!old) return [article];
          const index = old.findIndex((a) => a.id === article.id);
          if (index === -1) {
            return [article, ...old];
          }
          const next = [...old];
          next[index] = article;
          return next;
        },
      );
    },
  });
}

export function useDeleteStandaloneArticle() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await standaloneArticleAPI.delete(id);
      return id;
    },
    onSuccess: (deletedId) => {
      qc.setQueryData(
        queryKeys.standaloneArticles.list(),
        (old: StandaloneArticle[] | undefined) => {
          if (!old) return [];
          return old.filter((a) => a.id !== deletedId);
        },
      );
    },
  });
}
