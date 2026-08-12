/**
 * TextBlock — prose styling for arbitrary child content.
 *
 * Everything is a descendant selector rather than a set of styled sub-
 * components, because the usual input here is CMS or MDX output that this
 * package does not control.
 *
 * Two brand details worth keeping: links are dotted-underlined and go solid on
 * hover (the same solid/dotted grammar the borders use), and list markers are
 * an arrow rather than a bullet, drawn on `::before` so the text hangs.
 */
export interface TextBlockProps {
  children: React.ReactNode;
  className?: string;
}

export function TextBlock({ children, className = "" }: TextBlockProps) {
  return (
    <div
      className={`font-sans text-sm leading-relaxed text-ink/70 [&_a]:text-ink/70 [&_a]:underline [&_a]:decoration-dotted [&_a]:underline-offset-(--underline-offset-link) [&_a]:transition-colors [&_a]:duration-fast [&_a]:ease-out hover:[&_a]:text-accent hover:[&_a]:decoration-solid [&_p]:mb-4 last:[&_p]:mb-0 [&_ul]:list-none [&_ul]:pl-0 [&_li]:relative [&_li]:mb-2 [&_li]:pl-5 [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:content-['→'] [&_li]:before:text-subtle ${className}`}
    >
      {children}
    </div>
  );
}
