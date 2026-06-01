import { useMutation, useQueryClient } from "@tanstack/react-query";
import { standaloneArticleAPI } from "@/lib/api";
import { queryKeys } from "./keys";

export function useCreateStandaloneArticle() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (link: string) => {
      const res = await standaloneArticleAPI.create({ link });
      return res.data!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.items.all });
      qc.invalidateQueries({ queryKey: queryKeys.feeds.all });
    },
  });
}
