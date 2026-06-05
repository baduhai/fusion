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
  const draggingRef = useRef(false);
  const offsetXRef = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    draggingRef.current = true;
    setState("dragging");
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!draggingRef.current) return;
    const deltaX = e.touches[0].clientX - startXRef.current;
    const deltaY = e.touches[0].clientY - startYRef.current;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault();
      offsetXRef.current = deltaX;
      setOffsetX(deltaX);
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const container = containerRef.current;
    if (!container) {
      setOffsetX(0);
      setState("idle");
      return;
    }
    const width = container.offsetWidth;
    const effectiveThreshold = Math.max(width * threshold, minThreshold);
    const currentOffsetX = offsetXRef.current;

    if (currentOffsetX > effectiveThreshold && onSwipeRight) {
      setOffsetX(width);
      setState("triggered");
      onSwipeRight();
    } else if (currentOffsetX < -effectiveThreshold && onSwipeLeft) {
      setOffsetX(-width);
      setState("triggered");
      onSwipeLeft();
    } else {
      setOffsetX(0);
      setState("idle");
    }
  }, [threshold, minThreshold, onSwipeLeft, onSwipeRight]);

  return { offsetX, state, containerRef, onTouchStart, onTouchMove, onTouchEnd };
}
