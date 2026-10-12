import { useEffect, useRef } from "react";
import { useEinkPagingStore } from "@/store/eink-paging";

interface EinkPagingHandlers {
  next: () => void;
  prev: () => void;
  enabled?: boolean;
}

/**
 * Registers the active surface's page-turn handlers. Handlers are read from a
 * ref so frequent state changes (current page, page count) don't re-register.
 */
export function useEinkPaging({ next, prev, enabled = true }: EinkPagingHandlers) {
  const register = useEinkPagingStore((s) => s.register);
  const handlersRef = useRef({ next, prev });

  useEffect(() => {
    handlersRef.current = { next, prev };
  }, [next, prev]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    return register({
      next: () => handlersRef.current.next(),
      prev: () => handlersRef.current.prev(),
    });
  }, [enabled, register]);
}
