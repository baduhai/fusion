import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useElementSize } from "@/hooks/use-element-size";

export interface PaginatedContent {
  outerRef: (node: HTMLDivElement | null) => void;
  innerRef: RefObject<HTMLDivElement | null>;
  page: number;
  pageCount: number;
  measured: boolean;
  next: () => void;
  prev: () => void;
  columnWidth: number;
  gap: number;
  margin: number;
  stride: number;
}

/**
 * Paginates arbitrary content using a CSS multi-column layout. The browser
 * breaks between lines, so a page never clips text at the bottom: each column
 * is one screen-page and pages are reached by translating the inner track.
 */
export function usePaginatedContent(remeasureKey?: unknown): PaginatedContent {
  const [outerRef, size] = useElementSize<HTMLDivElement>();
  const innerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [measured, setMeasured] = useState(false);

  // Match the article body's horizontal padding: px-5 on mobile, sm:px-12.
  const margin = size.width >= 640 ? 48 : 20;
  const columnWidth = Math.max(1, size.width - margin * 2);
  const gap = margin * 2;
  const stride = columnWidth + gap;

  const measure = useCallback(() => {
    const inner = innerRef.current;
    if (!inner || size.width === 0) {
      return;
    }
    // Constrain images to one page so they cannot overflow a column, then
    // measure. scrollWidth spans every column: N * columnWidth + (N - 1) * gap.
    inner.style.setProperty("--eink-page-height", `${inner.clientHeight}px`);
    const count = Math.max(1, Math.round((inner.scrollWidth + gap) / stride));
    setPageCount(count);
    setPage((current) => Math.min(current, count - 1));
    setMeasured(true);
  }, [gap, stride, size.width]);

  useLayoutEffect(() => {
    measure();
  }, [measure, remeasureKey, size.height]);

  // Images change column layout once decoded, so re-measure after they settle.
  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) {
      return;
    }

    const images = Array.from(inner.querySelectorAll("img"));
    if (images.length === 0) {
      return;
    }

    let cancelled = false;
    void Promise.all(
      images.map((image) =>
        image.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), { once: true });
            }),
      ),
    ).then(() => {
      if (!cancelled) {
        measure();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [measure, remeasureKey]);

  const next = useCallback(
    () => setPage((current) => Math.min(current + 1, pageCount - 1)),
    [pageCount],
  );
  const prev = useCallback(
    () => setPage((current) => Math.max(current - 1, 0)),
    [],
  );

  return { outerRef, innerRef, page, pageCount, measured, next, prev, columnWidth, gap, margin, stride };
}
