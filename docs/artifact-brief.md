# A Human Flourish — brief for Claude.ai artifacts

**How to hand this to Claude.** Three ways, best first:

1. **Point at it.** This repo is public, so paste this line and let Claude fetch
   the current version — no copy for you to maintain:
   `https://raw.githubusercontent.com/ahumanflourish/ahf-brand/main/docs/artifact-brief.md`
   See `docs/handoff.md` for the exact wording to use.
2. **Attach it to a Claude Project** as a knowledge file, so every artifact in
   that project inherits it without you asking.
3. **Paste the whole file** into a conversation. Works, but it is ~25 KB and you
   will be doing it again next time.

The artifact itself always freezes at creation — it cannot reference this file
at runtime. What options 1 and 2 buy you is that *new* artifacts are always
built from current values.

**Why this file exists separately from the package.** Artifacts have no build
step. `@ahumanflourish/brand` is Tailwind-v4-native — its tokens live in
`@theme` and its motifs in `@utility`, both compiler directives. In an artifact
those produce nothing, silently, so `bg-surface`, `tracking-control`,
`duration-slow`, `font-display` and `double-border` all resolve to no styles at
all. Everything below is plain CSS that needs no compiler.

Artifacts are self-contained and cannot reference this repo at runtime, so this
is a copy by necessity. When the brand changes, this file changes, and new
artifacts pick it up. Already-published artifacts stay as they were.

## 0. Two things about the artifact environment

**Google Fonts is the one external host you may reach.** Everything else must be
inlined — no CDN scripts, no remote images, no fetch. General artifact guidance
says to avoid linking webfonts entirely; for this brand, disregard that for the
one Google Fonts link in step 1 and follow it everywhere else. The typeface is
not optional here.

**This brand is light-only, on purpose.** Artifacts render in the viewer's
theme, and the default advice is to support both. Do not. Paint `body` and every
colour explicitly from the tokens below and skip the dark-mode blocks entirely —
a viewer in dark mode should still get the cream page. The cream world *is* the
brand; a dark variant of it is a different design that does not exist yet.

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

**Verify it mechanically — do not eyeball it.** At weight 300 the `WONK` axis
barely moves the roman letterforms, so "does this look quirky?" is not a test
anyone can fail honestly. And `getComputedStyle(h).fontVariationSettings`
reports what you *asked for*, not what the font supports, so it proves nothing.

Render the same string twice, once with the axes at their extremes and once at
zero. If the widths match, the axes are absent and your font URL is wrong:

```js
const probe = (settings) => {
  const s = document.createElement('span');
  s.style.cssText = `position:absolute;visibility:hidden;font-family:Fraunces;
    font-size:120px;font-weight:300;font-variation-settings:${settings}`;
  s.textContent = 'flourish';
  document.body.appendChild(s);
  const w = s.getBoundingClientRect().width;
  s.remove();
  return w;
};
await document.fonts.ready;
console.log(
  document.fonts.check('300 48px Fraunces'),          // font loaded at all?
  probe("'WONK' 1, 'SOFT' 100") !== probe("'WONK' 0, 'SOFT' 0")  // axes live?
);
```

Both must be `true`.

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
  --text-micro: 8px;   /* smallest legible uppercase label */
  --text-label: 10px;  /* meta labels, badges */
  --text-meta: 11px;   /* dense secondary text */
  --text-control: 12px;/* buttons, section labels, nav */
  --text-body: 16px;
  --leading-display: 1.15;

  /* Heading scale. Fraunces sets tight; these are display sizes, not a
     general ramp.

     These match the built site, where headings are restrained: no heading
     anywhere exceeds 30px. The only type larger than this is a big tabular
     NUMBER (a score, a total) — a number may be 36-48px, a heading may not.
     A 52px title is not this brand; it reads as a landing page from a
     different studio. */
  --text-h1: clamp(24px, 3vw, 30px);
  --text-h2: 20px;
  --text-h3: 18px;

  /* Reserved for a single large figure, never for words. */
  --text-figure: clamp(36px, 5vw, 48px);
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
  font-size: var(--text-control); font-weight: 600;
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
  font-size: var(--text-control); font-weight: 600;
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

/* Inputs — a field is an underline, not a box. Dashed = awaiting input,
   solid accent = active, following the same grammar as every other border. */
.field {
  font-family: 'Instrument Sans', system-ui, sans-serif;
  font-size: var(--text-body); color: var(--ink);
  background: transparent; border: 0; border-radius: var(--radius);
  border-bottom: var(--border-normal) dashed var(--line);
  padding: 6px 2px; width: 100%;
  transition: border-color var(--fast) ease-out;
}
.field:focus { outline: none; border-bottom: var(--border-normal) solid var(--accent); }
.field::placeholder { color: var(--subtle); }
/* A boxed field, when you need one (textareas, search) */
.field-box {
  border: var(--border-thin) solid var(--line); padding: 8px 12px;
  background: var(--surface);
}

