/**
 * Button — three weights of the same border language.
 *
 * The variants differ only in how the outer and inner borders are drawn:
 * primary is solid outside / dashed inside, secondary inverts that, ghost has
 * no border until you hover it. All three go to ink-on-surface inversion on
 * hover, over the slow brand duration.
 *
 * There is deliberately no `focus:outline-none` here. The package ships a
 * dotted `:focus-visible` ring in base.css; suppressing the outline without a
 * replacement is how the original app lost its keyboard affordance.
 */
import { type ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "relative inline-flex items-center font-sans text-xs font-semibold uppercase tracking-control cursor-pointer transition-all duration-slow ease-brand";

  const variants: Record<string, string> = {
    primary: [
      "border-2 border-ink/60 bg-surface text-ink px-5 py-2.5",
      "double-border before:border before:border-dashed before:border-ink/20",
      "hover:bg-ink hover:text-surface hover:border-ink hover:before:border-surface/50",
      "active:border-dotted",
    ].join(" "),
    secondary: [
      "border-2 border-dashed border-ink/60 bg-surface text-ink px-5 py-2.5",
      "double-border before:border before:border-solid before:border-ink/20",
      "hover:bg-ink hover:text-surface hover:border-ink hover:before:border-surface/50",
      "active:border-dotted",
    ].join(" "),
    ghost: [
      "border-2 border-transparent bg-transparent text-ink px-5 py-2.5",
      "double-border before:border before:border-dotted before:border-transparent",
      "hover:border-ink/60 hover:before:border-ink/40",
      "active:border-dotted active:border-ink/60",
    ].join(" "),
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
