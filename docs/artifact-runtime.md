# The Claude.ai artifact runtime — what we have actually verified

Written 2026-08-19. Audience: someone about to build their second artifact in this
project. Read time: five minutes. Everything here is specific to the artifact runtime;
nothing here restates the general Messages API docs.

**Every claim carries a confidence tag. Nothing is unlabelled.**

| Tag | Means |
|---|---|
| **[M]** MEASURED | Observed in a real run. The date and the method are given. |
| **[I]** INFERRED | A conclusion drawn from measurements, not itself observed. |
| **[D]** DOCUMENTED | From Anthropic docs or tool descriptions. Not tested here. |
| **[U]** UNRESOLVED | Two sources disagree, or nobody has checked. A test is given. |

This project has been bitten twice by a plausible-sounding untested statement: a
documented Google Fonts URL that silently shipped a font missing two axes, and a probe
whose verdict logic would have passed a test its own data could not support. Hence the
tags. **Do not add a claim to this file without one.**

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
- **[M]** 2026-08-19, from a published claude.ai artifact: `fetch` to
  `https://api.anthropic.com/v1/messages` succeeds and is billed to the viewer.
- **[I]** **Consequence: any artifact that needs a runtime model call must be authored in
  claude.ai.** There is no Claude Code capability that substitutes.

**The workflow that follows.** Keep the artifact source in the repo. Build and preview
locally with a dev-only shim that intercepts `fetch` for the Messages API URL and adds
`x-api-key` + `anthropic-version: 2023-06-01`. The source then stays byte-identical
between repo and claude.ai — nothing to strip on the way over, and the file is
version-controlled even though publication is a manual paste. **[I]**

**`window.claude.complete()` does not exist as the older specs describe it. [M]** The
artifact calls the real Messages API. `SPEC.md` and `INTERACTION.md` in the handoff are
both written against the imaginary API; treat those sections as void.

---

## 2. The Messages API through the claude.ai proxy

All of §2 was **measured 2026-08-19**, eight probes from a published claude.ai artifact
against `fetch("https://api.anthropic.com/v1/messages")` with `Content-Type: application/json`
and **no** `x-api-key` and **no** `anthropic-version`. The proxy injects both and bills
the viewer. Source: `flow-plan.md`, "PROXY BEHAVIOUR — MEASURED 2026-08-19".

| # | Question | Result | Tag |
|---|---|---|---|
| 1 | `model: "claude-sonnet-5"` accepted? | Accepted, then **silently remapped** to `claude-sonnet-4-6`. HTTP 200, no warning, no header. | **[M]** |
| 2,7,8 | Does `output_config.format` work? | **Yes — it shapes generation.** A/B below. | **[M]** |
| 3 | Forced tool call via `tool_choice`? | **No.** Tools are stripped; the reply was a chatty markdown table. | **[M]** |
| 4 | Assistant prefill? | **No.** HTTP 400, "does not support assistant message prefill". | **[M]** |
| 5 | base64 `document` (PDF) block? | **Yes.** | **[M]** |
| 6 | base64 `image` block? | **Yes.** | **[M]** |
| — | Logged out? | **Not an HTTP status.** claude.ai intercepts with a modal; the request never reaches the API. | **[M]** |
| — | Proxy overhead | `input_tokens: 4179` for `"Reply with the single word: ok"`. | **[M]** |

### 2.1 The model is not yours to choose

**[M]** Requesting `claude-sonnet-5` served `claude-sonnet-4-6` with a 200 and no
warning. **[I] Read `json.model` on every response and surface it.** A silent remap is
otherwise invisible, and it invalidates every capability assumption you made from the
model card you thought you were using — context window, structured-output support,
vision, cost.

**[I]** Build against what the proxy actually serves, not what you requested. Today that
is `claude-sonnet-4-6`.

### 2.2 `output_config.format` is honoured — and here is why we believe it

**[M]** A schema-shaped reply on its own proves nothing: a cooperative model returns JSON
when a prompt looks like it wants JSON. The discriminating test was a **paired A/B on a
prose-inviting prompt**, three trials each way, with a **marker key** in the schema — a
single-value enum `source_label: "ledger-x7"`.

