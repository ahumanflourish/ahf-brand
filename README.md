# @ahumanflourish/brand

The shared design system for A Human Flourish — tokens, brand utilities and React
primitives.

Cream and warm black. Fraunces and Instrument Sans. Zero border-radius, double
borders, slow deliberate motion. The point of this package is that
ahumanflourish.com and every app under it feel like the same place without anyone
rebuilding a Button.

---

## Why this exists

It was extracted from four apps that had already built the same thing
independently, not designed up front:

- 6 of 8 UI primitives were **byte-identical** between `ahumanflourish-site` and `job`
- the ten-colour palette was byte-identical across three apps
- `factoring` independently invented the role names `--surface`, `--line`,
  `--subtle`, and the same `cubic-bezier(0.23, 1, 0.32, 1)`
- the Fraunces display setting had been abstracted twice under different names
  and inlined as a `style` prop a dozen more times

Everything here was built at least twice and came out the same. Things built once
were deliberately left in the app that built them.

---

## Install

```bash
npm install @ahumanflourish/brand
```

## Use

**1. Import the styles**, after Tailwind, in your `globals.css`:

```css
@import "tailwindcss";
@import "@ahumanflourish/brand/styles.css";
```

Order matters — Tailwind has to define `@theme` and `@utility` before this file
uses them.

**2. Wire up the fonts** in your root layout. The font variables must land on an
element wrapping the whole tree:

```tsx
import { fraunces, instrumentSans } from "@ahumanflourish/brand/fonts";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${instrumentSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

**3. Use the components:**

```tsx
import { Button, Card, CardTitle, PageShell, SectionLabel } from "@ahumanflourish/brand";

<PageShell width="prose">
  <SectionLabel>Projects</SectionLabel>
  <Card interactive>
    <CardTitle>Focus Extension</CardTitle>
  </Card>
  <Button>Subscribe</Button>
</PageShell>;
```

---

## The one rule

**Never hardcode a design value in a component.** No hex, no `cubic-bezier`, no
`duration-[1200ms]`, no `tracking-[0.12em]`. Every one of those is a token here.
If the token you need doesn't exist, add it to this package first.

That rule is the whole reason the extraction was cheap. Breaking it is how the
next app ends up with 400 hand-edited class strings.

### Roles, not palette

Reach for `bg-surface`, `text-ink`, `border-line`, `text-accent`. Palette names
(`bg-cream`, `text-terracotta`) are correct only when you mean *that specific
colour* — an illustration, a game piece — rather than a UI role. Roles are what
make a re-skin or a dark theme a token swap instead of a migration.

`--color-line` and `--color-subtle` resolve to the same value today. They are
separate on purpose, so a dark theme can move borders and secondary text apart.

### Border style is meaningful

Borders are this system's elevation — there are no shadows and no rounded
corners, so weight and style carry all the hierarchy:

| Style | Means |
|---|---|
| solid | primary, emphasis, active, checked |
| dashed | secondary, pending |
| dotted | subtle, inactive, idle, focus |

Pick the style that matches the state, not the one that looks good.

---

## What's in it

**Tokens** — `tokens/colors.css`, `typography.css`, `motion.css`, `borders.css`,
`spacing.css`, `fonts.css`. Import individually if you want the tokens without
the base layer (epistack does this: it keeps its own product design system and
takes only what applies).

**Utilities** — `font-display` (Fraunces at its display setting), `double-border`
(the inner-offset border motif), `rotate-borders` (solid/dashed/dotted cycling
through siblings — opt-in, from the original Earth.Flow system).

**Base** — body reset, a dotted `:focus-visible` ring, `::selection`,
`prefers-reduced-motion`, print styles, `fade-in`.

**Components** — Button, Badge, Card, Divider, NavLink, PageHeading, PageShell,
Pill, SectionLabel, TextBlock.

---

## Two things that will bite you

**`duration-*` reads from `--transition-duration-*` in Tailwind v4**, not
`--duration-*`. A token named `--duration-slow` compiles to nothing, silently.

**The font tokens must stay `@theme inline`.** `next/font` defines
`--font-fraunces` / `--font-instrument` on `<body>`, not `:root`. A non-inline
`@theme` would emit `--font-sans: var(--font-instrument)` into `:root` where that
variable doesn't exist, the declaration would resolve to the guaranteed-invalid
value, and every `font-sans` utility would silently fall back to the browser
default. Colour tokens are the opposite — non-inline, so themes can override them
at runtime.

---

## Not in here, on purpose

- **Toggle, Checkbox, Radio, Tabs, Accordion, Modal, Table** — these exist as CSS
  in the original Earth.Flow system but have no React consumer yet. Port on
  demand, not speculatively.
- **Carousel, EmailCapture, Footer** — built once, in one app.
- **Epistack's shadows, radii and palette** — a genuinely different product
  system with an opposite elevation model. It consumes tokens from here; it keeps
  its own components.
- **A spacing ramp.** Tailwind's own scale covers layout. `tokens/spacing.css`
  only names the component paddings that had drifted between apps.

## Known gaps

- **No `Input` / `Field` primitive.** One app has 33 hand-rolled inputs, another
  has a `.field` CSS class, a third has one inline. Roughly five builds,
  converged look, never abstracted — this is the biggest missing piece and the
  first thing for v0.2.
- No `Progress` / `DataBar`, though Earth.Flow has a good one.
- `AppHeader` is unbuilt; three apps have a header with the same skeleton and
  incompatible auth guts. It needs to be slot-based.
