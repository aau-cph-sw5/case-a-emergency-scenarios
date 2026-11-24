import { useLayoutEffect, type RefObject } from "react";

// Sizes a textarea to its text. The CSS max-height caps it; past the cap the
// textarea scrolls (overflow-y: auto). Works in every browser, unlike
// `field-sizing: content`.
export function useAutoGrow(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const borders = el.offsetHeight - el.clientHeight;
    el.style.height = `${el.scrollHeight + borders}px`;
  }, [ref, value]);
}
