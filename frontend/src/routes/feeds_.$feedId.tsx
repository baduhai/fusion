import { createFileRoute, redirect } from "@tanstack/react-router";
import { parsePositiveIntegerParam } from "@/lib/route-params";

export const Route = createFileRoute("/feeds_/$feedId")({
  beforeLoad: ({ params, location }) => {
    const feedId = parsePositiveIntegerParam(params.feedId);
    if (feedId === null) {
      throw redirect({
        to: "/$filter",
        params: { filter: "all" },
        replace: true,
      });
    }

    const currentPath = location.pathname.replace(/\/+$/, "") || "/";
    if (currentPath !== `/feeds/${params.feedId}`) {
      return;
    }

    throw redirect({
      to: "/feeds/$feedId/$filter",
      params: {
        feedId: String(feedId),
        filter: "all",
      },
      replace: true,
    });
  },
});
