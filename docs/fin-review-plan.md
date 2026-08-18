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

---

# ENGINE PORT — DONE, one open question

`/root/portfolio-core` built, `tsc --noEmit` clean under strict, **7 of 8 tests
pass**. `engine.ts` is **byte-identical** to the handoff source (md5
`2aa757033344c351fa3946194f90446b`, verified both sides) — zero edits, zero
runtime deps, devDeps are just `typescript` + `vitest`.

**Every number reproduces.** endingValue 53690.25 exact; xirr 0.10054387 vs
0.100544; GLOBAL_EQUITY 60328.401 vs 60328.40; pctKept 0.68129 vs 0.6812. Dollar
figures agree to a tenth of a cent, with orders of magnitude of tolerance spare.
Benchmark data integrity confirmed: `meta.coverage` is accurate, no gaps, the one
null (`INTL_TOTAL.1996`) is documented in `meta.notes`.

## The open question — needs a decision

`regional-tilt` does not fire, and cannot. Fixture holdings give **usShare
76.83%**, a **13.83pp** deviation from the engine's 63% market weight. The engine
requires **>15pp**, which matches `SPEC.md` verbatim. So the engine and the spec
agree, and the *fixture's expected findings list* is the outlier.

Candidate explanations for the original analysis firing it: a 60% market weight
(→16.83pp, fires) or a 10pp threshold. Including cash in the denominator does not
do it (74.71% → 11.71pp). **Left deliberately failing** rather than massaged.
Resolve by deciding which is authoritative — engine/spec threshold, or fixture.

## Engine defects found (reported, NOT fixed — decide before UI)

Ordered by how much they matter for a financial tool:

1. **Partial years are labelled as years.** `you.annual` returns `2021: 0.0334`
   (2 months) and `2026: 0.0719` (7 months) un-annualised, alongside four full
   years. They feed `deriveFindings`, so upside/downside capture ratios are
   computed partly from partial periods. This is a correctness problem, not
   cosmetic — a 2-month stub shown as a year misleads.
2. **First-year window misalignment.** For 2021 the user's Modified Dietz starts
   at the first observed balance (2021-10-31) while the strategy compounds from
   2021-09-30. Two different windows, then divided by each other in the
   capture-asymmetry check.
3. **`buildStrategySeries` throws hard for histories before 2021-10** — an
   uncaught `Error`, not a degraded result. This is the monthly-data gap in code
   form; every target needs the input gate or option (b) before real users touch it.
4. **`deriveFindings` reads the wall clock** (`new Date().getUTCFullYear()`),
   making `analyse()` non-deterministic and fragile at year boundaries, in a
   module whose docblock claims determinism. Should take a `now` parameter.
5. **The engine never reads `data.annual`** — only `data.monthly`. The 30 years of
   annual data currently ship as dead bundle weight. Relevant to artifact payload
   size and to how option (b) would be implemented.
6. Type/data mismatches a consumer must paper over: `strategies.json` carries
   `default`/`requiresAfter` that `StrategyDef` doesn't declare; `fixtures.json`
   puts `holdings` as a sibling of `input` while `PortfolioInput.holdings` lives
   inside it — **without merging them, `regional-tilt`/`size-tilt` can never fire
   at all**.
7. `replay` yields `NaN` on a −100% month (fractional power of a negative base);
   unreachable with current data but unguarded. `feeShare` bisection silently
   returns its ceiling (`endingValue * 3`) rather than failing. Both bisections run
   500/200 iterations where ~60 exhausts double precision — wasted cycles if the
   UI recomputes per keystroke in the review table.

**Nothing in the engine blocks any of the three targets.** No Node APIs, no
`fetch`, no `fs`, no dynamic import, no timers. Pure ESM functions over `Date`,
`Math`, arrays. Inlines into a single HTML file trivially: 21KB engine + 12.5KB
benchmarks + 2.4KB strategies, against the artifact's 16MiB limit.

---

# REPO LAYOUT — proposed 2026-08-18

Supersedes the "Marketplace infrastructure" line above, which put the marketplace
in `ahf-brand`. It should not live there.

**One `ahf-tools` repo. It *is* the plugin marketplace, and every tool lives in it.**

    ahf-tools/
      .claude-plugin/marketplace.json   the marketplace itself
      tools/portfolio/
        skill/          the skill Claude Code loads
        core/           the engine + benchmark data (publishes to npm)
        dashboard.html  the template the skill populates locally
        artifact.html   claude.ai source; version-controlled, pasted over by hand
      tools/<next>/     same shape

Adding tool #2 is a directory and a marketplace entry — no new repo, no new
Vercel project, no new npm scope. A repo per tool was rejected for exactly that
per-tool tax.

**Why not `ahf-brand`:** it is consumed by four apps and releases when design
tokens change; tools release when a tool changes. Coupling them makes every
benchmark-data refresh a version bump on four apps' dependency. Also
`/plugin marketplace add ahumanflourish/ahf-brand` to install a financial tool
is the first command a user sees, and it reads wrong. `ahf-brand` stays the
design system; `ahf-tools` consumes it.

**The artifact stays authored in claude.ai** — the auth-injecting proxy only
exists in that runtime. Draft it here against `docs/artifact-brief.md`, keep the
source in the repo, hand it over with publication instructions. That is a
publishing quirk, not a second repo.

## The directory move

`/root/portfolio-core` is 10 files, one commit (`ae247f2`), **no git remote —
never pushed**. So this is a rename, not a migration:

    /root/portfolio-core/{src,test,package.json,tsconfig.json,.gitignore}
      -> /root/ahf-tools/tools/portfolio/core/

`package.json` keeps the name `@ahumanflourish/portfolio-core` and every path in
it stays relative, so nothing inside the package changes. The site consumes it by
published version, not by path, so the site is unaffected either way.
