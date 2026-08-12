/**
 * @ahumanflourish/brand — the React primitives.
 *
 * Every component and its public prop type is exported here, so a consuming app
 * can wrap or extend one without reaching into `src/components/*`.
 *
 * Note that `NavLink` imports `next/link` and `next/navigation`. Next is an
 * optional peer dependency: importing this barrel in a non-Next app is fine
 * until something actually pulls NavLink in.
 */
export { PageShell } from "./components/page-shell";
export type { PageShellProps, PageShellWidth } from "./components/page-shell";

export { PageHeading } from "./components/page-heading";
export type { PageHeadingProps } from "./components/page-heading";

export { SectionLabel } from "./components/section-label";
export type { SectionLabelProps } from "./components/section-label";

export { Divider } from "./components/divider";
export type { DividerProps } from "./components/divider";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./components/card";
export type {
  CardProps,
  CardDensity,
  CardHeaderProps,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
  CardFooterProps,
} from "./components/card";

export { TextBlock } from "./components/text-block";
export type { TextBlockProps } from "./components/text-block";

export { Badge } from "./components/badge";
export type { BadgeProps } from "./components/badge";

export { Button } from "./components/button";
export type { ButtonProps } from "./components/button";

export { Pill } from "./components/pill";
export type { PillProps } from "./components/pill";

export { NavLink } from "./components/nav-link";
export type { NavLinkProps } from "./components/nav-link";
