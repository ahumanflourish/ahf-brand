/**
 * Badge — a small uppercase label in a 1px box.
 *
 * The `variant` is the border *style*, not a colour, because style is what
 * carries state in this system: solid = primary, dashed = secondary/pending,
 * dotted = subtle/inactive. Pick the one that matches the state.
 */
export interface BadgeProps {
  children: React.ReactNode;
  variant?: "solid" | "dashed" | "dotted";
  className?: string;
}

export function Badge({
  children,
  variant = "solid",
  className = "",
}: BadgeProps) {
  const styles: Record<string, string> = {
    solid: "border-solid",
    dashed: "border-dashed",
    dotted: "border-dotted",
  };

  return (
    <span
      className={`inline-flex items-center border border-line bg-transparent px-2 py-0.5 font-sans text-xs font-semibold uppercase tracking-control text-ink/70 ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
