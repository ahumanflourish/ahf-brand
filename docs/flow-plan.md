# The input flow — build plan

Written 2026-08-18, against `ahf-tools@8dc8e96`, `benchmarks.json` v1.1.0, engine
`analyse()` as it stands today (165 tests green, 2 skipped).

Governing principle, from the owner: **as much as possible templatized, as little as
possible called to Claude.** This plan puts exactly one model call in the whole flow and
justifies it. Everything else — validation, transfer detection, parsing, classification,
computation, strategy availability, rendering — is deterministic code.

---

## 0. What is already true that the plan of record no longer says

Four things changed under the plan of record and it hasn't caught up. Each of these
changes a decision downstream.

**The 2021-10 gate is gone, and the supported window now depends on which strategies are
selected.** `benchmarkCoverage()` intersects only the series the *selected* strategies
reference. Current floors:

| Selection | Earliest supported |
|---|---|
| `US_500`, `US_TOTAL`, `ALL_BONDS` (any combination) | **1996-01** |
| `GLOBAL_EQUITY`, `GLOBAL_8020`, `GLOBAL_6040` | **2010-01** (VT inception) |
| `TARGET_2060` — or `CASH` if ever used | **2021-10** |

The default reference is `GLOBAL_EQUITY`, so **the default supported window is 2010-01**,
not 2021-10, and a user with a 30-year history can be served today by deselecting the
global references. This makes strategy selection a *data-availability* control, not only a
display control, and the review table has to say so.

Stale artifacts that still assert 2021-10 and must be corrected:
- `tools/portfolio/skills/analyse/SKILL.md` step 3 — hard-gates at 2021-10 and would
  reject a valid 15-year history.
- `tools/portfolio/ui/v1.html` — `D.monthlyStart` has every series at `"2021-10"`, so
  `eraBlock()` disables strategies that are in fact available. Also `D.dataQuality`
  says `granularity: "annual"` and `warnings: []`; the engine now returns `"quarterly"`
  and three warnings for the same fixture.

**`regional-tilt` fires. The plan of record's "one open question" is resolved.** The
derived market weight anchored to the holdings date (`2023-08`) is **0.5998**, against a
fixture `usShare` of 76.83% — a 16.85pp deviation, over the 15pp threshold. All five
expected findings reproduce. Nothing to decide.

**Transfer detection is not cosmetic, and the engine formally disclaims it.**
`synthetic.test.ts` §6 pins the numbers: an equal-and-opposite pair *inside one month*
cancels in `replay` and moves only XIRR (~1.7bp on an 11,375 round trip); a pair that
**straddles a month boundary** — four days apart either side of 31 March — gives the
reference a full month of return on money that was never invested, moving the reference
ending value by **$434.69** and `capture.pctKept` by more than 0.1pp. The test also
asserts, deliberately, that the engine offers no detection and nothing in `dataQuality`
mentions the pair. This is a UI-layer contract, in code, at the table.

**The artifact bundle does not export what the review table needs.**
`build/src/entry.standalone.ts` re-exports 24 symbols and omits `AnalysisError`,
`benchmarkCoverage`, `classifyGranularity`, `dataQualityWarnings`,
`GRANULARITY_MAX_INTERVAL`. Without `AnalysisError` the artifact cannot `instanceof` the
engine's own error contract; without the other four the table cannot render a live
data-quality note or an availability boundary. One-line fix, listed in the build order.

---

## 1. The schema

Derived from `PortfolioInput` in `engine.ts`. Three surfaces, one contract: the CSV people
hand-build, the JSON schema the model is constrained to, and the `PortfolioInput` the
dashboard passes to `analyse()`.

### 1.1 Rows — `date,type,amount`

```
date,type,amount
2021-10-12,contribution,10000
2021-12-31,balance,16500.81
2023-01-15,withdrawal,3000
```

- **`date`** — ISO `YYYY-MM-DD`, zero-padded. Non-negotiable, because `toDate()` is
  `new Date(s + 'T00:00:00Z')`: `2024-1-5` yields `Invalid Date`, which propagates as
  `NaN` through `daysBetween` and out into the results with **no error**. The engine
  validates `expenseRatios` and the balance count and nothing else. Every other date
  guard is the table's job. Normalise in the parser; never hand a non-canonical date to
  the engine.
- **`type`** — exactly one of `balance | contribution | withdrawal`. Synonyms are a
  *parser* concern and never appear in the schema; the model emits canonical values only.
  Accepted synonyms, case-insensitive, whitespace/underscore/hyphen-normalised:

  | Canonical | Accepted |
  |---|---|
  | `contribution` | contribution, deposit, buy, purchase, transfer in, employee contribution, employer match, rollover in, cash in |
  | `withdrawal` | withdrawal, distribution, sell, redemption, transfer out, cash out, fee (see note) |
  | `balance` | balance, value, ending value, ending balance, market value, total value, closing balance, account value |

  Note on `fee`: a fee line is *not* a withdrawal — it is already inside the reported
  balance, and counting it as an outflow would inflate the measured return. Map it to
  the unparsed pile with a specific message. This is the same class of error as counting
  a dividend as a contribution.
