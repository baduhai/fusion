import { useState, useRef, useCallback } from "react";

interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  minThreshold?: number;
}

type SwipeState = "idle" | "dragging" | "revealing";
type SwipeAxis = "none" | "x" | "y";

const REVEAL_DISTANCE = 120;
// Movement needed before the gesture is committed to an axis.
const AXIS_LOCK_DISTANCE = 8;
// A quick flick triggers the action even below the distance threshold.
const FLICK_VELOCITY = 0.4; // px/ms
// Only treat the measured velocity as a flick while the finger is still moving.
const FLICK_MAX_AGE = 120; // ms

export function useSwipe(config: SwipeConfig) {
  const { onSwipeLeft, onSwipeRight, threshold = 0.25, minThreshold = 56 } =
    config;
  const containerRef = useRef<HTMLDivElement>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [state, setState] = useState<SwipeState>("idle");
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const draggingRef = useRef(false);
  const axisRef = useRef<SwipeAxis>("none");
  const offsetXRef = useRef(0);
  const lastMoveXRef = useRef(0);
  const lastMoveTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetPosition = useCallback(() => {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
    axisRef.current = "none";
    velocityRef.current = 0;
    offsetXRef.current = 0;
    setOffsetX(0);
    setState("idle");
  }, []);

  const revealAction = useCallback((direction: number) => {
    const reveal = direction * REVEAL_DISTANCE;
    offsetXRef.current = reveal;
    setOffsetX(reveal);
    setState("revealing");
    revealTimeoutRef.current = setTimeout(() => {
      setOffsetX(0);
      setState("idle");
    }, 350);
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      resetPosition();
      const touch = e.touches[0];
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      lastMoveXRef.current = touch.clientX;
      lastMoveTimeRef.current = performance.now();
      draggingRef.current = true;
      setState("dragging");
    },
    [resetPosition],
  );

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!draggingRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - startXRef.current;
    const deltaY = touch.clientY - startYRef.current;

    if (axisRef.current === "none") {
      if (Math.hypot(deltaX, deltaY) < AXIS_LOCK_DISTANCE) return;
      axisRef.current = Math.abs(deltaX) > Math.abs(deltaY) ? "x" : "y";
      lastMoveXRef.current = touch.clientX;
      lastMoveTimeRef.current = performance.now();
      if (axisRef.current !== "x") return;
    } else if (axisRef.current !== "x") {
      return;
    }

    const now = performance.now();
    const dt = now - lastMoveTimeRef.current;
    if (dt > 0) {
      velocityRef.current = (touch.clientX - lastMoveXRef.current) / dt;
    }
    lastMoveXRef.current = touch.clientX;
    lastMoveTimeRef.current = now;

    offsetXRef.current = deltaX;
    setOffsetX(deltaX);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    const currentOffsetX = offsetXRef.current;
    const width = containerRef.current?.offsetWidth ?? 0;
    const effectiveThreshold = Math.max(width * threshold, minThreshold);

    const isRecentMove =
      performance.now() - lastMoveTimeRef.current < FLICK_MAX_AGE;
    const velocity = isRecentMove ? velocityRef.current : 0;
    const flicked = Math.abs(velocity) >= FLICK_VELOCITY;

    if (
      currentOffsetX > 0 &&
      onSwipeRight &&
      (currentOffsetX >= effectiveThreshold || (flicked && velocity > 0))
    ) {
      onSwipeRight();
      revealAction(1);
    } else if (
      currentOffsetX < 0 &&
      onSwipeLeft &&
      (-currentOffsetX >= effectiveThreshold || (flicked && velocity < 0))
    ) {
      onSwipeLeft();
      revealAction(-1);
    } else {
      resetPosition();
    }
  }, [threshold, minThreshold, onSwipeLeft, onSwipeRight, resetPosition, revealAction]);

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
