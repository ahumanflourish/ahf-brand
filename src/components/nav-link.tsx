"use client";

/**
 * NavLink — a nav item that knows whether it is the current page.
 *
 * The only component here that needs the client boundary (`usePathname`) and
 * the only one that imports from `next`. Next is an *optional* peer dependency
 * of this package: a non-Next consumer can take every other component and will
 * only fail to resolve if it imports this one.
 *
 * Active is terracotta and stays terracotta — no underline, no weight change.
 * Inactive text sits at 60% ink and comes up to full ink on hover, at the fast
 * duration rather than the slow one, because nav feedback should not lag the
 * pointer.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function NavLink({ href, children, className = "" }: NavLinkProps) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`font-sans text-sm font-medium transition-colors duration-fast ease-out ${
        active ? "text-accent" : "text-ink/60 hover:text-ink"
      } ${className}`}
    >
      {children}
    </Link>
  );
}
