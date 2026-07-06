// Single source of truth for what an FSL roadmap issue IS.
// Validated register item -> issue { title, body, labels, milestone, fields }.
// Generated, never typed, so the format cannot drift.
import { z } from 'zod';

export const Size   = z.enum(['tiny', 'small', 'medium', 'large', 'huge', 'unknown']);
export const Effort = z.enum(['1of5', '2of5', '3of5', '4of5', '5of5']);
export const Status = z.enum(['Triage', 'Backlog', 'Ready', 'In progress', 'In review', 'Done']);
// issue-kind — parallel to the 13 commit change-types (drops the commit-only
// hotfix/release/revert; adds the four issue-only kinds).
export const Kind = z.enum([
  'feat', 'fix', 'docs', 'refactor', 'perf', 'test', 'chore', 'ci', 'build', 'style',
  'spec', 'research', 'umbrella', 'distribution', 'decision', 'release', 'migration',
]);
// commonality of desire — how many people want it, 1..5
export const Demand = z.enum(['exotic', 'niche', 'uncommon', 'common', 'table-stakes']);
// a chart: a mermaid spec OR an image URL, with a caption. Usually none; multiple allowed.
export const Chart = z.object({ caption: z.string().min(1), mermaid: z.string().optional(), image: z.string().optional() });

const Ver = z.union([z.number().int().min(6).max(16), z.literal('5.x')]);
const Date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);   // YYYY-MM-DD

export const IssueItem = z.object({
  // identity + placement
  id:      z.string(),                         // W-ID, e.g. "WP6.6" / "Tjssm-922"
  title:   z.string().min(8),
  cluster: z.string(),
  issue:   z.number().int().nullable().default(null),

  // lifecycle
  kind:              Kind,
  target_version:    Ver,                       // expected/planned major -> milestone
  completion_version: z.string().nullable().default(null),  // where it actually shipped, e.g. "5.159.3"
  origin_date:       Date.nullable().default(null),         // when the item/issue first arose
  finalization_date: Date.nullable().default(null),         // when it was completed
  irreversible:      z.boolean().default(false),            // can't change once shipped (hash, error codes, ABI…)
  strategic:         z.number().int().min(1).max(5).default(3),  // strategic weight, distinct from demand

  // body sections — declaration order IS render order
  motivation:       z.string().min(1),          // ### Motivation        (why it matters / the pain) — leads
  manager:          z.string().min(1),          // ### Summary           (what it is)
  cs:               z.string().optional(),       // ### Detail            (data/algorithms/invariants)
  example:          z.string().optional(),       // ### Example           (where useful)
  example_without:  z.string().optional(),       // ### Example (without) (rare — the contrast)
  ecosystem_impact: z.string().optional(),       // ### Ecosystem impact  (long-term place in the ecosystem)
  acceptance:       z.union([z.string().min(1), z.array(z.string()).min(1)]),  // ### Done when (prose OR a checklist)
  risks:            z.string().optional(),        // ### Risks (hazards / what could go wrong)
  deps:             z.array(z.string()).default([]),   // W-IDs -> native blocked-by
  blocks:           z.array(z.string()).default([]),   // W-IDs -> blocks
  blocked_by_external: z.string().optional(),     // non-issue blockers (org transfer, upstream fix, AWS setup…)
  // sources: prior issue versions ("was jssm#N"), spec places (MP§…), external URLs
  src:              z.array(z.string()).default([]),   // ### Sources
  charts:           z.array(Chart).default([]),        // ### Charts (usually empty; multiple ok)

  // tagging (fsl taxonomy)
  topics:   z.array(z.string()).min(1),
  size:     Size,
  effort:   Effort,
  demand:   Demand,                             // commonality of desire
  competitors_have: z.array(z.string()).default([]),  // rivals who ship this and we don't -> ### Competitive gap
  priority: z.string().optional(),
  breaking: z.boolean().default(false),
  status:   Status.default('Backlog'),
});