/* Selected / checked / toggled — dotted when idle, solid when chosen.
   NOTE the duration: these use --fast, not --slow. See the motion rule below. */
.choice {
  font-family: 'Instrument Sans', system-ui, sans-serif;
  font-size: var(--text-control); font-weight: 600;
  text-transform: uppercase; letter-spacing: var(--tracking-control);
  padding: 6px 12px; cursor: pointer; background: transparent;
  color: color-mix(in oklab, var(--ink) 55%, transparent);
  border: var(--border-thin) dotted var(--line); border-radius: var(--radius);
  transition: border-color var(--fast) ease-out, color var(--fast) ease-out,
              background-color var(--fast) ease-out;
}
.choice[aria-pressed="true"], .choice.is-selected {
  border-style: solid; border-color: var(--ink);
  color: var(--ink); background: color-mix(in oklab, var(--accent) 12%, transparent);
}

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
  needs to feel raised, change its border weight or style, or give it
  `--surface-raised` as a background — that is what that token is for, and it
  is the only sanctioned way to lift a panel off the page.
- **Fills are allowed, sparingly.** "Border only, no fill" is a rule about
  *badges*, not a brand-wide prohibition. A selected control may take a
  low-opacity accent wash (around 12%); the `--positive-soft` and
  `--attention-soft` tokens exist precisely as fills for state. What is banned
  is using a fill where a border style would carry the meaning better.
- **Border style carries meaning:** solid = primary/active/checked,
  dashed = secondary/pending, dotted = subtle/inactive/idle/focus. Pick the
  style that matches the state, not the one that looks good.
- **Two speeds, chosen by who caused the change — not by which property
  changed.** `--slow` (1200ms) is for ambient state: a hover settling, a card
  reacting to the pointer. `--fast` (300ms) is for anything the user is
  directly driving — a selection, a toggle, a checked state, a segmented
  control. They have just clicked and are waiting for confirmation; a 1.2s
  colour change there reads as a broken control, not a considered one.
- **Uppercase text is always tracked** — one of the three steps, never 0.
  Unspaced caps read as shouting.
- **Headings are always `.display`.** Fraunces at `WONK 1, SOFT 100, opsz 72`,
  weight 300. Never bold Fraunces.
- **Headings are coloured, not black.** The page title is `--accent`
  (terracotta). `--ink` is for body text; a warm-black heading is the single
  most common way an otherwise correct page still looks wrong. Deep-green is
  the accepted alternative where terracotta would clash with the content's own
  meaning — the site uses it for the games, and reserves terracotta for the
  tools that tell you something about yourself.
- **Do not put an uppercase eyebrow above the title by default.** The built
  site does not use one: the title sits at the top, centred, close to the nav.
  `.label` is for section headings further down the page. An eyebrow over the
  h1 is a magazine convention, not this brand's.
- **Let it breathe.** The cream background needs room; prefer generous
  whitespace over dense layouts.

**The tone to aim for:** warm, deliberate, handmade. Not slick, not startup-y.
The dotted line whispers; it doesn't shout.

---

## 4. Logotype

The real mark, embedded as a data URI — 8 KB, and it always renders identically
because it carries no font dependency.

**Do not rebuild the logotype from Fraunces.** It looks close and is wrong: the
real mark is a *cross-stitch* construction, its letterforms built from a
stitched dot grid, and it sits heavier and tighter than any weight of the live
font. An earlier SVG version set it as `<text>` in Fraunces 300 and reads as a
visibly different mark.

Always link it to the site.

```html
<a href="https://ahumanflourish.com" style="display:inline-block;line-height:0">
  <img src="data:image/webp;base64,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"
       alt="A Human Flourish" width="180" style="display:block;height:auto">
</a>
```

The image has a cream background baked in rather than transparency, which is
correct on this brand's surfaces and nowhere else. Do not place it on
terracotta, on warm black, or on white.

Sizing: 180px wide suits a page header; the asset is 400px wide so it stays
crisp on retina up to about 200px. Never stretch it beyond 400px.

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
- [ ] The page background is cream `#f5f0e8`, not white — including in dark mode.
- [ ] Clicking a control (a toggle, a rating, a tab) confirms immediately. If a
      selection takes a second to appear, it is using the slow duration and
      should be using the fast one.
- [ ] The logotype is the embedded image, not text set in Fraunces, and it
      links to ahumanflourish.com.
- [ ] Inputs are underlines, not boxes, unless there was a reason.
