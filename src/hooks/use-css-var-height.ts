import { useLayoutEffect, useRef } from "react";

/**
 * Measures the height of the returned ref's element and keeps a CSS custom
 * property on <html> in sync with it (e.g. --header-height, --footer-height).
 * Updates automatically on any resize (mobile menu opening, text wrapping,
 * viewport resize, etc.) via ResizeObserver, so consumers can build layouts
 * like `calc(100dvh - var(--header-height) - var(--footer-height))` that stay
 * correct without hardcoding pixel values.
 */
export function useCssVarHeight<T extends HTMLElement>(varName: string) {
  const ref = useRef<T | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const setVar = () => {
      document.documentElement.style.setProperty(varName, `${el.offsetHeight}px`);
    };

    setVar();

    const observer = new ResizeObserver(setVar);
    observer.observe(el);
    window.addEventListener("resize", setVar);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", setVar);
    };
  }, [varName]);

  return ref;
}