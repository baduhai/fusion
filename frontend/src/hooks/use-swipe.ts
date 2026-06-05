import { useState, useRef, useCallback } from "react";

interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  minThreshold?: number;
}

type SwipeState = "idle" | "dragging" | "triggered";

export function useSwipe(config: SwipeConfig) {
  const { onSwipeLeft, onSwipeRight, threshold = 0.4, minThreshold = 80 } =
    config;
  const containerRef = useRef<HTMLDivElement>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [state, setState] = useState<SwipeState>("idle");
  const startXRef = useRef(0);
  const startYRef = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    setState("dragging");
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (state !== "dragging") return;
      const deltaX = e.touches[0].clientX - startXRef.current;
      const deltaY = e.touches[0].clientY - startYRef.current;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        e.preventDefault();
        setOffsetX(deltaX);
      }
    },
    [state],
  );

  const onTouchEnd = useCallback(() => {
    if (state !== "dragging") return;
    const container = containerRef.current;
    if (!container) {
      setOffsetX(0);
      setState("idle");
      return;
    }
    const width = container.offsetWidth;
    const effectiveThreshold = Math.max(width * threshold, minThreshold);

    if (offsetX > effectiveThreshold && onSwipeRight) {
      setOffsetX(width);
      setState("triggered");
      onSwipeRight();
    } else if (offsetX < -effectiveThreshold && onSwipeLeft) {
      setOffsetX(-width);
      setState("triggered");
      onSwipeLeft();
    } else {
      setOffsetX(0);
      setState("idle");
    }
  }, [state, offsetX, threshold, minThreshold, onSwipeLeft, onSwipeRight]);

  return { offsetX, state, containerRef, onTouchStart, onTouchMove, onTouchEnd };
}
