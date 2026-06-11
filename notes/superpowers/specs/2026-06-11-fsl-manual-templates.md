# FSL Manual — Structural Templates

> **Purpose:** repeating manual topics get a fixed shape, so every instance arrives well-developed. One source file per instance; **four projections** render from it: the **book** (PDF, read linearly), the **flat file** (llms.txt-style, for models), the **web** (page-per-instance, reference + SEO), and **editor help** (token-budgeted live assistance). Sections carry format flags; the book takes everything, the editor takes only `core`.
> **Companions:** `2026-06-09-fsl-manual-topics.md` (what to teach) — this file is *how each kind of thing is shaped*. Maintained alongside it; extend when a new repeating topic-kind appears.
> **Expected future templates:** feature reference · stdlib part · learn-by-repairing lesson · domain playbook · concept explainer (deontics-style) · CLI verb / man page · error-code explainer (`fsl explain`) · zoo formalism entry. The use case is the first.

---

## Template 1: The Use Case

**What a use case is:** "how do I build X with FSL" — translation of a domain problem into machine-shape, with proof. It is *not* a feature reference (one construct, exhaustively), a lesson (graded, broken-on-purpose), or a playbook (a domain's curated set of use cases). A playbook is composed of these; a use case *contains* a worked listing and *cites* features.

**Section order = survival priority.** When a projection has a budget (editor help, retrieval chunk), sections drop from the bottom up; the top of the template must stand alone.

| # | Section | Flags | Contract |
|---|---------|-------|----------|
| 0 | **Frontmatter** (machine-readable) | all | `id` (kebab slug), `title` (imperative problem statement: "Gate access with provable separation-of-duty"), `summary`, `domain` tags, `difficulty` (on-ramp / journeyman / deep-water), `features` exercised (list, by spec § — drives "every feature is reachable from a use case" coverage auditing), `stdlib_parts` used, `spec_refs`, `edition` + `feature_gates` required, `doctest: true`. The frontmatter is the index entry, the RAG metadata, and the coverage-audit row, all at once. |
| 1 | **One-breath summary** | core | ≤ 2 sentences: what you build, and the one thing FSL gives you here that alternatives don't. Doubles as: editor tooltip, SEO meta-description, llms.txt line, book ToC annotation. If the differentiator clause is missing, the use case isn't ready. |
| 2 | **When to reach for this** | core | Recognition triggers — symptoms, the job-to-be-done, and the *vocabulary readers arrive with* (per the deontics lesson: meet arrivals in their own dialect, then hand them ours). **Must include "when NOT to"** — the honest-limit discipline ("FSL is the reference monitor, not the grant database") lives here, at the top, not buried in ops notes. |
| 3 | **The mapping table** | core | The heart: *domain concept → FSL construct*, one row each ("session → a machine, stamped per login by a factory"; "dynamic SoD → an invariant over reachable activations"). Use cases are translation, not invention; this table is the translation memory. Above the fold on web; the densest few hundred tokens for retrieval. |
| 4 | **The build** | core (final listing) / extended (steps) | The worked listing, grown in 2–4 increments — minimal machine first, each step compiling and **doc-tested** (`test --doc`). Where a certified stdlib part exists, the build *ends by revealing it* ("you just rebuilt the circuit breaker — here's the certified one"), per the learn-by-repairing convention. Editor projection takes only the final listing. |
| 5 | **What you can now prove** | core | **Mandatory — the differentiator, cashed.** 2–4 properties, each as: the Dwyer-pattern (or invariant/flow/SoD) statement, the `check` invocation, and *what a counterexample would mean in domain terms* ("a counterexample here is an attack trace: a sequence of grants reaching a forbidden role pair"). A use case without this section is an xstate tutorial with extra steps. |
| 6 | **Run it** | extended | The CLI session: `make` / `run` / `walk` / `render` lines with sketched expected output. Serves agents and the impatient equally. |
| 7 | **Production notes** | extended | The ops corner: what goes behind **named hooks** (and is therefore outside the proofs — say so), scale limits and which verification band the claims land in, supervision / canary / drift / calibrate hookups where relevant. |
| 8 | **Variations & neighbors** | extended | Adjacent use cases, the stdlib parts touched, the zoo formalism this secretly is ("RBAC sessions are session types in a trench coat"), cross-links by `id`. The web projection's internal-link graph (SEO) is generated from this section. |
| 9 | **Provenance footer** | flat/web | Spec §§, tracker issues, edition/gates, doc-test status, last-verified toolchain version. Generated where possible. |

**Projection rules:**
- **Book:** all sections, in order; frontmatter renders as the chapter's margin notes.
- **Flat/LLM:** frontmatter + all sections, stable heading anchors (`#use-case/<id>/<section>`); sections 1+3 are the retrieval anchors.
- **Web:** page per instance; §1 → meta description; §3 above the fold; §8 → internal links; §9 → footer.
- **Editor help:** §§1–5 `core` projections only (§4 final listing only), hard token budget; if it can't teach in that budget, tighten the use case, don't raise the budget.

**Every instance is also data:** §1 + §4's final listing = an NL↔FSL corpus pair; §5's properties seed the eval set; §4's increments are learn-by-repairing candidates. Write once, harvest three times.

### Skeletal instantiation (proof of shape): "Trip a circuit breaker on failure trends"

- **1:** Wrap a flaky dependency in a machine that stops calling it when failures trend up, and *prove* the breaker can never stick closed. Alternatives give you the pattern; FSL gives you the proof.
- **2:** Reach for this when retry storms amplify outages; arrive-with vocabulary: Hystrix/Polly/resilience4j. **Not for:** load *shedding* by queue depth (see rate-limiter) or per-user budgets (see quota).
- **3:** closed/open/half-open → states · failure trend → `rate(failed, 100)` windowed aggregate · probe → `after`-delayed transition · trip threshold → a bounded val.
- **4:** three steps — bare three-state skeleton; add the window guard (`where rate(failed, 100) > 10`); add the half-open probe — then reveal the certified `circuit-breaker` stdlib part.
- **5:** `response(open, eventually half_open)` (no stuck-open); `absence(call during open)` (the breaker actually breaks); `settles_within(2)`. A counterexample to the second is a *leaked call to a dying service* — the exact production incident this exists to prevent.
- **6–9:** `walk --sweep` the failure rate to find the threshold's knee; the dependency call is a named hook (outside the proofs — say so); neighbors: rate limiter, retry-with-backoff, supervision; this is the Hystrix pattern as a Mealy machine.

---

*(Next templates land here as the manual's other repeating shapes get designed.)*