- **`amount`** — positive number, no symbol, no separators. The engine `Math.abs()`es
  flows, so a signed flow is survivable; a **negative or zero `balance` flows straight
  into the maths as-is**, so the table must reject it.
- Row order is irrelevant (the engine sorts). Duplicate dates are legal. Two balances in
  one calendar month count as **one** observed month for granularity — surface that when
  it happens, because a user entering 15/12 and 31/12 thinks they added two data points.
- Extra columns ignored entirely.

### 1.2 Holdings — tier 3, a separate block, not rows

`PortfolioInput.holdings` is `{ asOf, positions: Holding[] }` and sits *beside* `rows`, not
inside them. CSV form:

```
# holdings 2023-08-31
ticker,value
VTI,3295.35
IEFA,2877.13
```

`asOf` accepts `YYYY-MM-DD` or `YYYY-MM` (the engine slices `[0,7]`). It anchors
`impliedUsMarketWeight()`, so it is load-bearing, not decoration — a 2023 snapshot
compared against a 2026 weight measures the market's drift as the user's tilt.

**`assetClass` and `sizeBucket` are resolved by a shipped lookup table, not by the model
and not by the user.** Whether VXUS is international equity is a fact, and a wrong guess
produces a silently wrong finding — exactly the failure class the spec exists to prevent.
Ship a `tickers.json` covering the few hundred tickers that account for almost all retail
holdings; unknown tickers resolve to `other` and drop out of the tilt denominators (the
engine already filters to `us_equity | intl_equity`). The table shows the resolved
classification per row with an override dropdown. The extraction prompt correctly asks
only for `ticker,value` — keep it that way.

### 1.3 Settings — UI inputs, not CSV

| Field | Type | Notes |
|---|---|---|
| `feePct` | fraction | 0 is valid. **Engine does not validate it at all.** UI takes a percent, range-checks 0–5%, confirms above 3%. |
| `currentAge` | int, optional | Only feeds `target-year-mismatch`; needs `statedTargetYear` too. |
| `statedTargetYear` | int, optional | See §5. |
| `usMarketWeight` | fraction, optional | Advanced; do not expose in v1 (§5d). |
| `expenseRatios` | `{[strategyId]: fraction}` | Engine rejects non-finite or `\|v\| >= 1`. UI takes an all-in percent and converts with `extraDrag()`. |
| `now` | Date | Not user data. **Pass it explicitly.** Omitting it makes `target-year-mismatch` flip at midnight on 1 January and makes the whole call irreproducible. |

### 1.4 The JSON export — the round-trip format

One file, one contract, maps 1:1 onto `PortfolioInput` plus `now`. It is the export/import
format, the artifact's download, and what the skill writes into the local dashboard's
`<script id="portfolio-data">`.

```json
{
  "schemaVersion": 1,
  "asOf": "2026-08-18",
  "rows":     [{"date":"2021-10-12","type":"contribution","amount":10000,
                "confidence":"read","source":"Q4 statement p2","excluded":false}],
  "holdings": {"asOf":"2023-08-31","positions":[{"ticker":"VTI","value":3295.35}]},
  "settings": {"feePct":0.0085,"currentAge":31,"statedTargetYear":2043,
               "expenseRatios":{"TARGET_2060":0.0067}},
  "selectedStrategies": ["GLOBAL_EQUITY"]
}
```

`confidence`, `source` and `excluded` are UI-layer fields the engine ignores — they are
stripped on the way into `analyse()` and preserved on the way out to the file. That is
what makes a re-import show the same struck-through transfer rows and the same estimated
markers the user last saw.

---

## 2. Where the model call sits, and how narrow it can be

### One call, not a conversation

The owner said "talk with Claude". A single schema-constrained call serves that intent
better, and here is the argument rather than the assertion:

- **Format is not negotiable any more.** `output_config.format` with a JSON schema means
  the response cannot be mis-shaped. The entire reason a chat loop existed was to say
  "no, give me that as a CSV" — that problem is gone on this path.
- **The correction surface already exists and is better.** Corrections made in prose are
  unauditable; corrections made in the review table are the source of truth by
  construction. A chat loop duplicates the table, worse.
- **Cost and latency are the viewer's.** Every conversational turn resends the attached
  documents. A 20-page statement is roughly 30–50k input tokens *per turn*, billed to the
  viewer's own account. Three turns of "actually the September balance is wrong" costs
  more than the extraction did and fixes something a single cell edit fixes for free.
- **The talking that matters is one-way.** What the user needs to hear back is: what was
  found, what was excluded and why, what was estimated. That is the summary block above
  the table, rendered from structured fields — not a chat bubble.

**One concession:** a "this doesn't look right — ask again" button that re-sends the same
documents plus the user's note as one extra text block, at most three times per upload.
Still one request, still schema-constrained, still lands in the table. It is a
re-extraction, not a conversation.

### Exact request shape

