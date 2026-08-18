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

## The runtime API — confirmed

The artifact does **not** use a bespoke `window.claude.complete`. It calls the
real Messages API directly:

    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },   // no x-api-key
      body: JSON.stringify({ model, max_tokens, messages })
    })

No API key and no `anthropic-version` header — the claude.ai proxy injects both,
and bills the viewer. Verified working multi-turn in August 2026. Consequences:

- **The local dev harness is trivial.** The artifact source stays byte-identical;
  a dev-only shim intercepts `fetch` for that URL and either returns canned
  responses or forwards to the real API with an `x-api-key` header added. Nothing
  to strip on the way to claude.ai.
- **The request shape is the documented one**, so the standard docs apply —
  system prompts, tool use, structured outputs, streaming.
- **It is portable.** If this ever needs to run outside claude.ai, the only
  changes are adding the key and the `anthropic-version: 2023-06-01` header.

Model note: the test artifact uses `claude-sonnet-4-6`, which is the previous
generation. `claude-sonnet-5` and `claude-opus-5` are current. Worth testing
whether the proxy accepts them — the reformatting step is exactly the kind of
structured-extraction work where the newer models are stronger, and structured
outputs (`output_config.format`) would let the CSV schema be enforced by the API
rather than by parsing whatever comes back.

## Where to build it — resolved enough to proceed

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

---

# STATE OF PLAY — written 2026-08-18, before a context compaction

Read this section first when resuming. Everything above is design; this is where
things actually stand.

## Where the material lives

| What | Path |
|---|---|
| Full spec handoff (unzipped) | `/root/ahf/handoff/` — `SPEC.md`, `INTERACTION.md`, `VISUALS.md`, `extraction-prompt.md`, `README.md` |
| The engine (do not rewrite the maths) | `/root/ahf/handoff/src/engine.ts` |
| Benchmark / strategy / fixture data | `/root/ahf/handoff/data/{benchmarks,strategies,fixtures}.json` |
| Original zip | `/root/ahf/portfolio-tool-handoff.zip` |
| Core package being built | `/root/portfolio-core` (standalone, git init'd, not pushed) |
| Brand system | `/root/ahf-brand` (public: github.com/ahumanflourish/ahf-brand) |
| Site repo | `/mnt/c/Users/alexa/Documents/ahf/ahumanflourish-site` |

## Two agents were in flight at compaction time

**1. CI guard + Fatebook token migration** — in the site repo, branch
`token-guard-and-fatebook` off `main`, two sequential commits, NOT pushed.
Task 1 adds a GitHub Actions workflow failing the build on hardcoded design
values (raw hex, `cubic-bezier(`, `duration-[`, `tracking-[0.`,
`fontVariationSettings`, `inset-[3px]`). Task 2 migrates Fatebook onto the token
system with a **0-pixel-diff** requirement on `/tools/fatebook`. On resume:
check the branch exists, read the commits, verify the pixel diff claim.

**2. Engine port + fixture test** — building `/root/portfolio-core`. The gate is
that `analyse()` on the fixture reproduces `endingValue 53690.25`,
`yourXirr 0.100544`, `GLOBAL_EQUITY 60328.40`, `pctKept 0.6812`, plus everything
else in the fixture's `expected` block. It was told to diagnose rather than
massage a failure. **Nothing else in the tool starts until this is green.**

If either agent's report was lost to the compaction, re-derive from the repo
state rather than re-running the work.

## Decisions made in this session

- **Extend the monthly benchmark series back 30 years**, to match the annual
  coverage (annual is 1996–2026; monthly is currently only 2021-10 → 2026-07).
  This is `SPEC.md` open decision #1, resolved as option (a). The spec estimates
  roughly a day of careful sourcing per decade, so budget ~3 days. Until it is
  done the tool is gated to histories starting after Oct 2021 — under five years,
  which is the "small sample" the spec's own disclaimer warns about. Do not
  silently interpolate; option (b) requires a visible label wherever it is in play.
  Sourcing discipline is non-negotiable: **total return, not price-only** — the
  difference is 1.5–4pp/yr and invisible downstream. Cross-check every new month
  against a second source, preferring issuer filings over aggregators.
- **The core is a standalone package**, `@ahumanflourish/portfolio-core`, not code
  inside the site repo — because three targets consume it (Next.js route,
  single-file offline HTML, Claude.ai artifact). Same reasoning as the brand package.
- **Build the web page first**, per `INTERACTION.md` build order. The artifact is
  the shop window; the web page and offline build are the paths that work for
  everyone with no account.

## Spec corrections — the spec is wrong on two points, both simplifying

**1. `window.claude.complete()` does not exist as described.** The artifact calls
the real Messages API: `fetch("https://api.anthropic.com/v1/messages")` with no
API key and no `anthropic-version` header — the claude.ai proxy injects both and
bills the viewer. Verified working multi-turn in August 2026.

Consequences the spec doesn't know about:

- **`SPEC.md`'s "unresolved and worth testing first" is resolved, favourably.** The
  Messages API documents base64 **PDF input** (`document` blocks) and **image
  input** (`image` blocks). So `INTERACTION.md` Path C's implementation ladder
  collapses to rung 1 — pass the file directly. Scanned statements and screenshots
  work. `pdf.js` becomes a fallback that may never be needed.
- **Structured outputs (`output_config.format` with a JSON schema) largely replace
  the Path C parser.** `INTERACTION.md`'s "Parser robustness" section is written
  for prose output; a schema-constrained response cannot silently mis-shape a row,
  which matters a great deal when a mis-mapped column is a quiet wrong number.
  **The parser is still needed in full for Path B** (a real brokerage CSV paste
  hits every one of those cases) — it just stops being Path C's primary mechanism.
- The spec says artifact CSP blocks `fetch` to arbitrary URLs. `api.anthropic.com`
  is evidently permitted. `benchmarks.json` must still be inlined (~16KB, fine).
- The test artifact uses `claude-sonnet-4-6` (previous generation). `claude-sonnet-5`
  and `claude-opus-5` are current — worth testing whether the proxy accepts them.

**2. The artifact must be authored in claude.ai**, because the auth-injecting proxy
only exists in that runtime. Build and preview locally with a dev shim that
intercepts `fetch` for the Messages API URL and adds `x-api-key` +
`anthropic-version`; the artifact source then stays byte-identical between the
repo and claude.ai, with nothing to strip on the way over.

## Next steps, in order

1. Confirm the fixture test is green. Nothing proceeds past this.
2. Build pipeline emitting all three targets from one source.
3. Web page, Path A only, V1 chart (`VISUALS.md` order — one visual at a time,
   each approved before the next; read the `dataviz` skill and run its palette
   validator against the real brand tokens before any chart code).
4. Path B + parser hardening. 5. V2 chart. 6. Offline single-file build.
7. Artifact wrapper + Path C.
