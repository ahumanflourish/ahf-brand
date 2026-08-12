/**
 * Divider — a horizontal rule in one of the four border voices.
 *
 * `double` is the horizontal cousin of the `double-border` motif: two rules,
 * solid over dashed, separated by the same offset the motif uses inside a box.
 * That gap is `--inset-double` rather than a hardcoded 3px so the two stay in
 * step if the motif is ever retuned.
 */
export interface DividerProps {
  variant?: "dashed" | "dotted" | "solid" | "double";
  className?: string;
}

export function Divider({ variant = "dashed", className = "" }: DividerProps) {
  if (variant === "double") {
    return (
      <div className={`my-8 flex flex-col gap-(--inset-double) ${className}`}>
        <hr className="border-t-2 border-solid border-line" />
        <hr className="border-t-2 border-dashed border-line" />
      </div>
    );
  }

  const styles: Record<string, string> = {
    dashed: "border-dashed",
    dotted: "border-dotted",
    solid: "border-solid",
  };

  return (
    <hr
      className={`my-8 border-t-2 border-line ${styles[variant]} ${className}`}
    />
  );
}