```js
const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },   // proxy injects key + version
  body: JSON.stringify({
    model: "claude-sonnet-5",
    max_tokens: 16000,
    stream: true,
    system: EXTRACTION_SYSTEM,          // extraction-prompt.md, rewritten as instructions
    messages: [{ role: "user", content: [
      { type: "document", source: { type: "base64", media_type: "application/pdf",
                                    data: b64 } },
      { type: "image",    source: { type: "base64", media_type: "image/png",
                                    data: b64 } },
      { type: "text", text: "Extract this account history." },
    ]}],
    output_config: { format: { type: "json_schema", schema: EXTRACTION_SCHEMA } },
  }),
});
```

Design constraints this shape encodes:

- **Zero beta headers.** We do not control `anthropic-beta` through the proxy, so the
  design uses only GA features: structured outputs, base64 `document`, base64 `image`.
  This rules out the Files API (beta) and rules out citations anyway (citations + `format`
  is a 400).
- **Model: `claude-sonnet-5`.** Structured outputs are supported on Fable 5, Opus 5,
  Opus 4.8, Sonnet 5 and Haiku 4.5. **`claude-sonnet-4-6` — the model the test artifact
  used — is not on that list.** Sonnet 5 has the 1M context a 40-page statement needs, is
  the cheapest capable option, and extraction is precisely its job; Opus 5 bills the
  viewer ~1.7× for no gain here. Haiku 4.5 is a fallback only: 200K context caps base64
  PDFs at 100 pages.
- **Leave `thinking` unset.** Adaptive is the default on Sonnet 5. Reconstructing flows by
  differencing YTD columns and spotting the transfer pair is exactly the reasoning worth
  paying for, and there is no latency budget worth trading it against on a one-shot call.
- **`stream: true`.** Not for token-by-token rendering — for the HTTP timeout, and for a
  progress indicator on a call that can run a minute on a dense statement.
- **Schema rules that bite:** `additionalProperties: false` on every object;
  `minLength` / `maximum` / `pattern` are unsupported and silently dropped, so date
  validity is client-side (use `"format": "date"`, which *is* supported, and re-check with
  a regex anyway); no recursion.

### The schema

```jsonc
{ "type": "object", "additionalProperties": false,
  "required": ["rows", "excludedTransfers", "estimatedDates", "summary", "unreadable"],
  "properties": {
    "rows": { "type": "array", "items": {
      "type": "object", "additionalProperties": false,
      "required": ["date","type","amount","confidence","source"],
      "properties": {
        "date":       { "type": "string", "format": "date" },
        "type":       { "type": "string", "enum": ["balance","contribution","withdrawal"] },
        "amount":     { "type": "number" },
        "confidence": { "type": "string", "enum": ["read","derived","estimated"] },
        "source":     { "type": "string" }          // "Q3 statement p2, Ending Value"
      }}},
    "holdings": { /* asOf + [{ticker, value}] */ },
    "excludedTransfers": { /* [{date, amount, note}] */ },
    "estimatedDates":    { "type": "array", "items": { "type": "string" } },
    "summary": { /* totalContributed, totalWithdrawn, netInvested,
                    accountsCombined, firstDate, lastDate */ },
    "unreadable": { "type": "array", "items": { "type": "string" } }
  }}
```

Two fields carry most of the value and neither is in `extraction-prompt.md` today:

- **`source`** per row — a short human string naming where the number came from. It is
  what turns "trust the model" into "check this row against page 2". Add it to the prompt.
- **`confidence`** per row — `read | derived | estimated`, driving INTERACTION.md's
  "distinct style plus a legend". `derived` is the quarterly-differencing case, which is
  neither read nor guessed and currently has nowhere to live.

**`summary` is display-only and never trusted.** The table recomputes the totals from the
rows. If the model's own totals disagree with its own rows, that is a red banner —
"Claude's totals don't match the rows it produced; check the table." Free, deterministic,
and catches a whole class of extraction error the schema cannot.

### Failure states

> **CORRECTION (2026-08-19, after measurement).** Two claims below were written
> before the proxy was probed and are WRONG. (a) The signed-out row expects a
> non-OK status or a login-page body; in fact claude.ai intercepts with a modal
> and the request NEVER REACHES THE API, so code written against that row would
> hang — a timeout is required, not an error branch. (b) The argument for
> `claude-sonnet-5` on the grounds that `claude-sonnet-4-6` lacks structured
> outputs is contradicted by measurement: the A/B ran on 4-6, post-remap, and got
> 3/3 schema compliance. See "PROXY BEHAVIOUR — MEASURED" at the end of this file,
> which supersedes this section wherever they disagree.

