import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({
      to: "/$filter",
      params: { filter: "inbox" },
      replace: true,
    });
  },
});
