import { useState, useRef, useCallback } from "react";

interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  minThreshold?: number;
}

type SwipeState = "idle" | "dragging" | "revealing";

const REVEAL_DISTANCE = 120;

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
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetPosition = useCallback(() => {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
    offsetXRef.current = 0;
    setOffsetX(0);
    setState("idle");
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      resetPosition();
      startXRef.current = e.touches[0].clientX;
      startYRef.current = e.touches[0].clientY;
      draggingRef.current = true;
      setState("dragging");
    },
    [resetPosition],
  );

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
      resetPosition();
      return;
    }
    const width = container.offsetWidth;
    const effectiveThreshold = Math.max(width * threshold, minThreshold);
    const currentOffsetX = offsetXRef.current;

    if (currentOffsetX > effectiveThreshold && onSwipeRight) {
      onSwipeRight();
      const reveal = Math.sign(currentOffsetX) * REVEAL_DISTANCE;
      offsetXRef.current = reveal;
      setOffsetX(reveal);
      setState("revealing");
      revealTimeoutRef.current = setTimeout(() => {
        setOffsetX(0);
        setState("idle");
      }, 350);
    } else if (currentOffsetX < -effectiveThreshold && onSwipeLeft) {
      onSwipeLeft();
      const reveal = Math.sign(currentOffsetX) * REVEAL_DISTANCE;
      offsetXRef.current = reveal;
      setOffsetX(reveal);
      setState("revealing");
      revealTimeoutRef.current = setTimeout(() => {
        setOffsetX(0);
        setState("idle");
      }, 350);
    } else {
      resetPosition();
    }
  }, [threshold, minThreshold, onSwipeLeft, onSwipeRight, resetPosition]);

  const onTouchCancel = useCallback(() => {
    draggingRef.current = false;
    resetPosition();
  }, [resetPosition]);

  return {
    offsetX,
    state,
    containerRef,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
  };
}