```
with output_config      bare JSON 3/3      marker key present 3/3
without output_config   bare JSON 0/3      (all three replied in prose)
```

**Why the marker enum is the load-bearing part.** "Did it return JSON?" is confounded —
the prompt itself leaks the intent, and a helpful model volunteers JSON unprompted. The
string `ledger-x7` appears nowhere in the prompt, carries no meaning, and has no reason
to be emitted by any model reasoning about the user's request. Its presence 3/3 in the
with-schema arm is only explicable if the schema reached the generator. That converts a
weak, confounded question into a near-unconfoundable one. **[I]** Note the precise limit
of what it proves: the schema *reached* generation. It does not distinguish constrained
decoding from strong prompt-injected steering — see §3.

### 2.3 There is no fallback behind `output_config`

**[I]** Tools stripped **[M]** + prefill rejected **[M]** ⇒ `output_config.format` is the
**only** schema mechanism available through the proxy. If it ever stops being honoured,
the path degrades to free-text parsing **with no warning and no error**. Design for that:
a deterministic parser and a human review surface are not optional extras behind the
schema, they are the failure mode's only backstop.

### 2.4 Enforcement does not survive truncation

**[M]** `stop_reason: "max_tokens"` yields output that is schema-**shaped** but truncated,
and therefore unparseable. **[I]** The structured-output guarantee is shape, not
completeness. Set `max_tokens` generously, check `stop_reason` **before** touching
`content`, and never let model output reach downstream maths without passing a validator.

### 2.5 Logged out needs a timeout, not an error branch

**[M]** claude.ai intercepts the signed-out case with its own modal. There is no 401,
no 403, no HTML login-page body — **the fetch never resolves**. **[I]** Any error handling
written as `if (!res.ok)` will hang forever on the single most likely user state. Race the
fetch against a timeout and treat expiry as "you may be signed out; everything you entered
is still here."

This directly contradicts the earlier design assumption in `flow-plan.md` §2, which
expected "non-OK status, or a body that isn't JSON (a login page)". That row is wrong.

### 2.6 ~4,200 tokens of proxy overhead per call, billed to the viewer

**[M]** `input_tokens: 4179` for a prompt of roughly eight tokens. So the proxy injects
something on the order of **4,200 input tokens into every single request**, and the
viewer pays for it.

**[I]** What follows:

- **A trivial call is ~99.8% overhead.** There is no such thing as a cheap call here.
- **A five-turn conversation burns ~21k input tokens before any user content exists.**
- **Conversational designs are the expensive shape**, and doubly so with attachments,
  because every turn resends them: a 20-page statement is roughly 30–50k input tokens
  *per turn* on top of the 4.2k floor.
- **Therefore: one shot, not a chat.** Merge work into a single call. Never split one job
  into several small calls — each pays the floor again. Never poll, never pre-flight,
  never make a speculative call to "check if the API is up".
- **[I]** Corrections belong in a UI (an editable table), not in follow-up turns. A
  single edited cell is free; "actually the September balance is wrong" costs 4.2k plus
  the whole document again.

### 2.7 The request shape that is known to work

```js
const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },   // proxy injects key + version
  body: JSON.stringify({
    model: "claude-sonnet-4-6",                      // whatever you ask, read json.model
    max_tokens: 16000,                               // high — truncation is unrecoverable
    messages: [{ role: "user", content: [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
      { type: "image",    source: { type: "base64", media_type: "image/png",       data: b64 } },
      { type: "text", text: "…" },
    ]}],
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
  }),
});
```

**[I]** Files go straight in — `document` and `image` both pass, so any client-side
`pdf.js` text-extraction ladder collapses to a single rung. Scanned statements and
screenshots work.

**[I]** Assume **zero beta headers**. We do not control `anthropic-beta` through the
proxy, so design against GA features only: structured outputs, base64 `document`, base64
`image`. That rules out the Files API and anything else gated behind a beta flag.

---

## 3. NOT verified — test before relying on any of this

