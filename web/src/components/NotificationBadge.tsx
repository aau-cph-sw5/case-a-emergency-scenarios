import { useEffect, useState } from "react";
import { colors } from "../../../shared/Theme";

export function NotificationBadge({ count }: { count: number }) {
  const [badge, setBadge] = useState({
    count,
    shown: count,
    motion: "in",
    revision: 0,
  });

  if (count !== badge.count) {
    setBadge({
      count,
      shown: count || badge.shown,
      motion:
        count === 0
          ? "out"
          : badge.count === 0
            ? "in"
            : count > badge.count
              ? "wiggle"
              : "",
      revision: badge.revision + 1,
    });
  }

  useEffect(() => {
    if (badge.count !== 0 || badge.shown === 0) return;
    const timer = setTimeout(() => {
      setBadge((current) =>
        current.count === 0 ? { ...current, shown: 0 } : current,
      );
    }, 160);
    return () => clearTimeout(timer);
  }, [badge.count, badge.shown]);

  return badge.shown > 0 ? (
    <span
      key={badge.revision}
      aria-hidden="true"
      className="operator-notification"
      data-motion={badge.motion}
      style={{ background: colors.statusRed, color: colors.textInverse }}
    >
      {badge.shown}
    </span>
  ) : null;
}
