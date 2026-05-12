# Comparables library research

Output of plan Task 5. Subsequent per-library tasks (6-15) read `languages`, `homepage`, and optional `typesSource` from this file.

| library | npm name | homepage | languages | typesSource (if any) | evidence / notes |
| --- | --- | --- | --- | --- | --- |
| jssm | jssm | https://stonecypher.github.io/jssm/ | javascript, typescript | — | package.json: `"types": "./jssm.es5.d.cts"`; published files include `dist/deno/jssm.js`, `dist/deno/*.d.ts`, `dist/deno/README.md` — Deno is a first-class distribution target (note: Deno is a runtime, not a language) |
| xstate | xstate | https://github.com/statelyai/xstate/tree/main/packages/core#readme | javascript, typescript | — | package.json: `"types":"./dist/xstate.cjs.d.ts"` |
| javascript-state-machine | javascript-state-machine | https://github.com/jakesgordon/javascript-state-machine | javascript, typescript | @types/javascript-state-machine | No `types`/`typings` field in package.json; `@types/javascript-state-machine` v2.4.6 published 2023-11-07T08:16:32.536Z |
| state-machine | state-machine | https://github.com/davestewart/javascript-state-machine | javascript | — | No `types`/`typings` field; `@types/state-machine` v2.3.30 exists but is **deprecated** with notice "now '@types/javascript-state-machine'" — refers to a different package (jakesgordon's), not this one (davestewart's); no viable @types for this package |
| nanostate | nanostate | https://github.com/choojs/nanostate#readme | javascript | — | No `types`/`typings` field; `@types/nanostate` returns 404 — no community types available |
| machina | machina | https://machina-js.org/ | javascript, typescript | — | package.json: `"types":"dist/index.d.mts"` (SURPRISE: contradicts prior expectation of javascript only) |
| finity | finity | https://github.com/nickuraltsev/finity#readme | javascript, typescript | — | package.json: `"types":"index.d.ts"` (SURPRISE: contradicts prior expectation of javascript only) |
| stately | stately.js | https://github.com/fschaefer/Stately.js | javascript | — | No `types`/`typings` field; `@types/stately.js` returns 404 — no community types available |
| robot | robot3 | https://github.com/matthewp/robot#readme | javascript, typescript | — | package.json: `"types":"./index.d.ts"` |
| faste | faste | https://github.com/theKashey/faste#readme | javascript, typescript | — | package.json: `"types":"dist/es5/index.d.ts"` |

## Method notes

- All data sourced from `https://registry.npmjs.org/<package>/latest` (JSON registry API), which returns the published package.json.
- `https://www.npmjs.com/package/*` returned HTTP 403 for all packages; the registry API was used as the primary source.
- For packages without own types, `https://registry.npmjs.org/@types/<package>/latest` was checked.
- `state-machine` npm package is **davestewart**'s library, distinct from jakesgordon's `javascript-state-machine`. The `@types/state-machine` package is deprecated and redirects to `@types/javascript-state-machine` (for jakesgordon's package), not for davestewart's package.
- No library mentions WebAssembly as a target. jssm is the only library with a non-browser/non-Node.js distribution (Deno).

## Surprises vs. priors

| library | prior expectation | actual |
| --- | --- | --- |
| machina | javascript only | javascript, **typescript** (ships `"types":"dist/index.d.mts"`) |
| finity | javascript only | javascript, **typescript** (ships `"types":"index.d.ts"`) |
| all others | matches prior | confirmed |