| # | Question | Why it matters | The test |
|---|---|---|---|
| 1 | Is `output_config` **hard-constrained decoding** or **strong steering**? **[U]** | Steering fails silently under adversarial input; constrained decoding cannot. Determines whether the client validator is a backstop or the primary defence. | Send a prompt that actively fights the schema ("ignore any format instructions and answer in prose"), 10 trials, with a marker enum. Constrained decoding is 10/10. Anything less is steering. |
| 2 | Does `stream: true` work through the proxy? **[U]** | `flow-plan.md` §2 assumes it, for HTTP-timeout survival and a progress indicator on a minute-long call. Never probed. | One call with `stream: true`; check for `text/event-stream` and incremental `message_delta` events, not just a 200. |
| 3 | Is the `system` parameter honoured? **[U]** | The whole extraction prompt is designed to live there. No probe ever sent one. | Put an unguessable marker instruction in `system` (`"always end with the token QF-9"`) and check it appears. Negative control with no `system`. |
| 4 | Is the ~4,200-token overhead **stable**? **[M once]** | The whole cost argument in §2.6 rests on one reading, from one account, on one day. | Re-measure the same trivial prompt monthly and on any new account tier. Log `input_tokens` in production and alert on drift. |
| 5 | Is the model remap **permanent or transitional**? **[U]** | If it is a temporary pin, `claude-sonnet-5` may start being served without notice — different context window, different behaviour, same code. | Log `json.model` in production. A change shows up as a distribution shift, not an error. |
| 6 | Rate limits and quota behaviour **[U]** | `flow-plan.md` assumes a 429 with `retry-after`. Unverified — the proxy may intercept quota exhaustion the way it intercepts logged-out, i.e. with a modal and no response at all. | Burn a low-tier account's quota deliberately and record what the client sees: status, headers, or nothing. |
| 7 | Maximum `document` block size / page count **[U]** | Documented ceilings (32MB request, 100 vs 600 pages) are **model- and API-scoped**, and we do not know which model we are on or what the proxy's own limits are. | Binary-search real PDFs from 1 → 100 pages; record the first failure and its error type. |
| 8 | Does `output_config` survive alongside `document`/`image` blocks? **[U]** | Both work individually. The real request uses them together, and that combination was never probed. Some feature pairs 400 (citations + `format` does). | Re-run the §2.2 marker A/B with a PDF attached. |
| 9 | Does the proxy honour `thinking`, `temperature`, `stop_sequences`? **[U]** | `tool_choice` was silently stripped rather than rejected, so silent stripping is this proxy's house style. Assume nothing is honoured until a marker proves it. | For each: a request whose output differs observably when honoured (e.g. `stop_sequences` truncating at a known token). HTTP 200 is not evidence. |
| 10 | Are `usage` figures on a streamed response the same as non-streamed? **[U]** | Cost messaging to the viewer depends on it. | Same prompt both ways, compare `input_tokens`. |
| 11 | Does a `refusal` stop_reason actually occur through the proxy? **[U]** | The failure table branches on it. Never observed here. | Send something benign-but-refusable and check `stop_reason` before `content`. |

---

## 4. Self-containment constraints

| Constraint | Status | Notes |
|---|---|---|
| Strict CSP — no CDN scripts, external stylesheets, fonts, remote images, fetch/XHR/WebSockets | **[D]** Claude Code Artifact tool description, current 2026-08-19 | The one measured exception is `api.anthropic.com` from a claude.ai-authored artifact **[M]** |
| `api.anthropic.com/v1/messages` reachable | **[M]** 2026-08-19 | From claude.ai-authored artifacts. Not tested from Claude Code-published ones. |
| `localStorage` blocked | **[D]** `SPEC.md`, listed as "verified constraints" but no method or date given — treat as second-hand | Default to nothing persisting; warn before navigating away |
| Persistent storage: 20MB, **paid plans only** | **[D]** `SPEC.md`, same caveat | Treat persistence as a bonus that degrades to nothing |
| 16MiB page limit | **[D]** `SPEC.md`; the Artifact tool description says 16MB | Not a live constraint for us: 21KB engine + 12.5KB benchmarks + 2.4KB strategies |
| cdnjs imports allowed | **[U]** — `SPEC.md` says yes, the current tool description says CDN scripts are blocked | Do not rely on it. Inline everything. Test: publish a page whose only external reference is a cdnjs script and watch the network tab. |

### 4.1 The Google Fonts contradiction — UNRESOLVED, do not paper over it

Three sources in this project disagree, and one of them is our own brand brief:

