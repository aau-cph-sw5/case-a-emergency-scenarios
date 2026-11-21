import type { ReactNode } from "react";

// Small stroke icons for the scenario suggestion box. Attributes that differ
// between the icons (class, aria-hidden, stroke width and join) are props, so
// each one renders the same svg as before.
type IconProps = {
  children: ReactNode;
  size?: number;
  viewBox?: string;
  strokeWidth?: number;
  className?: string;
  hidden?: boolean;
  roundJoin?: boolean;
};

export function Icon({
  children,
  size = 16,
  viewBox = "0 0 20 20",
  strokeWidth = 2,
  className,
  hidden,
  roundJoin,
}: IconProps) {
  return (
    <svg
      className={className}
      aria-hidden={hidden ? "true" : undefined}
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin={roundJoin ? "round" : undefined}
    >
      {children}
    </svg>
  );
}

// Warning triangle, also used as the error icon.
export function TriangleIcon() {
  return (
    <Icon className="suggest-icon" hidden roundJoin>
      <path d="M10 2.5 18.5 17h-17z" />
      <path d="M10 8v4M10 14.5h.01" />
    </Icon>
  );
}

export function InfoIcon() {
  return (
    <Icon className="suggest-icon" hidden roundJoin>
      <circle cx="10" cy="10" r="8" />
      <path d="M10 6v5M10 14h.01" />
    </Icon>
  );
}

// The caller wraps it in an aria-hidden element.
export function ClearIcon() {
  return (
    <Icon size={10} viewBox="0 0 12 12">
      <path d="M2 2l8 8M10 2l-8 8" />
    </Icon>
  );
}

export function CheckIcon() {
  return (
    <Icon
      className="suggest-chip-check"
      size={10}
      viewBox="0 0 12 12"
      strokeWidth={2.4}
      hidden
      roundJoin
    >
      <path d="M2.5 6.2l2.3 2.3 4.7-5" />
    </Icon>
  );
}
