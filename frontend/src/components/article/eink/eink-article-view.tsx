import { useEffect, useRef, type ReactNode } from "react";
import { useEinkPaging } from "@/hooks/use-eink-paging";
import { usePaginatedContent } from "@/hooks/use-paginated-content";

interface EinkArticleViewProps {
  children: ReactNode;
  remeasureKey: unknown;
  onPageChange?: (page: number, pageCount: number) => void;
}

const INTERACTIVE_SELECTOR = 'a, button, input, textarea, select, [role="button"]';

export function EinkArticleView({
  children,
  remeasureKey,
  onPageChange,
}: EinkArticleViewProps) {
  const {
    outerRef,
    innerRef,
    page,
    pageCount,
    next,
    prev,
    columnWidth,
    gap,
    margin,
    stride,
  } = usePaginatedContent(remeasureKey);

  useEinkPaging({ next, prev });

  const onPageChangeRef = useRef(onPageChange);
  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);
  useEffect(() => {
    onPageChangeRef.current?.(page, pageCount);
  }, [page, pageCount]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      target.closest(INTERACTIVE_SELECTOR) !== null
    ) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    if (x < rect.width / 3) {
      prev();
    } else if (x > (rect.width * 2) / 3) {
      next();
    }
  };

  return (
    <div
      ref={outerRef}
      onClick={handleClick}
      className="relative min-h-0 flex-1 overflow-hidden pt-4 pb-6"
    >
      <div
        ref={innerRef}
        className="[column-fill:auto]"
        style={{
          width: columnWidth,
          height: "100%",
          columnWidth,
          columnGap: gap,
          transform: `translateX(${margin - page * stride}px)`,
        }}
      >
        {children}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
        <span className="rounded bg-background px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
          {page + 1} / {pageCount}
        </span>
      </div>
    </div>
  );
}
