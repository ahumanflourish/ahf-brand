# The Claude.ai artifact runtime — what we have actually verified

Written 2026-08-19, revised the same day after a second probe batch. Audience: someone
about to build their second artifact in this project. Read time: five minutes. Everything
here is specific to the artifact runtime; nothing restates the general Messages API docs.

**Every claim carries a confidence tag. Nothing is unlabelled.**

| Tag | Means |
|---|---|
| **[M]** MEASURED | Observed in a real run. Stamped **b1**/**b2** for the batch that saw it. |
| **[I]** INFERRED | A conclusion drawn from measurements, not itself observed. |
| **[D]** DOCUMENTED | From Anthropic docs or tool descriptions. Not tested here. |
| **[U]** UNRESOLVED | Two sources disagree, or nobody has checked. A test is given. |

**Two batches, both 2026-08-19, not interchangeable.** **b1** (eight probes) took
parameters one at a time and never touched streaming, `system`, `thinking` or the CSP.
**b2** (11:56 UTC, six probes, all PASS, `claude-sonnet-4-6` throughout) took those and the
combinations.

**Labelled claims in §1–§7, post-b2: 47 [M] · 30 [I] · 8 [D] · 11 [U].** The 47 measured
split 24 from b1, 22 from b2, and one from the 2026-08-12 font-file inspection. §8 restates
body claims and is not counted again.

This project has been bitten twice by a plausible-sounding untested statement: a
documented Google Fonts URL that silently shipped a font missing two axes, and a probe
whose verdict logic would have passed a test its own data could not support. Then a third
time by the mirror image — an untested *constraint* assumed into existence, which rewrote
privacy copy (§4.1). Hence the tags. **Do not add a claim without one.**

---

## 1. The runtime split — where an artifact must be authored

| Authored in | Can declare capabilities | Can call a model at runtime |
|---|---|---|
| Claude Code | Yes — from a fixed roster. This account: `downloads`, `mcp` | **No** |
| claude.ai | n/a | **Yes** — `fetch` to the Messages API works |

- **[D]** The capability roster is account-scoped and served live by the
  `artifact-capabilities` skill. `downloads` and `mcp` were this account's roster as of
  2026-08-12 (`decisions.md`). Neither can fetch a stylesheet or call a model. Re-check
  the roster rather than trusting this line; it is the sort of thing that changes.
- **[M] b1** From a published claude.ai artifact: `fetch` to
  `https://api.anthropic.com/v1/messages` succeeds and is billed to the viewer.
- **[I]** **Consequence: any artifact that needs a runtime model call must be authored in
  claude.ai.** There is no Claude Code capability that substitutes.
- **[I]** Everything measured in this file came from a **claude.ai-authored** artifact.
  The two runtimes are demonstrably not identical; do not port findings across untested.

**The workflow that follows.** Keep the artifact source in the repo. Build and preview
locally with a dev-only shim that intercepts `fetch` for the Messages API URL and adds
`x-api-key` + `anthropic-version: 2023-06-01`. The source then stays byte-identical
between repo and claude.ai — nothing to strip on the way over, and the file is
version-controlled even though publication is a manual paste. **[I]**

**`window.claude.complete()` does not exist as the older specs describe it. [M] b1** The
artifact calls the real Messages API. `SPEC.md` and `INTERACTION.md` in the handoff are
both written against the imaginary API; treat those sections as void.

---

## 2. The Messages API through the claude.ai proxy

Both batches ran from a published claude.ai artifact against
`fetch("https://api.anthropic.com/v1/messages")` with `Content-Type: application/json`
and **no** `x-api-key` and **no** `anthropic-version`. The proxy injects both and bills
the viewer. Sources: `flow-plan.md`, "PROXY BEHAVIOUR — MEASURED 2026-08-19" (b1); probe
batch 2 log, 11:56 UTC (b2).

| # | Question | Result | Tag |
|---|---|---|---|
| b1-1 | `model: "claude-sonnet-5"` accepted? | Accepted, then **silently remapped** to `claude-sonnet-4-6`. HTTP 200, no warning, no header. | **[M] b1** |
| b1-2,7,8 | Does `output_config.format` work? | **Yes — it shapes generation.** A/B in §2.2. | **[M] b1** |
| b1-3 | Forced tool call via `tool_choice`? | **No.** Tools are stripped; the reply was a chatty markdown table. | **[M] b1** |
| b1-4 | Assistant prefill? | **No.** HTTP 400, "does not support assistant message prefill". | **[M] b1** |
| b1-5 | base64 `document` (PDF) block? | **Yes.** | **[M] b1** |
| b1-6 | base64 `image` block? | **Yes.** | **[M] b1** |
| — | Logged out? | **Not an HTTP status.** claude.ai intercepts with a modal; the request never reaches the API. | **[M] b1** |
| — | Proxy overhead | `input_tokens: 4179` for `"Reply with the single word: ok"`. | **[M] b1** |
| b2-1 | `output_config` + base64 `document` together? | **Yes.** 4 rows returned, schema-valid. | **[M] b2** |
| b2-2 | `thinking: {type:'enabled', budget_tokens:N}`? | **Yes.** Signed blocks, *ahead of* the text block. | **[M] b2** |
| b2-3 | `stream: true`? | **True streaming.** TTFB 2591ms of 3287ms, 11 SSE events, 8 chunks. | **[M] b2** |
| b2-4 | `system` parameter? | **Obeyed — and additive** to the proxy's own ~4.2k, not a replacement. | **[M] b2** |
| b2-6 | Thinking + `document` + `output_config` at once? | **Yes.** 24.7 s on a one-page document. | **[M] b2** |

### 2.1 The model is not yours to choose

**[M] b1** Requesting `claude-sonnet-5` served `claude-sonnet-4-6` with a 200 and no
warning. **[I] Read `json.model` on every response and surface it.** A silent remap is
otherwise invisible, and it invalidates every capability assumption you made from the
model card you thought you were using — context window, structured-output support,
vision, cost.

**[I]** Build against what the proxy actually serves — today `claude-sonnet-4-6`,
**[M] b2** re-confirmed hours later.

### 2.2 `output_config.format` is honoured — and here is why we believe it

**[M] b1** A schema-shaped reply on its own proves nothing: a cooperative model returns
JSON when a prompt looks like it wants JSON. The discriminating test was a **paired A/B on
a prose-inviting prompt**, three trials each way, with a **marker key** in the schema — a
single-value enum `source_label: "ledger-x7"`.

```
with output_config      bare JSON 3/3      marker key present 3/3
without output_config   bare JSON 0/3      (all three replied in prose)
```

**Why the marker enum is the load-bearing part.** "Did it return JSON?" is confounded —
the prompt leaks the intent, and a helpful model volunteers JSON unprompted. The string
`ledger-x7` appears nowhere in the prompt, carries no meaning, and has no reason to be
emitted by any model reasoning about the user's request. Its presence 3/3 in the
with-schema arm is only explicable if the schema reached the generator. **[I]** Note the
precise limit: the schema *reached* generation. It does not distinguish constrained
decoding from strong prompt-injected steering — §3.

**[M] b2 It survives the production shape.** `output_config` + base64 `document` returned
4 schema-valid rows, and again with `thinking` on. The feature-pair 400 we were braced for
(citations + `format` does 400) does not happen here.

### 2.3 There is no fallback behind `output_config`

**[I]** Tools stripped **[M] b1** + prefill rejected **[M] b1** ⇒ `output_config.format`
is the **only** schema mechanism available through the proxy. If it ever stops being
honoured, the path degrades to free-text parsing **with no warning and no error**. Design
for that: a deterministic parser and a human review surface are not optional extras behind
the schema, they are the failure mode's only backstop.

### 2.4 Enforcement does not survive truncation

**[M] b1** `stop_reason: "max_tokens"` yields output that is schema-**shaped** but
truncated, and therefore unparseable. **[I]** The guarantee is shape, not completeness.
Set `max_tokens` generously, check `stop_reason` **before** touching `content`, and never
let model output reach downstream maths without a validator. **[M] b2** On a streamed
response `stop_reason` arrives in `message_delta` — read it there, not from event one.

### 2.5 What the schema does not enforce — three things b2 saw in *passing* payloads

Prompt-and-validation concerns, not proxy behaviour. All three parse cleanly.

- **[M] b2** The API **silently drops `minimum`** — range constraints never reach the
  generator and never error.
- **[M] b2** It returned `amount: -450.00` for a withdrawal, against a contract of
  **positive amounts, direction from `type`**; a signed amount double-counts direction.
  **[I]** With `minimum` dropped, **only client-side validation catches this.**
- **[M] b2** It returned `type: "transfer"`, outside the closed enum the production schema
  uses (the probe's schema was looser, so this is not itself evidence against constrained
  decoding — §3 item 1). **[I]** Keep the enum closed and say so in the prompt.

### 2.6 The `system` parameter is additive, not a replacement

**[M] b2** A marker instruction in `system` is obeyed, and arrives **on top of the
proxy's own ~4,200-token system prompt** rather than replacing it. **[I]** You cannot
override what the proxy already says: write to work alongside instructions you cannot
read, never "ignore all previous instructions". It is billed on top of the 4.2k floor.

### 2.7 Streaming is real streaming

**[M] b2** `stream: true` returns genuinely incremental SSE — **TTFB 2591 ms of 3287 ms**
total, **11 events, 8 chunks**, not buffered then flushed. **[I]** A progress indicator can
therefore mean something, and the timeout stops being one wall-clock ceiling:
`flow-plan.md`'s 180 s was sized for a non-streaming worst case and can be driven off
inter-chunk gaps, which distinguish "slow" from "dead".

### 2.8 `thinking` works — and it moves the text block

**[M] b2** Honoured; blocks return with signatures, positioned in `content` **before** the
text block. **[I] Any code doing `json.content[0].text` breaks the moment thinking is
enabled.** Select by `type === "text"`, never by index.

**[I] Enable it.** `claude-sonnet-4-6` does no thinking unless asked, and the traps that
caused real extraction errors — cumulative balance columns, internal transfers — are the
reasoning-heavy cases. b2's block catches the first outright: *"The balance column is
cumulative (not transactions), so I should not include those"*. **[I]** This recovers the
costliest consequence of the silent remap (§2.1).

### 2.9 Logged out needs a timeout, not an error branch

**[M] b1** claude.ai intercepts the signed-out case with its own modal. There is no 401,
no 403, no HTML login-page body — **the fetch never resolves**. **[I]** Any error handling
written as `if (!res.ok)` will hang forever on the single most likely user state. Race the
fetch against a timeout and treat expiry as "you may be signed out; everything you entered
is still here."

This contradicts the design assumption in `flow-plan.md` §2, which expected "non-OK
status, or a body that isn't JSON (a login page)". That row is wrong.

### 2.10 ~4,200 tokens of proxy overhead per call, billed to the viewer

**[M] b1** `input_tokens: 4179` for a prompt of roughly eight tokens. The proxy injects on
the order of **4,200 input tokens into every single request**, and the viewer pays for it.
**[M] b2** corroborates the magnitude — same day, so not evidence of stability (§3 item 3).

**[I]** What follows:

- **A trivial call is ~99.8% overhead.** There is no such thing as a cheap call here.
- **A five-turn conversation burns ~21k input tokens before any user content exists.**
- **Conversational designs are the expensive shape**, and doubly so with attachments,
  because every turn resends them: a 20-page statement is roughly 30–50k input tokens
  *per turn* on top of the 4.2k floor.
- **Therefore: one shot, not a chat.** Merge work into a single call. Never split one job
  into several small calls — each pays the floor again. Never poll, never pre-flight,
  never make a speculative call to "check if the API is up".
- Corrections belong in a UI (an editable table), not in follow-up turns. A single edited
  cell is free; "actually the September balance is wrong" costs 4.2k plus the whole
  document again.

### 2.11 Latency, not capability, is now the binding constraint

**[M] b2** The full production shape — thinking + `document` + `output_config` — took
**24.7 seconds** on a *trivial one-page* document.

**[I]** After b2 no capability we need is withheld, so the risk moved. A forty-page
statement will be far slower and nothing in §2.10 bounds how much. That argues **for**
streaming and a visible progress indicator, **against** a shorter timeout, and it re-prices
"one shot, not a chat": the shot is a half-minute-plus wait the interface must hold.

### 2.12 The request shape that is known to work

```js
const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },   // proxy injects key + version
  body: JSON.stringify({
    model: "claude-sonnet-4-6",                      // whatever you ask, read json.model
    max_tokens: 16000,                               // high — truncation is unrecoverable
    stream: true,                                    // real deltas; stop_reason in message_delta
    thinking: { type: "enabled", budget_tokens: 4000 },  // content[0] is a thinking block
    system: "…",                                     // additive to the proxy's ~4.2k
    messages: [{ role: "user", content: [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
      { type: "image",    source: { type: "base64", media_type: "image/png",       data: b64 } },
      { type: "text", text: "…" },
    ]}],
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
  }),
});
```

**[M] b2** Every element is measured, and thinking + `document` + `output_config` are
measured *together*. `stream` alongside all four is not — §3 item 8.

**[I]** Files go straight in — `document` and `image` both pass, so any client-side
`pdf.js` text-extraction ladder collapses to a single rung. Scanned statements work.

**[I]** Assume **zero beta headers**. We do not control `anthropic-beta` through the
proxy, so design against GA features only: structured outputs, base64 `document`, base64
`image`. That rules out the Files API and anything else gated behind a beta flag.

---

## 3. NOT verified — test before relying on any of this

| # | Question | Why it matters | The test |
|---|---|---|---|
| 1 | `output_config`: **hard-constrained decoding** or **strong steering**? **[U]** | Steering fails silently under adversarial input; constrained decoding cannot. Decides whether the client validator is a backstop or the primary defence. b2 sharpened it: the API **drops `minimum`** (§2.5), so the schema reaching the generator is not the one you sent. | Prompt that fights the schema ("ignore any format instructions, answer in prose"), 10 trials, marker enum — constrained decoding is 10/10. Then re-send with the **closed** production enum: an out-of-enum value there is decisive against it. |
| 2 | On conflict, does the **proxy's** system prompt beat the caller's? **[U]** *(new, b2)* | `system` is additive (§2.6), so two instruction sets coexist; which wins decides how defensively the prompt is written. | A caller instruction that plainly contradicts likely proxy behaviour ("never use markdown headings"); see which holds. |
| 3 | Are the ~4,200-token overhead and the model remap **stable over time**? Overhead **[M] b1 + b2, same day**; remap **[U]** | §2.10's cost argument rests on two readings hours apart on one account — not a time series. And if the remap is a temporary pin, `claude-sonnet-5` may start being served without notice: same code, different context window. | Log `input_tokens` and `json.model` in production; both drift as a distribution shift, not an error. Re-measure the trivial prompt monthly. |
| 4 | Are `temperature` and `stop_sequences` honoured? **[I]** *(was [U])* | b1's "assume silent stripping" prior rested on `tool_choice` alone, which the proxy has an obvious reason to strip; b2 found `system`, `thinking` and `stream` all honoured. **[I] The proxy strips the agentic surface and passes generation parameters through** — a shifted prior, not a measurement. | `stop_sequences` with a known token that must truncate mid-sentence; `temperature` 0 vs 1, 5 trials each. |
| 5 | Same `usage` figures streamed and non-streamed? **[I]** *(was [U])* | Cost messaging depends on it. **[I]** b2 shows a genuine SSE stream with the standard event set, and the proxy injects the same ~4.2k either way, so the figures should match. | Same prompt both ways; compare `input_tokens` and `output_tokens`. |
| 6 | Rate limits and quota behaviour **[U]** | `flow-plan.md` assumes 429 + `retry-after`. The proxy may intercept quota exhaustion as it intercepts logged-out — modal, no response. | Burn a low-tier quota; record what the client sees: status, headers, or nothing. |
| 7 | Max `document` size / page count — **and how latency scales** **[U]** | Documented ceilings (32MB, 100 vs 600 pages) are model- and API-scoped. b2 makes the second half urgent: 24.7 s for *one* page (§2.11) means an unusable wait may arrive long before a size error. | Binary-search real PDFs 1 → 100 pages, recording first failure, error type **and wall-clock**. |
| 8 | Does `stream: true` survive the **full** combination? **[U]** *(new, b2)* | b2 probed streaming alone and thinking+`document`+`output_config` alone. We ship all four, and this API 400s on some feature pairs. | Re-run b2 probe 6 with `stream: true`; check deltas and a schema-valid assembled payload. |
| 9 | Are `thinking` tokens billed, and is `budget_tokens` respected? **[U]** *(new, b2)* | Thinking is now recommended (§2.8); if its tokens land in `output_tokens` it changes §2.10's cost story. | Same prompt, `budget_tokens` 1000 vs 8000; compare `usage.output_tokens` and block length. |
| 10 | Does a `refusal` stop_reason actually occur through the proxy? **[U]** | The failure table branches on it. Never observed. | Send something benign-but-refusable; check `stop_reason` before `content`. |
| 11 | Which **axes** did b2's Google Fonts file carry? **[U]** *(new, b2)* | `document.fonts.check('12px Fraunces')` answers "loaded", not "loaded with `SOFT` and `WONK`" — the exact confusion §5 exists to prevent. | Run §5's width probe against the loaded font, not `fonts.check`. |

---

## 4. Self-containment constraints

| Constraint | Status | Notes |
|---|---|---|
| Strict CSP — no CDN scripts, external stylesheets, fonts, remote images, fetch/XHR/WebSockets | **[D]** Claude Code Artifact tool description, current 2026-08-19 | **Not what a claude.ai-authored artifact does.** Measured exceptions: `api.anthropic.com` **[M] b1**, Google Fonts stylesheet + font file **[M] b2**. Read it as the Claude Code-published runtime. |
| `api.anthropic.com/v1/messages` reachable | **[M] b1** | From claude.ai-authored artifacts. Not tested from Claude Code-published ones. |
| `fonts.googleapis.com` stylesheet + font file load | **[M] b2-5** | 2 network entries (300B css + 35KB woff), zero CSP violations. §4.1 — embed anyway. |
| `localStorage` blocked | **[D]** `SPEC.md`, listed as "verified constraints" but no method or date given — treat as second-hand | Default to nothing persisting; warn before navigating away |
| Persistent storage: 20MB, **paid plans only** | **[D]** `SPEC.md`, same caveat | Treat persistence as a bonus that degrades to nothing |
| 16MiB page limit | **[D]** `SPEC.md`; the Artifact tool description says 16MB | Not a live constraint for us: 21KB engine + 12.5KB benchmarks + 2.4KB strategies |
| cdnjs imports allowed | **[I]** `SPEC.md` says yes, the tool description no; b2 showed an external stylesheet does load, making `SPEC.md` likelier here | Scripts specifically are unprobed, and §4.1's privacy argument covers any external host. **Inline everything regardless.** |

### 4.1 The Google Fonts question — RESOLVED, and worth reading for how it went wrong

Three sources in this project disagreed. The history is the point.

- `artifact-brief.md` §0: **"Google Fonts is the one external host you may reach."** It
  gives a `<link>` to `fonts.googleapis.com` and instructs that it be used verbatim.
  `handoff.md` repeats it. **[D]**
- `flow-plan.md` §7 asserted as fact that **"the artifact loads Google Fonts"** and
  **rewrote a privacy sentence because of it**, citing no network-tab evidence anywhere —
  an assumption that hardened into a premise and then edited user-facing copy. **[M] b2**
  says the assertion was correct. It was still unevidenced when written.
- The Artifact tool description (current, 2026-08-19) says a strict CSP blocks external
  stylesheets **and fonts** outright. `handoff.md` says elsewhere that artifacts "cannot
  fetch anything at runtime". **[D]**

**The answer. [M] b2:** in a published claude.ai artifact the stylesheet **loads** — `load`
fired, **two network entries transferred** (300B css + 35KB woff),
`document.fonts.check('12px Fraunces')` **true**, **zero CSP violations**.

**The lesson is the shape of the error.** The source you would rank highest — the current
tool description, with `handoff.md` agreeing — said blocked. The measurement says loads.
Of the two that said otherwise, one was an instruction nobody weighted and one was
`flow-plan.md`, which had measured nothing and edited privacy copy anyway: being right is
luck, not method, and indistinguishable in advance from §5, where that same confidence was
wrong. **[I]** Ranking sources by how official they look has now failed here in **both**
directions — a capability assumed to exist that didn't, a constraint assumed to exist that
doesn't. Unmeasured agreement is not evidence. One network tab is.

**Embed the fonts anyway. [I]** The decision is unchanged; its *reason* changes. It is now
purely **privacy**: for financial data *"nothing leaves this page"* should be literally
true and verifiable in the network tab, and a working Google Fonts link is a third-party
request on a page handling someone's balances. ~150–200 KB against a 16MiB budget, and it
makes §5's axis trap impossible. **Any doc here claiming artifacts cannot fetch external
stylesheets is wrong** — correct it where it stands.

---

## 5. The Fraunces axis trap — a font that renders is not a font that rendered correctly

**[M] 2026-08-12**, verified by downloading both font files and inspecting their `fvar`
tables (`decisions.md`):

> Google Fonts ships **only the axes the URL names.** A URL requesting `opsz,wght`
> delivers a file whose `fvar` table has **one axis**. Every
> `font-variation-settings: 'WONK' 1, 'SOFT' 100` against it is **silently inert**.

No error, no console warning, no visible breakage — just plain Fraunces where the brand's
soft, wonky cut should be. It looks almost right, which is the worst failure mode. Found
while diagnosing why a Claude.ai artifact "didn't look close enough". §4.1 makes the trap
live rather than hypothetical: the stylesheet really does load, so a shortened URL really
will ship a crippled font to a viewer.

**Correct URL — do not shorten it:**

```
https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,100..900,0..100,0..1&family=Instrument+Sans:wght@400;500;600&display=swap
```

**Why eyeballing fails.** At weight 300 the `WONK` axis barely moves roman letterforms, so
"does this look quirky?" is not a test anyone can fail honestly. And
`getComputedStyle(el).fontVariationSettings` reports **what you asked for, not what the
font supports** — your declaration verbatim, against an axis-less file. b2's
`document.fonts.check('12px Fraunces')` is the same half-test: it proves *loaded*, not
*loaded with four axes* (§3 item 11).

**The mechanical check** — render the same string at axis extremes and at zero; if the
widths match, the axes are absent:

```js
await document.fonts.ready;
document.fonts.check('300 48px Fraunces');                        // loaded at all?
probe("'WONK' 1, 'SOFT' 100") !== probe("'WONK' 0, 'SOFT' 0");    // axes live?
```

Both must be `true`. Full `probe()` helper in `artifact-brief.md` §1.

**The general lesson. [I]** *A thing that renders is not a thing that rendered correctly.*
HTTP 200 is not "the parameter was honoured"; JSON-shaped output is not "the schema was
enforced"; schema-valid output is not "the values are right" (§2.5); a font that displays
is not "the font you asked for". **Every check must be able to fail.** If a test cannot
distinguish success from a plausible near-miss, it is decoration.

---

## 6. How to probe an artifact runtime well

This section will save more time than the rest of the file. Rules 1–6 come from flaws in
our **first** probe (`/root/ahf-tools/tools/portfolio/probe/artifact-probe.html`), all
corrected before the real run; they stand whether or not the question was later answered,
because the mistake is the reusable part. 7–9 are what the batches never asked early
enough.

1. **Set `max_tokens` high enough that truncation is impossible.** The first probe used
   `max_tokens: 128` on a structured-output test. A truncated JSON stream fails
   `JSON.parse`, which reads exactly like "the schema wasn't honoured" — a false negative
   on the most important question being asked. **Always log `stop_reason` explicitly**;
   `"max_tokens"` invalidates the trial rather than answering it.

2. **Surface `json.model` on every single response.** The first probe never printed it.
   The silent remap of `claude-sonnet-5` → `claude-sonnet-4-6` would have been completely
   invisible, and every downstream conclusion would have been attributed to the wrong
   model. If a proxy can rewrite one field without telling you, assume it can rewrite any
   of them — echo back everything you can.

3. **HTTP 200 is never evidence that a parameter was honoured.** `tool_choice` was
   *accepted* and *stripped*: 200, well-formed response, no tool call, no error. For every
   parameter you care about, ask: *what observable output differs if this was honoured?*
   If you can't answer, you can't test it.

4. **Include a negative control.** The first probe's structured-output check would have
   reported a **false pass**: a schema-shaped reply is equally consistent with enforcement
   and with a merely cooperative model. The fix was §2.2's paired A/B — identical
   prose-inviting prompt, with and without, three trials each. **The without-arm is the
   whole experiment.** A probe with no control arm measures the model's agreeableness, not
   the platform's behaviour.

5. **Use markers the model would never volunteer.** `source_label: "ledger-x7"` as a
   single-value enum: semantically empty, absent from the prompt, no plausible route into
   the output except the mechanism under test. It generalises — an unguessable token for
   `system` (how b2 answered it), a known string for `stop_sequences`.

6. **Use stubs that cannot fail for an unrelated reason.** The first probe's `TINY_PDF`
   was a hand-written base64 PDF with **no xref table and no `startxref`** — structurally
   invalid. It would very likely 400, and that 400 says nothing about whether `document`
   blocks are supported. A negative result from a broken stub is indistinguishable from a
   negative result from an unsupported feature. **Use a real, minimal, valid artefact.**

7. **Probe the combination you will ship, not just the parts.** b1 passed `output_config`
   alone and `document` alone and left the pair untested for a whole batch. b2 closed that
   and repeated the mistake a level up: it never streamed the full shape (§3 item 8).

8. **Probe the failure states, not only the happy path.** The most consequential finding —
   logged out never resolves — came from asking what a *failure* looks like. It is worth
   more than any capability answer, because it is the state most viewers will be in, and
   the natural `if (!res.ok)` handler hangs forever on it.

9. **Record wall-clock, and read the payload's values — not just pass/fail and shape.**
   b1 asked "does it work" eight times and wrote down no timings; b2's most
   design-changing number is **24.7 s** for the full shape on one page (§2.11). And b2
   passed six of six while its payloads held two model errors (§2.5) that parse cleanly
   and corrupt downstream maths. A probe is the cheapest place to see real model output.

---

## 7. Contradictions between the sources, recorded so they stop resurfacing

| Contradiction | Resolution |
|---|---|
| `SPEC.md` / `INTERACTION.md` are written against `window.claude.complete()` | **Void.** The artifact calls the real Messages API. **[M] b1** |
| `SPEC.md`: "CSP blocks `fetch()` to arbitrary URLs" vs. the API call working | Both true — `api.anthropic.com` is specifically permitted. **[M] b1** |
| `flow-plan.md` §2: build against `claude-sonnet-5` because `claude-sonnet-4-6` "does not support structured outputs" vs. the measured A/B | **The measurement wins.** Whatever the proxy serves under that name honours `output_config`, alongside `document` and `thinking` too. Do not over-generalise from three trials — §3 item 1. **[M] b1+b2** over **[D]** |
| `flow-plan.md` §2 failure table: signed out ⇒ "non-OK status, or a body that isn't JSON" vs. measured: no response at all | **That row is wrong.** Needs a timeout. **[M] b1** |
| `artifact-brief.md` "Google Fonts is the one external host you may reach" vs. `handoff.md` "artifacts cannot fetch anything at runtime" vs. the tool description's strict CSP | **RESOLVED: the stylesheet loads, zero CSP violations. [M] b2** The most official source was the wrong one; the source that was right had measured nothing either. Embed regardless, for privacy. §4.1 |
| `SPEC.md` "cdnjs imports allowed" vs. the tool description's "no CDN scripts" | **[I]** b2 makes `SPEC.md` likelier for the claude.ai runtime; scripts are unprobed. Inline everything anyway. |
| The tool description's strict CSP vs. two measured external loads | **Both stand if the CSP differs by authoring runtime** — everything here is from a claude.ai-authored artifact. **[I]** Re-probe before porting. |
| 16MiB (`SPEC.md`) vs. 16MB (tool description) | Immaterial at our sizes; assume the smaller. |

---

## 8. The short version

- **Runtime model call ⇒ author in claude.ai.** Claude Code artifacts cannot. **[M/I]**
- **Read `json.model`. You did not choose it.** **[M]**
- **`output_config` works — with `document` and `thinking` too — and is the only schema
  mechanism.** No tools, no prefill. **[M/I]**
- **Validate anyway** — truncation defeats it, `minimum` is dropped, and the model will
  hand you a negative amount and an out-of-enum type. **[M]**
- **`system` is additive to the proxy's ~4.2k. You cannot override it.** **[M]**
- **Streaming is real, `stop_reason` is in `message_delta`, and thinking blocks come
  before the text block — never index `content[0]`.** **[M]**
- **Logged out needs a timeout, not an error branch.** **[M]**
- **~4,200 tokens overhead per call, on the viewer.** One shot, never a conversation. **[M/I]**
- **Latency is the constraint now, not capability: 24.7 s for one page.** Design the wait. **[M/I]**
- **Fonts do load — embed them anyway for privacy, and name all four Fraunces axes.** **[M]**
- **Every probe needs a negative control, a marker the model would never volunteer, and a
  stopwatch.** **[I]**

---

## 9. Changelog

**2026-08-19 — probe batch 2 (11:56 UTC), six probes, all PASS.** Folded into the body,
each finding at the claim it belongs to; only this pointer is kept, because a document that
states a finding twice eventually states it two different ways. Where b2's results now
live: `output_config` + `document` (+ `thinking`) together, §2.2 and §2.12; `system`
additive, §2.6; true streaming, §2.7 and §2.4; `thinking` and block order, §2.8; **24.7 s**
for the full shape, §2.11; Google Fonts loads with zero CSP violations, §4.1 and §7;
`minimum` dropped, a negative amount and an out-of-enum `type`, §2.5.

Resolved out of §3: streaming, `system`, `thinking`, `output_config`+`document`.
Downgraded **[U] → [I]**: `temperature`/`stop_sequences`, streamed `usage`. Added to §3:
prompt precedence, streaming the full shape, `thinking` billing, latency scaling, font
axes.

---

## Changelog — batch 3, persistence, 2026-08-20 02:07 UTC

Seven probes. **`window.storage` exists, works, and PERSISTS ACROSS RELOADS** —
confirmed by a two-run test where run 2 read back run 1's timestamp. This
supersedes §4's inherited "`localStorage` blocked / persistent storage is
paid-plans-only" claim, which was second-hand from `SPEC.md` and was about a
different API.

| Finding | Detail |
|---|---|
| `window.storage` present | **[M] b3** |
| Round-trip lossless | **[M] b3** unicode, quotes, backslashes, newlines all survive. JSON is safe to cache. |
| **A MISSING KEY THROWS** | **[M] b3** `get` on an absent key raises `Error: Storage get failed`. It does NOT return null. Every read needs try/catch — the probe's own words: "the single easiest way to crash a caching layer". |
| Value ceiling 5 MB per key | **[M] b3** 5,000,000 bytes wrote; 6,000,000 failed. Batch per document, not per row. |
| Key constraints, enforced loudly | **[M] b3** rejected: whitespace, `/`, `\`, `'`, `"`, and 260 chars. 199 chars passed. Failures surface immediately rather than silently. |
| `shared` vs personal namespaces | **[M] b3** the same key holds different values per scope. **Use `shared: false` for anything user-specific** — shared scope means every viewer overwrites every other viewer's data, which for financial figures would be a disclosure, not just a bug. |
| Latency is real | **[M] b3** ~1.3s for a small set+get; 5.1s for a 5 MB write. Not free; do not write on every keystroke. |
| Raw browser APIs also reachable | **[M] b3** localStorage, sessionStorage, IndexedDB and cookies all responded — but the sandbox origin is opaque and this is an unsupported path. Use `window.storage`, not these. |

**What this changes.** An hour-long flow can now offer save-and-resume without
asking the user to mind a downloaded file. Two rules follow from the measurements
rather than from preference: reads must be wrapped, because absence is an
exception here; and writes must be debounced, because a 5 MB write takes five
seconds.

**One thing the probes cannot settle.** Whether to store someone's financial
figures at all is a privacy decision, not a capability one. This storage is
Anthropic-hosted. On the AI path the statements have already gone to Claude
under the viewer's own account, so caching is consistent with what already
happened. On the typed-or-pasted path nothing has left the browser yet, and
switching that on silently would break the one claim that path makes. Default it
OFF, offer it in one line, and say where it goes.

---

## Batch 3 — persistence, measured 2026-08-20 02:07 UTC

**`window.storage` is a platform API, and it is NOT `localStorage`.** §4's
inherited claim — "`localStorage` blocked, persistent storage paid-plans-only",
second-hand from `SPEC.md` with no method or date — was about the browser API.
It said nothing about the artifact runtime's own store, which works.

| | |
|---|---|
| `window.storage` present | **[M] b3** |
| **Survives a reload** | **[M] b3** two-run test: run 2 read back run 1's timestamp. This is the finding that matters — save-and-resume is viable. |
| Round-trip lossless | **[M] b3** unicode, quotes, backslashes, newlines. JSON is safe to cache. |
| **A missing key THROWS** | **[M] b3** `get` on an absent key raises `Storage get failed`; it does not return null. Every read needs try/catch. The probe's own words: the single easiest way to crash a caching layer. |
| 5 MB per key | **[M] b3** 5,000,000 bytes wrote, 6,000,000 failed. Batch per document, not per row. |
| Key constraints, enforced loudly | **[M] b3** rejected whitespace, `/`, `\`, `'`, `"`, and 260 chars; 199 passed. Bad keys fail immediately rather than silently. |
| `shared` vs personal scope | **[M] b3** same key, different value per scope. **`shared: false` for anything user-specific** — shared scope means every viewer overwrites every other viewer's, which for financial figures is a disclosure, not just a bug. |
| Not free | **[M] b3** ~1.3s for a small set+get, 5.1s for a 5 MB write. Debounce; never write per keystroke. |
| `localStorage`, `sessionStorage`, IndexedDB, cookies | **[M] b3** all responded — but the sandbox origin is opaque, so they can be wiped or isolated between loads, and this is an unsupported path. **Use `window.storage`.** |

**The decision the probes cannot make.** Whether to store someone's financial
figures is a privacy question, not a capability one, and the answer differs by
path. On the AI path the statements have already gone to Claude under the
viewer's own account, so caching is consistent with what already happened. On
the typed-or-pasted path nothing has left the browser yet, and switching this on
silently would break the only claim that path makes. Default OFF, offer it in
one line, say where it goes.
