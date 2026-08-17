/**
 * Card — the double-bordered container, and the sub-parts that go inside it.
 *
 * Merged from two implementations that had drifted apart. What each side
 * contributed:
 *
 *   - the site's tokenised classes and `transition-colors` on CardTitle
 *   - `forwardRef` from the other, so a card can be an anchor / scroll target
 *   - the other's compact density, as an explicit prop rather than a fork
 *
 * The outer border carries the state (line → accent on hover); the inner
 * `::before` rule follows it. The transition on `::before` lives in the
 * `double-border` utility, which is why there are no `before:transition-*`
 * classes here.
 */
import { forwardRef } from "react";

export type CardDensity = "default" | "compact";

export interface CardProps {
  children: React.ReactNode;
  /** Adds the hover treatment and the `group` hook CardTitle listens to. */
  interactive?: boolean;
  /** `compact` is for dense tool UI — tighter padding, lighter inner rule. */
  density?: CardDensity;
  className?: string;
}

/**
 * `p-5` / `p-3.5` are Tailwind's spelling of `--pad-card` (20px) and
 * `--pad-card-compact` (14px); they are kept as scale utilities to match
 * Button, which spells `--pad-control` as `px-5 py-2.5`.
 *
 * The compact inner rule is 1.5px, which has no native border-width utility.
 * It comes straight off the token instead — `border-(length:--border-normal)`
 * compiles to `border-width: var(--border-normal)` — rather than being inlined
 * as an arbitrary 1.5px value the way the source did.
 */
const densities: Record<CardDensity, string> = {
  default: "p-5 before:border-2 before:border-line/30",
  compact: "p-3.5 before:border-(length:--border-normal) before:border-line/20",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { children, interactive = false, density = "default", className = "" },
  ref,
) {
  return (
    <div
      ref={ref}
      // `transition-[border-color]`, not `transition-all`: at 1.2s, `all` also
      // animates layout and transform, so a card that moves or resizes drags
      // for over a second. Border colour is the only thing that changes here.
      className={`relative border-2 border-line bg-surface transition-[border-color] duration-slow ease-brand double-border before:border-dashed ${
        densities[density]
      } ${
        interactive
          ? "group cursor-pointer hover:border-accent hover:before:border-accent/30"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
});

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = "" }: CardHeaderProps) {
  return <div className={`mb-3 ${className}`}>{children}</div>;
}

export interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className = "" }: CardTitleProps) {
  return (
    // `transition-colors` rather than `transition-all` for the same reason as
    // the container — this only ever changes colour on group hover.
    <h3
      className={`font-display text-lg font-light text-ink transition-colors duration-slow ease-brand group-hover:text-accent ${className}`}
    >
      {children}
    </h3>
  );
}

export interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function CardDescription({
  children,
  className = "",
}: CardDescriptionProps) {
  return (
    <p className={`mt-1 font-sans text-sm text-ink/60 ${className}`}>
      {children}
    </p>
  );
}

export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = "" }: CardContentProps) {
  return <div className={`mt-4 ${className}`}>{children}</div>;
}

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div
      className={`mt-4 border-t-2 border-dashed border-line/30 pt-4 ${className}`}
    >
      {children}
    </div>
  );
}
