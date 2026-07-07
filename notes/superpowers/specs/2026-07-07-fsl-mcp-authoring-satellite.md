# fsl-mcp — the FSL authoring MCP satellite

Status: draft
Author: Claude (Opus 4.8), with John
Date: 2026-07-07
Open questions: package name (`fsl-mcp` vs `@fsl/mcp`); whether to ship as a standalone repo now or a jssm workspace package

## Purpose

An MCP server that lets an AI agent **make FSL machines**: the agent writes the FSL,
and the server gives it back the feedback a human gets from the editor — is it valid,
what does it look like, what does it do, does a walk behave, is it clean. It is the
fastest path to "author FSL with an agent," and it needs nothing that isn't already
shipping.

This is the **authoring** half of the `mcp` verb. The **debugging** half — time-travel
run interrogation (`state_at`, `why_rejected`, `val_history`, `diverges_from`) — is a
separate item (era-book `W8.22`, v12) because it depends on the run-record and proof
stack that doesn't exist until then. This spec is deliberately scoped to what can ship
**now**.

## Why it decouples from the v6→v16 sequence

An MCP server is a thin protocol adapter — a satellite package, the same category as the
LSP and the highlighters, not a core-library feature. Every tool below wraps capability
the current library already exposes:

- parse + validate FSL → error object — exists
- render a machine to SVG — exists (jssm-viz, folded into jssm)
- step/simulate a machine — exists (the runtime)
- traverse states/transitions to summarize — trivial over the parsed model

So the earliest practical landing is **immediate**, as its own package built against the
current jssm — years ahead of the v12 debugging verb, and not gated on expressions (v7),
contracts (v9), or proofs (v12).

## The tool surface (v1)

All tools take FSL `source` (a string) and return structured JSON.

| Tool | Input | Returns |
|---|---|---|
| `fsl_validate` | `source` | `{ valid, diagnostics: [{severity, message, line, col}] }` |
| `fsl_render` | `source`, `format?`("svg"\|"png") | the diagram (svg text or base64 png) |
| `fsl_explain` | `source` | `{ states[], transitions[], start, terminals[], summary }` |
| `fsl_simulate` | `source`, `actions[]` | `{ endState, path[], legalNext[], rejected? }` |
| `fsl_lint` | `source` | `{ notes: [{rule, message, line?}] }` |

The division of labor: **the agent generates the FSL; the MCP checks, visualizes, and
explains it.** No natural-language generation lives in the server — that keeps the server
deterministic and thin.

## Packaging

- Standalone npm package (`fsl-mcp`), a **stdio MCP server** using the MCP SDK.
- Single runtime dependency: the current `jssm`.
- `npx fsl-mcp` runnable; ships with a short README showing the five tools.
- Versioned independently of the language; its capability floor is "whatever the
  installed jssm parses."

## Grow-with-language plan (the anti-forget mechanism)

The tool must never lag the grammar. Two devices enforce this:

1. **Standing rule** (recorded in `Wmcp.1`): *every era that adds authorable language
   surface ships a matching fsl-mcp update.*
2. **Per-era sync items**, already threaded into the milestones so each carries an
   "update the MCP" issue:
   - `Wmcp.2` (v7) — expressions, numeric tower, where-guards
   - `Wmcp.3` (v8) — containers, ADTs, groups, graph
   - `Wmcp.4` (v9) — assign, contracts, RTC, hooks
   - `Wmcp.5` (v10) — `format`/CST, conformance
   - `Wmcp.6` (v11) — systems, factories, statecharts
   - `W8.22` (v12) — the debugging verb (time-travel) layers on

## Non-goals (v1)

- No time-travel / run interrogation (that is `W8.22`, v12).
- No proof/verification tools (`check`, certificates — later eras).
- No natural-language authoring inside the server.
- Not a CLI verb requirement — it ships as a package; a `fsl mcp` verb can wrap it later.

## Risks / caveats

- **Render fidelity** for very large machines — cap or paginate; return a warning.
- **Simulate** semantics before the richer runtime (v7+) are limited to what the current
  stepper supports; document the ceiling, expand via the sync items.
- **API surface** of the current jssm must be confirmed against its public exports before
  build (validate/render/step entry points) — a build-time check, not a blocker.

## Earliest practical landing

Now. A viable v1 (the five tools over current jssm, stdio server, README) is a few days
of work as its own package, independent of the roadmap. Green-light `Wmcp.1` whenever you
want to build it.
