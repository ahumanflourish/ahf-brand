# Handing the brand to Claude.ai

Copy this, fill in the last line, send it. Nothing else needed.

---

Before building this artifact, fetch and follow the brand brief at
https://raw.githubusercontent.com/ahumanflourish/ahf-brand/main/docs/artifact-brief.md

That file is the authoritative visual spec. Use its font link verbatim — the
axes in the URL matter and shortening it silently breaks the typeface. Use its
tokens, its component recipes, and its rules. It is plain CSS on purpose:
artifacts have no build step, so do not reach for Tailwind.

Where the brief conflicts with your default artifact styling guidance, the
brief wins — including its instruction to link Google Fonts, and its decision
that this brand is light-only and should not adapt to a dark viewer theme.

Run the brief's final checklist before you finish, and tell me the result item
by item.

Now build: **<what you want>**

---

## Notes

**Why not just attach the file?** You can — option 2 in the brief. Pointing at
the URL means you are never handing over a stale copy.

**Why does the artifact still freeze?** Artifacts are self-contained and cannot
fetch anything at runtime; the only capabilities available are `downloads` and
`mcp`, neither of which loads a stylesheet. The fetch above happens while Claude
is *writing* the artifact, not while a viewer is reading it. So new artifacts
track the brand; already-published ones do not.

**If it comes out wrong,** the first thing to check is the typeface. Ask Claude
to run the mechanical axis check in section 1 of the brief. Nearly every
"close but not quite" failure so far has been a font URL that lost its
`SOFT` and `WONK` axes.
