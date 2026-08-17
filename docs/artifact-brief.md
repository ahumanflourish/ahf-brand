# A Human Flourish — brief for Claude.ai artifacts

Paste this whole file into a Claude Project's custom instructions, or into a
conversation before asking for an artifact.

**Why this file exists separately from the package.** Artifacts have no build
step. `@ahumanflourish/brand` is Tailwind-v4-native — its tokens live in
`@theme` and its motifs in `@utility`, both compiler directives. In an artifact
those produce nothing, silently, so `bg-surface`, `tracking-control`,
`duration-slow`, `font-display` and `double-border` all resolve to no styles at
all. Everything below is plain CSS that needs no compiler.

Artifacts are self-contained and cannot reference this repo at runtime, so this
is a copy by necessity. When the brand changes, this file changes, and new
artifacts pick it up. Already-published artifacts stay as they were.

---

## 1. Load the fonts — the exact URL matters

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,100..900,0..100,0..1&family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet">
```

**Do not shorten this.** Google Fonts only ships the axes you name. Request
`family=Fraunces:opsz,wght@9..144,300` — a URL that appears in older brand docs
— and you get a font with **only the `opsz` axis**, no `SOFT` and no `WONK`.
Every `font-variation-settings` declaration below then does nothing, and you get
plain Fraunces instead of the soft, wonky cut the brand is built on. It looks
almost right, which is the worst failure mode. This has already caused one
artifact to come out subtly off-brand.

Verify: headings should look slightly quirky and rounded, not like a standard
old-style serif.

---

## 2. Paste this CSS

```css
:root {
  /* Palette — the raw brand colours */
  --cream: #f5f0e8;  --warm-black: #1a1715;  --terracotta: #c17c5a;
  --sage: #7a8b6f;   --dusty-blue: #6b8a9e;  --gold: #c4a86b;
  --stone: #948a7c;  --deep-green: #4a5e3f;  --moss: #8a9e6b;
  --bark: #6b5a4a;

  /* Roles — reach for these, not the palette. Palette names are only correct
     when you mean that specific colour (an illustration), not a UI role. */
  --surface: var(--cream);          /* page and panel backgrounds */
  --surface-raised: #fbf8f3;        /* panels lifted off the page */
  --ink: var(--warm-black);         /* primary text */
  --accent: var(--terracotta);      /* links, active state, emphasis */
  --line: var(--stone);             /* borders and rules */
  --line-soft: #ddd4c6;             /* quieter rules in dense UI */
  --subtle: var(--stone);           /* secondary text */
  --muted: var(--bark);             /* tertiary text */
  --marker: var(--sage);            /* section labels */

  /* State */
  --positive: var(--sage);          --positive-soft: #e8ede4;
  --attention: var(--terracotta);   --attention-soft: #f6e7de;
  --inactive: var(--stone);

  /* Motion — one curve, two speeds */
  --ease: cubic-bezier(0.23, 1, 0.32, 1);
  --slow: 1200ms;   /* colour and border changes — deliberate, not snappy */
  --fast: 300ms;    /* hover and focus feedback */

  /* Uppercase letter-spacing — three steps, and only three */
  --tracking-label: 0.18em;    /* section labels */
  --tracking-control: 0.12em;  /* buttons, badges, nav */
  --tracking-micro: 0.15em;    /* 9–11px meta labels */

  /* Borders — this brand's entire elevation system */
  --border-thin: 1px; --border-normal: 1.5px; --border-thick: 2px;
  --inset-double: 3px;   /* offset of the inner border in the double motif */
  --radius: 0;           /* a brand rule, not a default */

  /* Type sizes with no common equivalent */
  --text-micro: 8px; --text-label: 10px; --text-meta: 11px; --text-body: 16px;
  --leading-display: 1.15;
}

body {
  background: var(--surface);
  color: var(--ink);
  font-family: 'Instrument Sans', system-ui, sans-serif;
  font-size: var(--text-body);
  line-height: 1.6;
}

/* The heading voice. Every heading uses this. */
.display {
  font-family: 'Fraunces', Georgia, serif;
  font-variation-settings: 'WONK' 1, 'SOFT' 100, 'opsz' 72;
  font-weight: 300;
  line-height: var(--leading-display);
}

/* Section label — small, uppercase, sage, widely tracked */
.label {
  font-family: 'Instrument Sans', system-ui, sans-serif;
  font-size: 12px; font-weight: 600;
  text-transform: uppercase; letter-spacing: var(--tracking-label);
  color: var(--marker);
}

/* The double-border motif: outer border on the box, inner offset border on
   ::before. This is the single most recognisable structural device. */
.double-border { position: relative; }
.double-border::before {
  content: ""; position: absolute; inset: var(--inset-double);
  pointer-events: none;
  border: var(--border-thin) dashed color-mix(in oklab, var(--line) 30%, transparent);
  transition: border-color var(--slow) var(--ease);
}

.card {
  position: relative;
  border: var(--border-thick) solid var(--line);
  background: var(--surface);
  border-radius: var(--radius);
  padding: 20px;
  transition: border-color var(--slow) var(--ease);
}
.card::before {
  content: ""; position: absolute; inset: var(--inset-double);
  pointer-events: none;
  border: var(--border-thick) dashed color-mix(in oklab, var(--line) 30%, transparent);
  transition: border-color var(--slow) var(--ease);
}
.card:hover { border-color: var(--accent); }
.card:hover::before { border-color: color-mix(in oklab, var(--accent) 30%, transparent); }

/* Button — hover inverts: background fills with the border colour, text
   swaps to the background colour. */