| Condition | Detection | Behaviour |
|---|---|---|
| Signed out / no entitlement | non-OK status, or a body that isn't JSON (a login page) | "Claude couldn't be reached — you may be signed out. Everything you've entered is still here." Keep state. Offer A/B. |
| Quota exhausted | 429; read `retry-after` | Name the limit, one retry maximum, then A/B. Never loop. |
| Refusal | HTTP **200** with `stop_reason === "refusal"` | **Check `stop_reason` before touching `content`** — otherwise `content[0].text` is empty or throws. "Claude declined to read this document. Nothing was extracted." No retry, no `fallbacks` (that needs a beta header we can't guarantee). |
| Truncation | `stop_reason === "max_tokens"` | **The one case structured outputs does not save you** — the guarantee is shape, not completeness, so the JSON is invalid. `JSON.parse` fails → "That statement was too long to read in one pass. Split it into fewer pages." Likeliest real failure on a 40-page PDF. |
| Overloaded / 5xx | 500, 529 | One retry with backoff, then A/B. |
| Zero rows | `rows.length === 0` | Show `unreadable[]` verbatim. Route to A/B. Never a half-populated table. |

Enforce client-side before sending, so the API never 413s: 32MB request ceiling, and
base64 inflates 4/3, so cap raw attachments at ~20MB total; 600 PDF pages (100 if the
proxy forces a 200K-context model); reject with the specific number, not a generic error.

---

## 3. What is template and what is model

| Step | Who | Why not the model |
|---|---|---|
| Choosing a path | template | Three buttons. |
| Reading a statement into the schema | **MODEL — the only call** | Arbitrary layout → structured data. Nothing else can do it. |
| Parsing a pasted CSV | template | `parseRows()`. Deterministic, testable, works offline, works logged out. |
| Date-format disambiguation | template | Whole-file inference, one question if genuinely ambiguous. A model guess here is invisible and wrong 50% of the time. |
| Type-synonym mapping | template | A lookup table. |
| Currency/negative/thousands cleaning | template | A regex. |
| **Transfer detection** | **template — mandatory** | `synthetic.test.ts` §6: a month-straddling pair moves the reference by $434.69 and the headline capture by >0.1pp. Must not depend on the model noticing. |
| Row validation | template | Engine has no date or amount guard; this is the only thing standing between a typo and a plausible wrong number. |
| Ticker → asset class / size bucket | template | A fact table. A guess here silently flips `regional-tilt`. |
| Running summary, live data-quality note | template | `dataQualityWarnings()` is exported and pure. |
| Strategy availability / era blocks | template | `benchmarkCoverage()` + `meta.inception` + `requiresAfter`. |
| All maths | template | `analyse()`. |
| Findings wording | template | `deriveFindings()` returns the copy; render `detail` verbatim. |
| Target-date fund choice | template | A picker over a catalogue (of one — see §5). |
| Charts, table, export | template | |

**One model call in the entire flow.** Its output lands in the review table and never
passes it.

---

## 4. The review table

The most important screen. It is Path A's UI *and* the landing surface for B and C — not
three screens.

### Columns

`Date | Type | Amount | Source | ⌫`

- **Type** is a three-way segmented control (`.choice` in the brand grammar), not a
  `<select>`. Three options, zero latency.
- **Source** carries the confidence marker for AI-extracted rows (`estimated` gets a
  dashed left rule and appears in a legend, per INTERACTION.md) and the origin string.
  For manually-typed rows it is empty. Editing an AI row's amount clears its marker to
  `edited by you` — the provenance has to be honest in both directions.
- Rows flagged as a transfer render struck-through with an "excluded" badge, not deleted.

### Inline validation — all pre-engine, all deterministic

| Check | Level |
|---|---|
| Date not `^\d{4}-\d{2}-\d{2}$`, or not a real calendar date | error (blocks compute) |
| Date in the future | error |
| Date before the earliest supported month **for the currently selected strategies** | warning, naming the date and which strategy is the constraint — deselecting it may fix it |
| Amount not finite, or ≤ 0 on a `balance` | error |
| Amount 0 on a flow | warning |
| Fewer than 2 balance rows | compute disabled |
| First balance predates the first flow | the "is this an opening balance?" question |
| Identical `(date,type,amount)` triple | warning: possible duplicate |

**Rule for error copy: the engine's `AnalysisError.message` strings are already
user-facing prose — render them verbatim and let the UI add only the action.** Do not
paraphrase them in the table; the pre-check mirrors the guard, the engine stays the
backstop, and there is exactly one wording per condition.

### Running summary (above the table, recomputed on every edit)

Total contributed · withdrawn · net · first and last date · span in months · balance
points · **distinct observed months**. That last one, not `balanceCount`, is what drives
granularity, and showing both when they differ is what stops "I entered two December
balances" from reading as two data points.

### The live data-quality note

`dataQualityWarnings()` is exported and pure, so the table can render the *real* copy —
not an approximation — before any analysis runs. It needs one thing it can't cheaply
derive: `periods`, the per-year measured windows.

**Recommendation: lift `describeInput(rows)` out of `analyse()`** — the balance/flow
partition, the `periods` loop, the observed-month/gap/granularity block, and the
`dataQualityWarnings()` call — and have `analyse()` call it. Zero behaviour change, the
fixture must stay byte-identical, and the review table gets the honest live note with no
duplicated maths and no drift risk. This is the smallest change that makes the most
important screen truthful, and it is the next piece of work.

Which `dataQuality` fields surface where:

| Field | Table (live) | Results page |
|---|---|---|
| `warnings[]` | yes — the note, verbatim | yes, above the chart (`#dq-warning` exists in v1) |
| `granularity` | yes, as a one-word badge | yes, chart footnote |
| `observedMonths` / `spanMonths` | yes — "27 of 58 months" | inside the warning prose |
| `largestGapMonths` | only when lumpy (the engine's own rule: `>= 3 && >= 2 × interval`) | in the prose |
| `balanceBeforeFirstFlow` | yes — as the opening-balance question | as an assumption note |
| `coverage` | **no** | **no** — a bare 0.4655 reads as precision the data doesn't have; the prose already says "27 of 58" |
| `balanceCount` | only when it differs from `observedMonths` | no |
| `flowCount` | in the summary line | no |

For the reference fixture the note is three paragraphs, and the first is: *"Balances cover
27 of the 58 months in this period — about one every 2 months, and the longest stretch
without one runs 8 months…"* That is the standard the table has to meet before compute,
not after.

### Undo, and clear-everything

- Bounded snapshot stack (50 deep), every mutation pushes, `Cmd/Ctrl-Z` plus a visible
  button that **names the action** ("Undo: deleted 2024-12-31"). Redo is free once the
  stack exists.
- "Clear everything" is a two-step confirm and runs the *same code path* as the
  persistence eraser: rows, settings, pending file objects and their object URLs, the
  undo stack, and any stored copy. "Actually clears everything" means there is one
  function, not a button that clears the visible state.

### Compute is a gate, not a live recompute

Do not call `analyse()` on keystroke. Measured: the `feeShare` bisection alone takes
**1459ms** on a 126-flow portfolio across 7 strategies (72ms with `feePct: 0`). The table
recomputes only pure arithmetic and `dataQualityWarnings()`; `analyse()` runs on the
explicit "looks right" press and on settings changes, debounced.

### Transfer detection — the algorithm

`findMatchedFlows(rows, { days: 7, tol })` in core, pure:

1. Flows only. Pair a contribution C with a withdrawal W where
   `|C.amount − W.amount| ≤ max(0.01, 0.001 × amount)` and `|days(C,W)| ≤ 7`.
2. Greedy by smallest date gap; each row used at most once.
3. Surface as a card **above** the table, both legs quoted with dates and amounts, and
   the question INTERACTION.md specifies. Two buttons: exclude both / keep both.

Acceptance test, from the fixture itself: the pair is `2026-02-15 +7500 / 2026-02-15
−7500`, and `fixtures.json` note 3 confirms it is a genuine inter-account transfer. The
detector must fire on it; because both legs fall in one month **either answer reproduces
every expected value** — only `grossContributed` (50,875 → 43,375) and `grossWithdrawn`
(11,375 → 3,875) move. It must *not* fire on `2024-11-15 +875` / `2025-01-15 −875` (equal
magnitude, 61 days apart) or on `2025-01-15 +3500 / −875` (unequal). Those three cases are
the whole test.

---

## 5. The user-set inputs, and what each changes

### (a) Target retirement date — flag this honestly

**There is nothing to pick from.** `strategies.json` has exactly one target-date fund,
`TARGET_2060`, and `benchmarks.json` carries monthly `TARGET_2060` only from 2021-10, with
`meta.coverage` explicitly recording it as *"not extended"*. A year picker over one option
is not a feature.

What *does* exist: `PortfolioInput.statedTargetYear` and `currentAge` are already wired and
already drive `target-year-mismatch`, which fires on the fixture. That input changes what
is **said**, not what is **measured**, and it is worth shipping now.

The trap to avoid is conflating two inputs that look like one:

| Input | Feeds | Status |
|---|---|---|
| "What target year does your plan say?" | `statedTargetYear` + `currentAge` → the `target-year-mismatch` finding | **Ship now.** Works, real, no data needed. |
| "Which target-date fund should we measure you against?" | which strategy is in the comparison | **Blocked.** One fund exists. |

Name them differently and put them in different places — the first sits with age in the
"about you" settings; the second is a row in the strategy picker.

**Interim behaviour, recommended:** the strategy picker shows `TARGET_2060` as today, and
a disabled year list (2025…2065) each carrying its own reason: *"Not yet available — we
only have verified monthly returns for the 2060 fund."* Do **not** silently substitute
2060 for someone retiring in 2035; do **not** synthesise a glide path.

**What it would take.** Nine series — VTTVX 2025, VTHRX 2030, VTTHX 2035, VFORX 2040,
VTIVX 2045, VFIFX 2050, VFFVX 2055, VTTSX 2060, VLXVX 2065 — monthly total return, under
the **same reconciliation gate as the v1.1.0 backfill**: adjusted-close primary,
compounded against the issuer's own published annual figures from SEC filings, second
source cross-check, residuals reported in basis points, and a series with a hole gets
dropped rather than shipped (the INTL_TOTAL 2002–03 precedent). Cheaper than the 30-year
backfill — one issuer, one filing family, nine funds, and `data-tools/` already has
`verify.mjs`, `reconcile.mjs` and `make_annual_gate.py`. Budget 1–2 days. Fund inceptions
bound each series (2065 launched 2017; 2060 in 2012; the rest 2003–2006), and the existing
`requiresAfter` / `meta.inception` gating handles that already. Also needs nine
`strategies.json` entries with `funds[]` and the same expense-ratio caution.

**Rejected: a synthetic glide path** from `GLOBAL_EQUITY` + `BOND_TOTAL` at published
target weights. It computes fine and is exactly the invisible-plausible-wrong class the
spec warns about — real target-date funds hold TIPS, short-term TIPS and international
bonds and reallocate on their own schedule. If it is ever built it must be labelled
`constructed`, the way pre-2008 `GLOBAL_EQUITY` is.

### (b) Fee

`feePct` → `capture.feeShare` (via bisection) → the `fee-minority` finding, which fires
only when `feePct > 0` and the fee explains under half the gap. Fully supported by the
data: it is a stated input, not an inference.

Two things the UI must say, because the engine's behaviour is otherwise confusing:

- The engine measures against a **0.10% floor** (`feeDelta = max(0, feePct − 0.001)`), so
  a user entering 0.10% sees `feeShare: 0` and concludes the tool is broken. Copy:
  *"measured against a 0.10% floor — the cost of the cheapest index fund you could have
  bought instead."*
- The engine does **not** validate `feePct` at all. 85 typed for 0.85% produces a number.
  Range-check in the UI: 0–5%, confirm above 3%.

### (c) Expense ratios, per strategy

The user knows what their plan's version of the fund costs; the tool does not. UI takes
the **published all-in percent**, converts with `extraDrag(def, pct/100)` — which is
deliberately unclamped, so a cheaper institutional share class correctly makes the
reference *better* — and passes the result in `expenseRatios[id]`. `resolveExpenseRatio()`
returns `{extra, embedded, allIn, source}`, so the results page can print *"measured at
0.75% all-in (your figure)"* against *"0.06% all-in (cheapest share class we could
source)"*.

Data supports it for every shipped strategy: each one has a `basis: "monthly"` fund with a
sourced ratio and an `asOf`, so `embedded` — and therefore `allIn` — resolves for all
seven. The `null` case only arises for hand-built defs.

The live risk is **not** the one the engine guards. `AnalysisError('invalid-expense-ratio')`
catches `75`, but `0.75` — meaning 75 basis points, interpreted as 75% — passes the
`|v| < 1` check and produces a catastrophic drag with no error. So: the control takes a
percent, range-checks 0–2.5%, confirms above 1.5%, and does the conversion itself. Never
expose a raw fraction field.

Offer it for every selected strategy, collapsed, showing the catalogue figure as text
until opened. `TARGET_2060`'s caution already points at it explicitly.

### (d) `usMarketWeight`

Changes only which side of `REGIONAL_TILT_THRESHOLD` a holdings snapshot falls on, and the
figure quoted in the finding. Meaningful only at tier 3. **Do not expose it in v1.**
Instead, show the provenance next to the finding — *"roughly 60% US as of 2023-08, derived
from return correlation, not a sourced market-cap figure"* — from
`marketWeight.{usEquity, asOf, source, months}`. Expose the override only once someone
disputes the number; it is a judgement input and it should look like one.

### (e) Strategy selection — a data input, not only a display input

Selecting `TARGET_2060` moves the supported window from 2010-01 to 2021-10 and can make a
previously-valid history un-analysable. The picker must recompute availability against
`benchmarkCoverage()` on every change and say which strategy is the constraint. v1.html's
`eraBlock()` already has the right shape; its data is stale (§0).

---

## 6. Paths A and B — the paths most people take

Neither is a fallback. Both work with no account, no model, no network.

### Path A — type it in

The review table *is* Path A; there is no separate entry screen. Empty state carries two
prefilled example rows in a distinct style, cleared on the first edit of any cell.

**Add a year-end mode.** The raw row table is not "eight numbers in five minutes" — it is
sixteen date strings. Build a view over the same rows: one line per year, two number
fields (balance at year end, total contributed that year), expanding into canonical rows
underneath. Same data model, same validation, and it is the actual tier-1 shape SPEC.md
describes. This is the difference between designing for tier 1 and claiming to.

Keyboard: Tab across, Enter appends a row, ↑/↓ move within a column, new rows pre-fill the
date to 31 December of the following year.

### Path B — paste or upload a CSV

Textarea first, file input beside it. `parseRows()` lives in core, is pure, and gets its
own test suite of real brokerage snippets. Hardening, in order:

1. Strip BOM; normalise CRLF/CR → LF.
2. Strip markdown fences, and any prose before the first line that parses as data.
3. **Delimiter sniff** — comma, tab, semicolon; pick the one giving the most consistent
   field count over the first 20 non-blank lines. (Semicolon is not in INTERACTION.md and
   is standard in European exports.)
4. **Proper quoted-field handling.** `"1,234.56"` must not split on the comma. This is
   not in INTERACTION.md and it is the single most common real-world failure — brokerage
   CSVs quote amounts containing thousands separators. **Addition to the spec.**
5. Header detection: if the first data-ish line has no parseable amount in any column,
   treat it as a header and map columns **by name** (`date|trade date|settlement date|as
   of`, `type|transaction|description|activity`, `amount|value|net amount`). Otherwise
   positional. Name-mapping is what makes a raw export work at all — its columns are
   never in `date,type,amount` order.
6. Ignore extra columns entirely.
7. Number cleaning: strip `$ £ € ¥`, thousands separators (`,`, space, `'`), parenthesised
   negatives, trailing `-`, `CR`/`DR` suffixes.
8. **Dates: disambiguate over the whole file, not per row.** Any first component > 12 →
   DD/MM. Any second > 12 → MM/DD. Both → the file is inconsistent; error. Neither → ask
   **once**, showing an example row (*"03/04/2024 — 3 April or March 4?"*). Then
   `Mon YYYY` / `Mon-YY` → month end. Two-digit years: 00–79 → 20xx, 80–99 → 19xx.
9. Type synonyms per §1.1. An unmatched type goes to the unparsed pile, never silently
   dropped. A `fee` line gets its own message.
10. Signed-amount files with no type column: offer *"treat negatives as withdrawals"* as
    an explicit checkbox with a preview. Never infer it.
11. Report: *"Read 47 rows. 3 lines couldn't be read."* with those 3 lines shown verbatim
    and individually editable in place.
12. Zero parseable rows → raw input beside the expected format, plus a one-click "load the
    example". Never a generic error.
13. Caps: 5MB of text, 10,000 rows — with a message, not a hung tab.

Parsed rows land in the same table, with `source: "pasted CSV, line 12"`.

---

## 7. Privacy copy, per path, at the point of choice

Each line lives **inside its own path's card**. The page footer says nothing about privacy
at all — a footer claim cannot be path-accurate.

**Paths A and B (and the whole web page and offline file):**
> Nothing leaves your browser. No servers, no accounts, no analytics on this page.

**Path C (artifact AI extraction):**
> Your statements are sent to Claude under **your own** Claude account, subject to your
> own account's terms. They are never sent to me, and I never see them. If you'd rather
> not, use manual entry or paste a CSV — those never leave your browser.

Two additions this plan makes:

**The artifact loads Google Fonts, so "nothing leaves your browser" is not literally
true there.** `artifact-brief.md` explicitly permits the one Google Fonts link (the
typeface is not optional for the brand), and INTERACTION.md is equally explicit that the
A/B claim "must be literally true — no `fetch`". Both cannot hold in the same file.
Resolution: **in the artifact only**, the A/B line becomes

> Your figures never leave your browser. Nothing you type or paste is sent anywhere.

which is exactly true and survives a pedantic reading. The web page and the offline
single-file build self-host the fonts and keep the stronger original wording. Getting this
wrong is precisely the "small inaccuracy that destroys the trust the sentence was there to
build" — and the fix costs one sentence.

**Once Path C has been used in a session, the session is AI-touched.** The results page's
export and share affordances must not carry the A/B claim afterwards. Track one boolean.

---

## 8. Build order

Each step is independently shippable and leaves a coherent thing behind.

| # | Step | State |
|---|---|---|
| 1 | **`describeInput()` lifted out of `analyse()`** into core — periods, observed months, gaps, granularity, warnings. Pure refactor; the fixture must reproduce byte-identically. | **READY — this is the next piece of work** |
| 2 | Export the missing symbols from `build/src/entry.standalone.ts`: `AnalysisError`, `benchmarkCoverage`, `classifyGranularity`, `dataQualityWarnings`, plus `describeInput`. One-line change, unblocks every target. | READY |
| 3 | Schema doc + the JSON export/import format (§1.4) + `parseRows()` in core with its own brokerage-snippet suite. | READY |
| 4 | `findMatchedFlows()` in core, with the three fixture cases as its acceptance test. | READY |
| 5 | **Review table, Path A**, on 1–4. Live summary, live warnings, validation, undo, clear, transfer card, JSON download. No chart. Ends at "looks right". | READY after 1–4 |
| 6 | Year-end mode over the same rows (§6). | READY after 5 |
| 7 | Path B wired into the table. | READY after 3, 5 |
| 8 | Settings panel — fee, age, stated target year, per-strategy expense ratio — and the strategy picker driving `benchmarkCoverage()`. | READY, with the §5a naming decision to make first (small) |
| 9 | Wire table → `analyse()` → V1 chart. Replace v1.html's hardcoded `D` with a generated payload; fix the stale `monthlyStart`, `granularity` and `warnings`; fix SKILL.md's 2021-10 gate. | READY after 5, 8 |
| 10 | Tier-3 holdings input + `tickers.json` classification table. | **NEEDS A DECISION** — `fixtures.json` still nests `holdings` as a sibling of `input`, which every consumer papers over; fix the fixture or declare the shape |
| 11 | Offline single-file build of the whole flow, fonts self-hosted. | READY after 9 |
| 12 | Artifact wrapper + Path C. | **BLOCKED on one experiment** — below |
| 13 | V2 capture bar, then V3+. | READY after 9 |

### The one experiment that unblocks Path C

Publish a throwaway artifact in claude.ai that POSTs to `/v1/messages` and reports four
things. Nothing in Path C's design can be settled by reading documentation, and everything
in it depends on these answers:

1. Does the proxy accept `model: "claude-sonnet-5"`? (The test artifact used
   `claude-sonnet-4-6`, which does **not** support structured outputs.)
2. Does it accept `output_config: { format: { type: "json_schema", … } }`?
3. Does it accept a base64 `document` block? An `image` block?
4. What does a **logged-out** response actually look like — status code, and is the body
   JSON or an HTML login page?

Ten minutes of work; it is the gate on the entire AI path.

### Also queued

- **Target-date fund sourcing** (§5a) — 1–2 days. BLOCKED on the decision to spend it.
- **`data.annual` is still dead weight** — the engine reads only `data.monthly`. 30 years
  of annual data ships in every artifact and offline file and is never used. Either wire
  it into a coarse fallback or strip it at build time.
- **`StrategyDef` still doesn't declare `default` / `requiresAfter`**, which
  `strategies.json` carries and the UI reads. Add them to the type.
- **The bisections run 500 and 200 iterations** where ~60 exhausts double precision. At
  1459ms per `analyse()` on a fee-paying 126-flow portfolio, that is the difference
  between a settings slider that feels live and one that doesn't.

---

# PROXY BEHAVIOUR — MEASURED 2026-08-19, not inferred

Eight probes run from a published claude.ai artifact against
`fetch("https://api.anthropic.com/v1/messages")` with `Content-Type` only — no
`x-api-key`, no `anthropic-version`. These supersede every assumption in §2.

| # | Question | Result |
|---|---|---|
| 1 | Does the proxy accept `claude-sonnet-5`? | **Accepted, then SILENTLY REMAPPED** to `claude-sonnet-4-6`. HTTP 200, no warning. |
| 2,7,8 | Does `output_config.format` work? | **YES — it shapes generation.** See the discriminator below. |
| 3 | Forced `tool_use` via `tool_choice`? | **NO.** Tools are stripped; the reply was a chatty markdown table. |
| 4 | Assistant prefill? | **NO.** 400, "does not support assistant message prefill". |
| 5 | base64 `document` (PDF) block? | **YES.** |
| 6 | base64 `image` block? | **YES.** |
| — | Logged out? | Not an HTTP status. claude.ai intercepts with a modal; the request never reaches the API. |

## The discriminator, because a schema-shaped reply proves nothing on its own

A cooperative model returns JSON when asked. The test that separates enforcement
from coincidence is a paired A/B on a PROSE-INVITING prompt, plus a marker key:
a single-value enum (`source_label: "ledger-x7"`) that the model would never
volunteer. Three trials each way:

    with output_config     bare JSON 3/3     marker key present 3/3
    without output_config  bare JSON 0/3     (all three replied in prose)

`output_config` is changing generation. Structured extraction is viable.

## What follows for the build

- **Build against `claude-sonnet-4-6`.** You do not get to choose the model.
  Read `json.model` on every response; a silent remap is invisible otherwise.
- **`output_config` is the ONLY schema mechanism available.** Tools are stripped
  and prefill is rejected, so there is no fallback behind it. If it ever stops
  being honoured the path degrades to free-text parsing with no warning — which
  is one more reason the parser and the review table are not optional.
- **VALIDATE ANYWAY.** Enforcement shapes generation; it does not survive
  `stop_reason: "max_tokens"`, which yields schema-shaped but truncated,
  unparseable JSON — the likeliest real failure on a long statement. Set
  `max_tokens` high, check `stop_reason` explicitly, and never let model output
  reach the maths without passing through the table.
- **Files go straight in.** `document` and `image` blocks both pass, so
  INTERACTION.md's three-rung fallback ladder collapses to rung one. No `pdf.js`.
  Scanned statements and screenshots work.
- **Logged out needs a TIMEOUT, not an error branch.** There is no 401 to catch;
  the platform intercepts and the fetch never resolves.
- **~4,200 input tokens of proxy overhead per call**, billed to the viewer —
  `input_tokens: 4179` for "Reply with the single word: ok". A five-turn
  conversation burns ~21k tokens before a statement is attached. This settles
  §2's one-call-not-a-conversation recommendation on cost alone.

---

# DECISION — transfer-labelled rows with no matching leg (2026-08-19)

The parser reports rows whose type token is transfer-like (Schwab's
`MoneyLink Transfer`, `TRANSFER FROM BANK`) rather than classifying them. That is
safe but wrong in practice: at that broker it is the commonest contribution shape,
so the most important row in the file arrives needing a manual fix.

**Decision: auto-classify, marked `estimated`, but ONLY when the row cannot be an
internal transfer.**

The dangerous case is already covered by a different mechanism. A transfer-labelled
row WITH a matching equal-and-opposite leg inside `findMatchedFlows`' 7-day window
is the $11,375 trap, and must stay a question put to the user. A transfer-labelled
row with NO matching leg is money arriving from outside, and its sign says which
direction. So:

1. Parse and retain the row with its transfer-like token.
2. Run `findMatchedFlows` over the full set.
3. Any transfer-labelled row that PAIRS stays unclassified and surfaces the
   transfer question.
4. Any that does NOT pair is classified from its sign — positive contribution,
   negative withdrawal — with `confidence: 'estimated'` and the reason recorded.

The review table is still the gate; nothing reaches the maths unconfirmed. This
only changes whether the user starts from a sensible default or from a blank.

Note the ordering constraint: transfer detection must run BEFORE classification,
which is the reverse of the obvious pipeline. Do not classify then detect.
