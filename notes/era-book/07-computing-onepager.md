# v7 — The Computing Machine (one page)

**Mission:** machines compute and gate. The scalar expression tier ships whole; `where`
guards make it immediately useful — bounded ints, enums, and strings cover ~90% of real
gating (`where retries < 3`) with zero container machinery.

**Opening move (the workshop renovation):** the **peggy fork** (John's direction, replacing
fsl#1313's dead approach) producing a richly-typed grammar, plus **the generator dual** —
grammar-as-data driving random-document generation, so every slice after this lands
generated-fuzzed at birth. Semi-generated parser constants (fsl#561/#587) ride along.

**Contents (~45):** numeric tower (int s53, sized 8–256, longint, float/double, decimal(p,s),
bounded ranges, promotion, overflow=error+saturating, IEEE + isnan/isinf/isfinite, literal
vocabulary); operators + pinned precedence (div/mod/rem, boolean zoo, short-circuit, `in`,
bitwise-on-sized-only, `++`, `|>`); `if`/`let`/`case` with exhaustiveness + `when`; bounded
quantifiers; the string model (codepoint default, grapheme `+`, byte view, negative slicing,
pinned normalize/case, `unicode:` attribute); `where` guards live on transitions; math/stdlib
scalar families; C3 grammar appendix grows with each slice; every feature ships a C4 vector.

**Exit:** full scalar expression language green under spec+stoch+dragon+vectors; guards
shipping; precedence and grammar normatively pinned; `%`→`//` example sweep done.

**Hazards:** grammar churn is cheapest NOW — the dual exists and no containers depend on
anything; don't let container asks creep in (v8's seam is real).

**Milestone:** fsl #50. **Sources:** era-1 brief WP-1.7 slices 1–3 + WP-1.3; W6.1–.12,
.32–.42, .46–.53, .57–.59 (see spec-workitems version map).
