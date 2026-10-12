import { useLayoutEffect, useState } from "react";

export interface ElementSize {
  width: number;
  height: number;
}

/**
 * Tracks an element's size with a ResizeObserver. Returns a callback ref, so
 * the observer follows the element across mount/unmount (for example when a
 * conditionally rendered container appears) instead of latching onto whatever
 * element happened to be present on the first render.
 */
export function useElementSize<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null);
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!element) {
      return;
    }

    const update = () => {
      setSize({ width: element.clientWidth, height: element.clientHeight });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return [setElement, size] as const;
}
