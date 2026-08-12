/**
 * PageHeading — the h1 for a page, in the display voice.
 *
 * Terracotta rather than ink: the heading is the one place the accent gets to
 * carry a whole block of text. `font-display` supplies Fraunces with its WONK /
 * SOFT / opsz axes and the display leading.
 */
export interface PageHeadingProps {
  title: string;
  subtitle?: string;
}

export function PageHeading({ title, subtitle }: PageHeadingProps) {
  return (
    <div>
      <h1 className="font-display text-3xl font-light text-accent">{title}</h1>
      {subtitle && (
        <p className="mt-3 font-sans text-sm text-ink/60">{subtitle}</p>
      )}
    </div>
  );
}
