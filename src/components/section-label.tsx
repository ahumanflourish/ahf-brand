/**
 * SectionLabel — the small sage all-caps label that opens a section.
 *
 * Uses `tracking-label`, the widest of the three uppercase steps: this is the
 * one piece of text in the system that is meant to read as a marker rather than
 * as a word. `border` adds the dashed underline used when the label sits
 * directly on top of the content it names.
 */
export interface SectionLabelProps {
  children: React.ReactNode;
  border?: boolean;
  className?: string;
}

export function SectionLabel({
  children,
  border = false,
  className = "",
}: SectionLabelProps) {
  return (
    <span
      className={`font-sans text-xs font-semibold uppercase tracking-label text-marker ${
        border ? "border-b-2 border-dashed border-line pb-2" : ""
      } ${className}`}
    >
      {children}
    </span>
  );
}