- `artifact-brief.md` §0: **"Google Fonts is the one external host you may reach."** It
  then gives a `<link>` to `fonts.googleapis.com` and instructs that it be used verbatim.
  `handoff.md` repeats the instruction. **[D]**
- `flow-plan.md` §7 asserts as fact that **"the artifact loads Google Fonts"**, and
  rewrites a privacy sentence because of it. **[U]** — no network-tab evidence is cited
  anywhere; it reads as an assumption that hardened into a premise.
- The Artifact tool description (current, 2026-08-19) says a strict CSP blocks external
  stylesheets **and fonts** outright. `handoff.md` itself says elsewhere that artifacts
  "cannot fetch anything at runtime". **[D]**

**These cannot all be true. Status: [U] UNRESOLVED.** It is possible the CSP differs
between claude.ai-authored and Claude Code-published artifacts — the Messages API
exception shows the two runtimes are not identical — but nobody has checked.

**The test that settles it.** Publish a page linking the Google Fonts stylesheet and
nothing else external. Then, in the artifact viewer:

1. Network tab — did the request to `fonts.googleapis.com` fire, or was it CSP-blocked?
2. Console — a CSP violation is reported there even when the page looks fine.
3. `await document.fonts.ready; document.fonts.check('300 48px Fraunces')` — `false`
   means it silently fell back to the serif stack.

Run all three. The page **looking right is not the test** — a Georgia fallback at weight
300 is not obviously wrong at a glance.

**Regardless of the answer, embed the fonts. [I]** This project already decided to
(`fin-review-plan.md`): for financial data, *"nothing leaves this page"* should be
literally true and verifiable in the network tab, not nearly true. That is a **privacy
argument and it is independent of whether the link works** — a working link is a
third-party request on a page handling someone's account balances. Cost: ~150–200 KB
against a 16MiB budget. Embedding also makes the axis trap in §5 impossible.

---

## 5. The Fraunces axis trap — a font that renders is not a font that rendered correctly

**[M] 2026-08-12**, verified by downloading both font files and inspecting their `fvar`
tables (`decisions.md`):

> Google Fonts ships **only the axes the URL names.** A URL requesting `opsz,wght`
> delivers a file whose `fvar` table has **one axis**. Every
> `font-variation-settings: 'WONK' 1, 'SOFT' 100` against it is **silently inert**.

No error, no console warning, no visible breakage — just plain Fraunces where the brand's
soft, wonky cut should be. It looks almost right, which is the worst failure mode. Found
while diagnosing why a Claude.ai artifact "didn't look close enough". That was why.

**Correct URL — do not shorten it:**

```
https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,100..900,0..100,0..1&family=Instrument+Sans:wght@400;500;600&display=swap
```

**Why eyeballing fails.** At weight 300 the `WONK` axis barely moves roman letterforms,
so "does this look quirky?" is not a test anyone can fail honestly. And
`getComputedStyle(el).fontVariationSettings` reports **what you asked for, not what the
font supports** — it returns your declaration verbatim against an axis-less file. It
proves nothing.

**The mechanical check** — render the same string at axis extremes and at zero; if the
widths match, the axes are absent:

```js
await document.fonts.ready;
document.fonts.check('300 48px Fraunces');                        // loaded at all?
probe("'WONK' 1, 'SOFT' 100") !== probe("'WONK' 0, 'SOFT' 0");    // axes live?
```

Both must be `true`. Full `probe()` helper in `artifact-brief.md` §1.

**The general lesson. [I]** *A thing that renders is not a thing that rendered correctly.*
The same shape recurs everywhere in this runtime: HTTP 200 is not "the parameter was
honoured"; JSON-shaped output is not "the schema was enforced"; a font that displays is
not "the font you asked for". **Every check must be able to fail.** If a test cannot
distinguish success from a plausible near-miss, it is decoration.

---

## 6. How to probe an artifact runtime well

This section will save more time than the rest of the file. It is drawn from the flaws in
our first probe (`/root/ahf-tools/tools/portfolio/probe/artifact-probe.html`), all
corrected before the real run.

**Six rules.**

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
   *accepted* and *stripped*: 200, well-formed response, no tool call, no error. Silent
   stripping is this proxy's house style. For every parameter you care about, ask: *what
   observable output differs if this was honoured?* If you can't answer, you can't test it.