const EFFORT_LABEL = { '1of5': 'Effort: 1/5 - 1 person up to 1/2 day', '2of5': 'Effort: 2/5 - 1 person up to 3 days', '3of5': 'Effort: 3/5 - up to 3 people 1 week', '4of5': 'Effort: 4/5 - plan and divide; up to 1 month', '5of5': 'Effort: 5/5 - plan and divide; enormous' };
const KIND_LABEL = { feat:'Enhancement', fix:'Bug', docs:'Documentation and docgen', refactor:'Refactor', perf:'Performance', test:'Test suite', chore:'Chore', ci:'CI/CD', build:'Build', style:'Cleanup', spec:'Needs spec', research:'Needs research', umbrella:'List issue', distribution:'GEO', decision:'Needs answers', release:'Big picture', migration:'Refactor' };
const MILESTONE = { '5.x':'5.x — The Long Goodbye', 6:'v6 — The Ground', 7:'v7 — The Computing Machine', 8:'v8 — The Structured Machine', 9:'v9 — The Transactional Machine', 10:'v10 — The Portable Machine', 11:'v11 — The Composable Machine', 12:'v12 — The Proven Machine', 13:'v13 — The Durable Machine', 14:'v14 — The Trusted Machine', 15:'v15 — The Ubiquitous Machine', 16:'v16 — The Public Machine' };
const bul = (a) => a.map((x) => `- ${x}`).join('\n');

export function renderBody(it) {
  const S = [];
  if (it.irreversible) S.push('> ⚠️ **Irreversible** — cannot change once shipped; treat at spec quality and gate on review.');
  S.push(`### Motivation\n${it.motivation}`);
  S.push(`### Summary\n${it.manager}`);
  if (it.cs)               S.push(`### Detail\n${it.cs}`);
  if (it.example)          S.push(`### Example\n${it.example}`);
  if (it.example_without)  S.push(`### Example (without)\n${it.example_without}`);
  if (it.risks)            S.push(`### Risks\n${it.risks}`);
  if (it.ecosystem_impact) S.push(`### Ecosystem impact\n${it.ecosystem_impact}`);
  if (it.competitors_have.length) S.push(`### Competitive gap\nShipped by rivals we currently lack: ${it.competitors_have.join(', ')}.`);
  const done = Array.isArray(it.acceptance) ? it.acceptance.map((a) => `- [ ] ${a}`).join('\n') : it.acceptance;
  S.push(`### Done when\n${done}`);
  if (it.deps.length)   S.push(`### Depends on\n${bul(it.deps)}`);
  if (it.blocks.length) S.push(`### Blocks\n${bul(it.blocks)}`);
  if (it.blocked_by_external) S.push(`### Blocked by (external)\n${it.blocked_by_external}`);
  if (it.src.length)    S.push(`### Sources\n${bul(it.src)}`);
  if (it.charts.length) S.push('### Charts\n' + it.charts.map((c) => c.mermaid ? `**${c.caption}**\n\n\`\`\`mermaid\n${c.mermaid}\n\`\`\`` : `**${c.caption}**\n\n![${c.caption}](${c.image})`).join('\n\n'));
  const life = [`W-ID \`${it.id}\``, it.issue ? `fsl#${it.issue}` : null, `kind ${it.kind}`, `demand ${it.demand}`, `strategic ${it.strategic}/5`, it.irreversible ? 'irreversible' : null, `target ${it.target_version}`, it.completion_version ? `shipped ${it.completion_version}` : null, it.origin_date ? `origin ${it.origin_date}` : null, it.finalization_date ? `done ${it.finalization_date}` : null].filter(Boolean);
  S.push(`<sub>${life.join(' · ')}</sub>`);
  return S.join('\n\n');
}
export function labelsFor(it) {
  return [KIND_LABEL[it.kind], ...it.topics, `Size: ${it.size}`, EFFORT_LABEL[it.effort], ...(it.breaking ? ['Breaking change'] : []), ...(it.priority ? [it.priority] : [])];
}
export function render(raw) {
  const it = IssueItem.parse(raw);
  return { title: it.title, body: renderBody(it), labels: labelsFor(it), milestone: MILESTONE[it.target_version], fields: { cluster: it.cluster, size: it.size, effort: it.effort, status: it.status, wid: it.id, completion: it.completion_version } };
}
