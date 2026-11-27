import { useEffect, useState } from "react";
import { notificationTestShortcuts } from "./local-settings";

type TestCounts = { status?: number; messages?: number } | undefined;
type ShortcutAction = "clearMessages" | "add" | "reset";

const KEY_ACTIONS: Record<string, ShortcutAction> = { n: "add", m: "reset" };

// Only a bare Ctrl chord (optionally with Alt) is a shortcut.
function isCtrlChord(event: KeyboardEvent) {
  return event.ctrlKey && !event.shiftKey && !event.metaKey;
}

// Maps a keydown to a test-notification shortcut: Ctrl+N adds one, Ctrl+M
// resets, Ctrl+Alt+, clears the Beskeder count. Repeats are ignored.
function shortcutAction(event: KeyboardEvent): ShortcutAction | null {
  if (!isCtrlChord(event)) return null;
  const key = event.key.toLowerCase();
  if (key === ",")
    return event.altKey && !event.repeat ? "clearMessages" : null;
  const action = KEY_ACTIONS[key];
  if (!action) return null;
  event.preventDefault();
  return event.repeat ? null : action;
}

function applyShortcut(counts: TestCounts, action: ShortcutAction): TestCounts {
  if (action === "clearMessages")
    return counts && { ...counts, messages: undefined };
  if (action === "reset") return { status: 0, messages: 0 };
  return {
    status: (counts?.status ?? 0) + 1,
    messages: (counts?.messages ?? 0) + 1,
  };
}

// Test counts for the Status and Beskeder badges, driven by keyboard shortcuts
// while notificationTestShortcuts is on. clearStatus is called on opening Status.
export function useTestNotifications() {
  const [counts, setCounts] = useState<TestCounts>();
  useEffect(() => {
    if (!notificationTestShortcuts) return;
    function handle(event: KeyboardEvent) {
      const action = shortcutAction(event);
      if (action) setCounts((current) => applyShortcut(current, action));
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);
  const clearStatus = () =>
    setCounts((current) => current && { ...current, status: 0 });
  return { counts, clearStatus };
}
