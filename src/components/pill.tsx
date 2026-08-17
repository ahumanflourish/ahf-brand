/**
 * Pill — a small uppercase chip. One look, no themes. Used for keyword chips,
 * filter toggles, tag lists, and anywhere else a short uppercase label belongs.
 *
 * Selected = solid positive with surface text. Unselected = a subtle inactive
 * tint with normal text. Display-only (no `selected`, no `onClick`) renders as
 * unselected.
 *
 * It renders a <button> when given an `onClick` and a <span> otherwise, so a
 * non-interactive chip does not land in the tab order. No hooks and no browser
 * APIs, so no `"use client"` — the consumer passing the handler is already a
 * client component.
 *
 * Promoted from the app that had 31 uses of it, with the dead `variant` prop
 * removed: it was declared in
 * the props interface and passed at two call sites, but never destructured or
 * read. The retokening also moved it off palette names (sage / cream / stone /
 * warm-black) onto the state and role tokens.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface PillProps {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  title?: string;
  className?: string;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
}

// `px-3 py-1` is `--pad-control-compact` (4/12px) in Tailwind's scale — the
// padding this token was named for. `text-label` is the 10px step and
// `tracking-micro` the letter-spacing that goes with it; the source's 0.08em
// was below every step on the scale.
const BASE =
  "inline-flex items-center font-sans px-3 py-1 text-label font-semibold uppercase tracking-micro transition-colors duration-fast ease-out";

const SELECTED = "bg-positive text-surface hover:bg-positive/90";
const UNSELECTED = "bg-inactive/15 text-ink hover:bg-inactive/25";

export function Pill({
  children,
  selected,
  onClick,
  title,
  className = "",
  type = "button",
}: PillProps) {
  const interactive = !!onClick;
  const stateClasses = selected === true ? SELECTED : UNSELECTED;
  const classes = interactive
    ? `${BASE} ${stateClasses} cursor-pointer ${className}`
    : `${BASE} ${stateClasses} ${className}`;

  // data-pill marker is an attribute hook for feature stylesheets that need
  // to re-skin pills inside a specific context (e.g., discovery's tier-colored
  // bricks). The display/toggle distinction lets such overrides target the
  // right variant without affecting the other.
  const dataMode = interactive ? "toggle" : "display";
  if (interactive) {
    return (
      <button
        type={type}
        onClick={onClick}
        title={title}
        className={classes}
        data-pill={dataMode}
      >
        {children}
      </button>
    );
  }
  return (
    <span title={title} className={classes} data-pill={dataMode}>
      {children}
    </span>
  );
}