.btn {
  position: relative; display: inline-flex; align-items: center;
  font-family: 'Instrument Sans', system-ui, sans-serif;
  font-size: 12px; font-weight: 600;
  text-transform: uppercase; letter-spacing: var(--tracking-control);
  padding: 10px 20px; cursor: pointer;
  border: var(--border-thick) solid color-mix(in oklab, var(--ink) 60%, transparent);
  border-radius: var(--radius);
  background: var(--surface); color: var(--ink);
  transition: background-color var(--slow) var(--ease),
              color var(--slow) var(--ease),
              border-color var(--slow) var(--ease);
}
.btn::before {
  content: ""; position: absolute; inset: var(--inset-double);
  pointer-events: none;
  border: var(--border-thin) dashed color-mix(in oklab, var(--ink) 20%, transparent);
  transition: border-color var(--slow) var(--ease);
}
.btn:hover { background: var(--ink); color: var(--surface); border-color: var(--ink); }
.btn:hover::before { border-color: color-mix(in oklab, var(--surface) 50%, transparent); }
.btn:active { border-style: dotted; }

/* Badge — border only, no fill. Border style carries the meaning. */
.badge {
  display: inline-flex; align-items: center;
  font-family: 'Instrument Sans', system-ui, sans-serif;
  font-size: var(--text-label); font-weight: 600;
  text-transform: uppercase; letter-spacing: var(--tracking-control);
  padding: 2px 8px; background: transparent;
  color: color-mix(in oklab, var(--ink) 70%, transparent);
  border: var(--border-thin) solid var(--line); border-radius: var(--radius);
}
.badge.pending { border-style: dashed; }
.badge.info    { border-style: dotted; }

/* Dividers */
.divider        { border: 0; border-top: var(--border-thick) dashed var(--line); margin: 32px 0; }
.divider.solid  { border-top-style: solid; }
.divider.dotted { border-top-style: dotted; }
/* The double rule: solid over dashed, 3px apart.
   `width: 100%; margin: 0` is required — a bare <hr> has `margin-inline: auto`,
   which inside a column flex container collapses it to zero width and renders
   nothing at all. */
.divider-double { display: flex; flex-direction: column; gap: var(--inset-double); margin: 32px 0; }
.divider-double hr { width: 100%; margin: 0; border: 0; }
.divider-double hr:first-child { border-top: var(--border-thick) solid var(--line); }
.divider-double hr:last-child  { border-top: var(--border-thick) dashed var(--line); }

/* Links — dotted underline, solid on hover */
a {
  color: inherit; text-decoration: underline;
  text-decoration-style: dotted; text-underline-offset: 3px;
  transition: color var(--fast) ease-out;
}
a:hover { color: var(--accent); text-decoration-style: solid; }

/* Lists use an arrow marker, not a bullet */
ul.brand { list-style: none; padding-left: 0; }
ul.brand li { position: relative; padding-left: 20px; margin-bottom: 8px; }
ul.brand li::before { content: "→"; position: absolute; left: 0; color: var(--subtle); }

/* Focus is dotted, matching the border grammar where dotted = idle */
:where(a, button, input, textarea, select, summary, [tabindex]):focus-visible {
  outline: var(--border-thick) dotted var(--accent);
  outline-offset: 2px;
}

::selection { background: var(--accent); color: var(--surface); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    transition-duration: .01ms !important;
  }
}
```

---

## 3. The rules that make it look right

These matter more than the colour values. Getting the palette right but these
wrong is exactly what "close but not quite" looks like.

- **Zero border-radius. Everywhere.** No rounded corners on anything —
  buttons, cards, inputs, images, containers. This is the single most common
  way an artifact drifts off-brand.
- **No box-shadows.** Borders are the entire elevation system. If something
  needs to feel raised, change its border weight or style, or use
  `--surface-raised`.
- **Border style carries meaning:** solid = primary/active/checked,
  dashed = secondary/pending, dotted = subtle/inactive/idle/focus. Pick the
  style that matches the state, not the one that looks good.
- **Transitions are slow.** 1200ms on colour and border changes. It should feel
  deliberate, not responsive. Use the 300ms speed only for hover and focus.
- **Uppercase text is always tracked** — one of the three steps, never 0.
  Unspaced caps read as shouting.
- **Headings are always `.display`.** Fraunces at `WONK 1, SOFT 100, opsz 72`,
  weight 300. Never bold Fraunces.
- **Let it breathe.** The cream background needs room; prefer generous
  whitespace over dense layouts.

**The tone to aim for:** warm, deliberate, handmade. Not slick, not startup-y.
The dotted line whispers; it doesn't shout.

---

## 4. Logotype

710 bytes, inlines directly. It relies on the fonts loaded in step 1.

```html
<svg viewBox="0 0 300 100" width="300" height="100" xmlns="http://www.w3.org/2000/svg">
  <text x="150" y="38" text-anchor="middle"
    font-family="'Instrument Sans', sans-serif" font-weight="600"
    font-size="14" letter-spacing="3.5" fill="#7a8b6f">A HUMAN</text>
  <text x="150" y="78" text-anchor="middle"
    font-family="'Fraunces', serif" font-weight="300"
    font-size="52" fill="#c17c5a"
    style="font-variation-settings: 'WONK' 1, 'SOFT' 100, 'opsz' 72;">flourish</text>
</svg>
```

---

## 5. Check before you call it done

- [ ] Headings look quirky and soft, not like standard Georgia or Times. If
      they don't, the font URL lost its `SOFT`/`WONK` axes.
- [ ] Nothing has rounded corners.
- [ ] Nothing has a drop shadow.
- [ ] Hovering a card or button takes about a second to change — noticeably
      slow, on purpose.
- [ ] Every uppercase run is letter-spaced.
- [ ] Cards show two borders: a solid outer and a dashed inner, 3px in.
- [ ] The page background is cream `#f5f0e8`, not white.
