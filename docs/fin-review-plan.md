# Financial review tool — plan of record

Status: design agreed, nothing built. Blocker: the CSV schema.

## The shape

Three deliverables, one shared design.

**1. The artifact (claude.ai).** The dashboard. Calls Claude at runtime to
format whatever the user pastes in, and carries prompts guiding them on what
information is needed. That runtime call is the entire reason this is an
artifact rather than a prompt — see "Where to build it" below, it constrains
authoring.

**2. "Run this with Claude Code" — a block inside the artifact.** Copyable
commands; installs the plugin and runs the same steps locally. Structured as a
*do-nothing script*: visible sequential steps with validation gates between
them, so the user watches their data get checked rather than trusting a black
box. A malformed CSV must halt the run, never render plausible-but-wrong
numbers. Output is a copy of the same dashboard, populated.

**3. Marketplace infrastructure.** `ahf-brand` doubles as a plugin marketplace
so other artifacts and skills install individually, no cloning.

## Decisions made

- **The dashboard computes; Claude formats.** Historical return data is bundled.
  All computation is client-side. Claude's only job is turning an arbitrary
  brokerage export into the expected schema.
- **Two entry points, one file.** `<script id="portfolio-data" type="application/json">null</script>`
  — if populated, use it; if null, show the upload UI. The shared artifact and
  the locally-generated copy are the same HTML.
- **Embed the fonts, don't link them.** Google Fonts is the only thing that
  would make a network request. For financial data, "nothing leaves this page"
  should be literally true and verifiable in the network tab, not nearly true.
  Costs roughly 150–200 KB.
- **Sharing is relative figures only.** "Returned 8.2% against a 7.1% benchmark"
  — percentages, no balances. Randomised/jittered absolute figures were
  considered and rejected: naive noise is often reversible and preserves
  identifying ratios, so it feels anonymised without being so. Real
  anonymisation is its own piece of work, not a nice-to-have.
- **Both privacy postures supported.** Using the skill means the export passes
  through the user's Claude session. Someone who would rather not can hand-build
  the CSV and use the upload path — same tool, no model involved. Document both.
- **The plugin ships the dashboard**, so `/plugin update` keeps it current.

## Where to build it — unresolved, matters

The artifact calls Claude at runtime. Artifacts published from Claude Code
declare capabilities from a fixed roster, and this account's roster is
`downloads` and `mcp` only — no completion capability. So a runtime call to the
model is likely only available to artifacts authored in claude.ai itself.

**Confirm before building.** If it holds, this one artifact is authored in
claude.ai (against `docs/artifact-brief.md`), while the plugin, the local
dashboard and everything else are built in Claude Code. Other artifacts that
don't need a runtime model call can still be built here.

## Next

1. **The schema.** Columns, date format, transactions vs positions vs both. It
   is the dashboard's input contract, the skill's output target, and the thing
   documented for hand-builders. Everything is downstream of it. Reference
   prompts exist but are not authoritative.
2. Then: dashboard template, plugin, marketplace, artifact.

## Still queued from before this thread

- CI guard on the site — grep for raw hexes / `cubic-bezier` / `duration-[` /
  `tracking-[0.`, failing the build. Would have caught the Fatebook drift.
- Fatebook migration onto the design system.
