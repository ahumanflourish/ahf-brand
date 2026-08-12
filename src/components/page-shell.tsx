/**
 * PageShell — the centred page wrapper.
 *
 * New here; there was no shared version to port. Three apps had written some
 * seventeen variations of `mx-auto max-w-… px-… pt-… pb-…` between them, in
 * three padding dialects (`px-4 md:px-6`, `px-3 sm:px-6`, `px-8`) and with
 * max-widths spelled as Tailwind sizes, arbitrary pixel values and an inline
 * `style` with a CSS variable.
 *
 * The three widths that actually recurred are tokens — `--shell-narrow`,
 * `--shell-prose`, `--shell-wide` — so they are named rather than measured:
 *
 *   narrow  forms, settings, single-column reading
 *   prose   article and detail pages (the default, and the commonest case)
 *   wide    dashboards, boards, listings
 *
 * Horizontal padding steps up at `md`, which was the majority dialect. Vertical
 * padding is asymmetric on purpose: a small amount above, since a page usually
 * sits under a nav that already has its own bottom spacing, and a generous
 * amount below so the last block never ends flush with the viewport.
 *
 * `className` composes last, so a page that needs `print:max-w-none` or its own
 * top spacing overrides rather than forks.
 */
export type PageShellWidth = "narrow" | "prose" | "wide";

export interface PageShellProps {
  children: React.ReactNode;
  width?: PageShellWidth;
  className?: string;
}

// `max-w-(--shell-prose)` is Tailwind v4's shorthand for
// `max-width: var(--shell-prose)`. The shell widths live in `:root` rather than
// `@theme` — they are layout constants, not a scale worth generating a utility
// for every step of — so they are referenced rather than named as a size.
const widths: Record<PageShellWidth, string> = {
  narrow: "max-w-(--shell-narrow)",
  prose: "max-w-(--shell-prose)",
  wide: "max-w-(--shell-wide)",
};

export function PageShell({
  children,
  width = "prose",
  className = "",
}: PageShellProps) {
  return (
    <div
      className={`mx-auto w-full ${widths[width]} px-4 pt-6 pb-16 md:px-6 ${className}`}
    >
      {children}
    </div>
  );
}
