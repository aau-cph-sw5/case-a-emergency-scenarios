import { useState } from "react";

// Open state that the dashboard may own (so Status and Beskeder never show at
// once). Without a controlled value it keeps its own state.
export function useControllableOpen(
  initial: boolean,
  controlled?: boolean,
  onChange?: (open: boolean) => void,
) {
  const [own, setOwn] = useState(initial);
  const setOpen = (next: boolean) => {
    setOwn(next);
    onChange?.(next);
  };
  return [controlled ?? own, setOpen] as const;
}