4. **Include a negative control.** The first probe's structured-output check would have
   reported a **false pass**: a schema-shaped reply is equally consistent with enforcement
   and with a merely cooperative model. The fix was the paired A/B of §2.2 — identical
   prose-inviting prompt, with and against without, three trials each. **The
   without-arm is the whole experiment.** A probe with no control arm measures the model's
   agreeableness, not the platform's behaviour.

5. **Use markers the model would never volunteer.** `source_label: "ledger-x7"` as a
   single-value enum. A marker must be semantically empty, absent from the prompt, and
   have no plausible route into the output except the mechanism under test. This is the
   cheapest way to turn a confounded question into a clean one, and it generalises: an
   unguessable token for `system`, a known string for `stop_sequences`, a nonsense field
   name for schema enforcement.

6. **Use stubs that cannot fail for an unrelated reason.** The first probe's `TINY_PDF`
   was a hand-written base64 PDF with **no xref table and no `startxref`** — a
   structurally invalid file. It would very likely 400, and that 400 says nothing
   whatsoever about whether `document` blocks are supported. A negative result from a
   broken stub is indistinguishable from a negative result from an unsupported feature.
   **Use a real, minimal, valid artefact** produced by a real tool.

**Two more, from what the probe never asked.**

7. **Probe the combination you will actually ship, not just the parts.** `output_config`
   passed alone and `document` passed alone; the real request uses both together and that
   was never tested. Feature pairs do 400 in this API.

8. **Probe the failure states, not only the happy path.** The single most consequential
   finding — logged out never resolves — came from asking what a *failure* looks like.
   That one is worth more than any of the capability answers, because it is the state most
   viewers will be in, and the natural `if (!res.ok)` handler hangs forever on it.

---

## 7. Contradictions between the sources, recorded so they stop resurfacing

| Contradiction | Resolution |
|---|---|
| `SPEC.md` / `INTERACTION.md` are written against `window.claude.complete()` | **Void.** The artifact calls the real Messages API. **[M]** |
| `SPEC.md`: "CSP blocks `fetch()` to arbitrary URLs" vs. the API call working | Both true. `api.anthropic.com` is specifically permitted; everything else is not. **[M]** |
| `flow-plan.md` §2: build against `claude-sonnet-5` because `claude-sonnet-4-6` "does not support structured outputs" vs. the measured A/B, in which the served `claude-sonnet-4-6` honoured `output_config` 3/3 | **The measurement wins.** Whatever the proxy serves under that name honours `output_config`. But do not over-generalise from three trials — see §3 item 1. **[M]** over **[D]** |
| `flow-plan.md` §2 failure table: signed out ⇒ "non-OK status, or a body that isn't JSON" vs. measured: no response at all | **That table row is wrong.** Needs a timeout. **[M]** |
| `artifact-brief.md` "Google Fonts is the one external host you may reach" vs. `handoff.md` "artifacts cannot fetch anything at runtime" vs. the tool description's strict CSP | **[U] UNRESOLVED.** See §4.1 for the test. Embed the fonts regardless. |
| `SPEC.md` "cdnjs imports allowed" vs. the tool description's "no CDN scripts" | **[U] UNRESOLVED.** Inline everything; do not rely on either. |
| 16MiB (`SPEC.md`) vs. 16MB (tool description) | Immaterial at our sizes; assume the smaller. |

---

## 8. The short version

- **Runtime model call ⇒ author in claude.ai.** Claude Code artifacts cannot. **[M/I]**
- **Read `json.model`. You did not choose it.** **[M]**
- **`output_config` works and is the only schema mechanism.** No tools, no prefill. **[M/I]**
- **Validate anyway** — truncation defeats it. Check `stop_reason` before `content`. **[M]**
- **Logged out needs a timeout, not an error branch.** **[M]**
- **~4,200 tokens overhead per call, on the viewer.** One shot, never a conversation. **[M/I]**
- **Inline everything, embed the fonts.** **[D/I]**
- **Name all four Fraunces axes, then verify mechanically.** **[M]**
- **Every probe needs a negative control and a marker the model would never volunteer.** **[I]**
