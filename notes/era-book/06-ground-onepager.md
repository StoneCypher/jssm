# v6 — The Ground (one page)

**Mission:** one release event kills the dual-track and locks the irreversibles. After 6.0.0,
main is the only line, forever.

**The release (assembly branch → one PR):** the **breakage batch** — atom charset #754
(barewords → `[A-Za-z_][A-Za-z0-9_]*`), `jssm-*` web-component synonym removal, probabilistic
list-target copy→split, and the §27 **bare-functions API** (default import = free functions
over an opaque machine value; the whole 5.x class preserved verbatim at `jssm/compat`, proven
by running the 5.x suite against it) — plus the **One Merge**: the v6 integration branch's
completed payload (val scalar core, container/stdlib/ADT/tape modules, M3 deterministic
replayer + RFC 8785 canonical serialization, codegen/import/export, totality) merged home
with the `--theirs`-generated + full-rebuild recipe.

**Paper keystones (shipped as specs, this era):** C1 canonical `source_hash`
(LF/NFC/BOM-stripped SHA-256 — `2026-07-04-canonical-source-hash.md`) and C2 operational
semantics (`2026-07-04-operational-semantics.md`); the dragon lane live (light bar: kitchen
sink green + §3/§4/§6 dragon tiers; three-tier CI budget; detector-never-gates doctrine);
the perf envelope written before any journal work; error-code namespace reserved.

**Exit:** `npm view jssm version` = 6.0.0; manifest complete and shipped; v6 branch retired;
trackers executed per ledgers; dragon green under the agreed policy. **Fallback on record:**
if bare-functions drags >~2 weeks, it re-batches to v9.

**Milestone:** fsl #49. **Sources:** `eras/era-0-cleanup-and-6.0.md` (the full brief, ten
work packets, triage rulebook); dag.md phase plan.
