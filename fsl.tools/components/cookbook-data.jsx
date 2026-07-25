// cookbook-data.jsx — recipes as DATA, designed to scale to hundreds.
// Each recipe is a record: { id, n, category, title, tags, problem, blocks, note, graph? }
// blocks: array of { kind: 'fsl'|'jssm'|'react'|'vitest', tokens }
// graph: { width, height, accentNode, nodes, edges }
// Token shorthand: ['t','value'] — see CookbookCode.jsx for the legend.

const RECIPES = [
  // ============================================================
  // PATTERNS
  // ============================================================
  {
    id: 'r-toggle', n: 1, category: 'Patterns',
    title: 'Toggle',
    tags: ['boolean', 'two-state', 'beginner'],
    problem: "Two states, one verb. The smallest useful machine — and the one you reach for whenever a boolean has started growing edge cases.",
    blocks: [
      { kind: 'fsl', tokens: [
        ['k','import'],['p',' { '],['i','sm'],['p',' } '],['k','from'],['p',' '],['s',"'jssm'"],['p',';'],['br'],['br'],
        ['k','const'],['p',' '],['i','panel'],['p',' = '],['i','sm'],['p','`'],['br'],
        ['p','  '],['s','closed'],['p',' '],['k',"'toggle'"],['p',' '],['a','→'],['p',' '],['s','open'],['p',';'],['br'],
        ['p','  '],['s','open'],['p','   '],['k',"'toggle'"],['p',' '],['a','→'],['p',' '],['s','closed'],['p',';'],['br'],
        ['p','`;'],['br'],['br'],
        ['i','panel'],['p','.go('],['s',"'toggle'"],['p',');'],['br'],
        ['i','panel'],['p','.state(); '],['cm',"// → 'open'"],
      ]},
    ],
    graph: {
      width: 520, height: 140, accentNode: 'closed',
      nodes: [{ id:'closed', x:150, y:70 }, { id:'open', x:370, y:70 }],
      edges: [
        { from:'closed', to:'open',   label:'toggle', curve:'arc-up', arcOffset:28 },
        { from:'open',   to:'closed', label:'toggle', curve:'arc',    arcOffset:28 },
      ],
    },
    note: "Reach for this whenever you find yourself adding a third boolean to a component. `open / opening / closed` is a different machine — and once you write it as one, the bugs go away.",
  },

  {
    id: 'r-cycle', n: 2, category: 'Patterns',
    title: 'Cycle',
    tags: ['loop', 'shared-action', 'beginner'],
    problem: "A linear loop with one shared verb. Every state is reachable from every other state, in order, by repeatedly firing the same action.",
    blocks: [
      { kind: 'fsl', tokens: [
        ['k','const'],['p',' '],['i','light'],['p',' = '],['i','sm'],['p','`'],['br'],
        ['p','  '],['s','red'],['p','    '],['k',"'next'"],['p',' '],['a','→'],['p',' '],['s','green'],['p',';'],['br'],
        ['p','  '],['s','green'],['p','  '],['k',"'next'"],['p',' '],['a','→'],['p',' '],['s','yellow'],['p',';'],['br'],
        ['p','  '],['s','yellow'],['p',' '],['k',"'next'"],['p',' '],['a','→'],['p',' '],['s','red'],['p',';'],['br'],
        ['p','`;'],
      ]},
    ],
    graph: {
      width: 560, height: 180, accentNode: 'red',
      nodes: [
        { id:'red', x:100, y:70 }, { id:'green', x:280, y:70 }, { id:'yellow', x:460, y:70 },
      ],
      edges: [
        { from:'red',    to:'green',  label:'next' },
        { from:'green',  to:'yellow', label:'next' },
        { from:'yellow', to:'red',    label:'next', curve:'arc', arcOffset:70 },
      ],
    },
    note: "Cycles fall apart when you reach for an enum and a counter. Modeled this way, the machine guarantees you can't skip a state — and adding a fourth phase is a one-line edit.",
  },

  {
    id: 'r-acyclic', n: 3, category: 'Patterns',
    title: 'Acyclic flow',
    tags: ['pipeline', 'terminal', 'orders'],
    problem: "A one-way pipeline with a terminal state. Once you've shipped, you've shipped — there's no going back.",
    blocks: [
      { kind: 'fsl', tokens: [
        ['k','const'],['p',' '],['i','order'],['p',' = '],['i','sm'],['p','`'],['br'],
        ['p','  '],['s','cart'],['p','     '],['k',"'checkout'"],['p',' '],['a','→'],['p',' '],['s','paying'],['p',';'],['br'],
        ['p','  '],['s','paying'],['p','   '],['k',"'authorize'"],['p',' '],['a','→'],['p',' '],['s','packed'],['p',';'],['br'],
        ['p','  '],['s','packed'],['p','   '],['k',"'ship'"],['p','     '],['a','→'],['p',' '],['s','shipped'],['p',';'],['br'],
        ['p','  '],['s','shipped'],['p','  '],['k',"'deliver'"],['p','  '],['a','→'],['p',' '],['s','delivered'],['p',';'],['br'],
        ['p','`;'],['br'],['br'],
        ['cm','// no edge leaves `delivered` — terminal by construction.'],
      ]},
    ],
    note: "Audit the receipts later by walking the hook log; you'll never see a delivered order rewind, because there's no syntax for it.",
  },

  {
    id: 'r-branch', n: 4, category: 'Patterns',
    title: 'Optional branch',
    tags: ['fork', 'review', 'publish'],
    problem: "A pipeline with one optional fork — review-then-publish, or skip-and-publish. The branch lives in the graph, not in a flag you have to remember to set.",
    blocks: [
      { kind: 'fsl', tokens: [
        ['k','const'],['p',' '],['i','post'],['p',' = '],['i','sm'],['p','`'],['br'],
        ['p','  '],['s','draft'],['p','      '],['k',"'submit'"],['p','   '],['a','→'],['p',' '],['s','reviewing'],['p',';'],['br'],
        ['p','  '],['s','draft'],['p','      '],['k',"'publish'"],['p','  '],['a','→'],['p',' '],['s','live'],['p',';      '],['cm','// admin shortcut'],['br'],
        ['p','  '],['s','reviewing'],['p','  '],['k',"'approve'"],['p','  '],['a','→'],['p',' '],['s','live'],['p',';'],['br'],
        ['p','  '],['s','reviewing'],['p','  '],['k',"'reject'"],['p','   '],['a','→'],['p',' '],['s','draft'],['p',';'],['br'],
        ['p','`;'],
      ]},
    ],
    graph: {
      width: 560, height: 200, accentNode: 'draft',
      nodes: [
        { id:'draft', x:100, y:100 }, { id:'reviewing', x:290, y:100 }, { id:'live', x:480, y:100 },
      ],
      edges: [
        { from:'draft',     to:'reviewing', label:'submit' },
        { from:'reviewing', to:'live',      label:'approve' },
        { from:'reviewing', to:'draft',     label:'reject', curve:'arc-up', arcOffset:50 },
        { from:'draft',     to:'live',      label:'publish', curve:'arc', arcOffset:60 },
      ],
    },
  },

  // ============================================================
  // HOOKS
  // ============================================================
  {
    id: 'r-entry', n: 5, category: 'Hooks',
    title: 'Side effects on entry',
    tags: ['hook_entry', 'analytics', 'side-effects'],
    problem: "Fire a side effect every time the machine arrives at a state — log it, persist it, page someone — without scattering checks across your call sites.",
    blocks: [
      { kind: 'jssm', tokens: [
        ['i','order'],['p','.hook_entry('],['s',"'shipped'"],['p',', () => {'],['br'],
        ['p','  '],['i','analytics'],['p','.track('],['s',"'order.shipped'"],['p',', { '],['i','id'],['p',' });'],['br'],
        ['p','  '],['i','email'],['p','.shipping('],['i','customer'],['p',');'],['br'],
        ['p','});'],['br'],['br'],
        ['i','order'],['p','.hook_entry('],['s',"'delivered'"],['p',', '],['i','closeOut'],['p',');'],
      ]},
    ],
    note: "Hooks run after the transition lands, never before — so you never fire `order.shipped` on a request that gets rejected. The machine is the source of truth; the side effects follow.",
  },

  {
    id: 'r-payload', n: 6, category: 'Hooks',
    title: 'Payload-aware actions',
    tags: ['hook_action', 'data', 'session'],
    problem: "Most actions carry data — a form submission, a server response, a user id. Pass it through with the transition and read it in the hook.",
    blocks: [
      { kind: 'jssm', tokens: [
        ['i','session'],['p','.go('],['s',"'login'"],['p',', { '],['i','user'],['p',' });'],['br'],['br'],
        ['i','session'],['p','.hook_action('],['s',"'login'"],['p',', ({ '],['i','data'],['p',' }) => {'],['br'],
        ['p','  '],['i','currentUser'],['p',' = '],['i','data'],['p','.'],['i','user'],['p',';'],['br'],
        ['p','  '],['i','router'],['p','.push('],['s',"'/dashboard'"],['p',');'],['br'],
        ['p','});'],['br'],['br'],
        ['cm','// the payload travels with the action, not in module state'],
      ]},
    ],
  },

  {
    id: 'r-log', n: 7, category: 'Hooks',
    title: 'Transition logging',
    tags: ['hook_any_transition', 'observability', 'replay'],
    problem: "Tap every transition with a single line. Useful in dev, essential in production for replaying user sessions.",
    blocks: [
      { kind: 'jssm', tokens: [
        ['i','machine'],['p','.hook_any_transition(({ '],['i','from'],['p',', '],['i','to'],['p',', '],['i','action'],['p',' }) => {'],['br'],
        ['p','  '],['i','log'],['p','.push({ '],['i','t'],['p',': '],['i','Date'],['p','.now(), '],['i','from'],['p',', '],['i','to'],['p',', '],['i','action'],['p',' });'],['br'],
        ['p','});'],['br'],['br'],
        ['cm','// later: replay by walking log and calling .go(name) in order'],
      ]},
    ],
    note: "Because the graph rejects illegal moves, replaying a captured log either succeeds end-to-end or fails at the exact point your code drifted. Bisecting state-machine bugs becomes a mechanical exercise.",
  },

  // ============================================================
  // COMPOSITION
  // ============================================================
  {
    id: 'r-perentity', n: 8, category: 'Composition',
    title: 'One machine per entity',
    tags: ['per-row', 'instances', 'lifecycle'],
    problem: "Don't try to fit ten orders into one machine. Spin up a fresh instance per row, and let each one run its own lifecycle independently.",
    blocks: [
      { kind: 'jssm', tokens: [
        ['k','const'],['p',' '],['i','OrderM'],['p',' = () => '],['i','sm'],['p','`'],['br'],
        ['p','  '],['s','cart'],['p',' '],['k',"'pay'"],['p',' '],['a','→'],['p',' '],['s','paid'],['p',' '],['k',"'ship'"],['p',' '],['a','→'],['p',' '],['s','done'],['p',';'],['br'],
        ['p','`;'],['br'],['br'],
        ['k','const'],['p',' '],['i','byId'],['p',' = '],['k','new'],['p',' '],['i','Map'],['p','();'],['br'],
        ['k','function'],['p',' '],['i','machineFor'],['p','('],['i','id'],['p',') {'],['br'],
        ['p','  '],['k','if'],['p',' (!'],['i','byId'],['p','.has('],['i','id'],['p',')) '],['i','byId'],['p','.set('],['i','id'],['p',', '],['i','OrderM'],['p','());'],['br'],
        ['p','  '],['k','return'],['p',' '],['i','byId'],['p','.get('],['i','id'],['p',');'],['br'],
        ['p','}'],
      ]},
    ],
    note: "Each entity carries its own state — no shared bag of flags, no row accidentally inheriting another's status. When the row's gone, drop its machine.",
  },

  {
    id: 'r-react', n: 9, category: 'Composition',
    title: 'Subscribe from React',
    tags: ['react', 'hook', 'rendering'],
    problem: "Render off the machine's state with a tiny hook. The component re-renders on every transition; you never call setState yourself.",
    blocks: [
      { kind: 'react', tokens: [
        ['k','function'],['p',' '],['i','useMachine'],['p','('],['i','m'],['p',') {'],['br'],
        ['p','  '],['k','const'],['p',' [, '],['i','tick'],['p','] = '],['i','React'],['p','.useReducer('],['i','n'],['p',' => '],['i','n'],['p',' + '],['n','1'],['p',', '],['n','0'],['p',');'],['br'],
        ['p','  '],['i','React'],['p','.useEffect(() => '],['i','m'],['p','.hook_any_transition('],['i','tick'],['p','), ['],['i','m'],['p',']);'],['br'],
        ['p','  '],['k','return'],['p',' '],['i','m'],['p','.state();'],['br'],
        ['p','}'],['br'],['br'],
        ['k','function'],['p',' '],['i','Light'],['p','() {'],['br'],
        ['p','  '],['k','const'],['p',' '],['i','at'],['p',' = '],['i','useMachine'],['p','('],['i','light'],['p',');'],['br'],
        ['p','  '],['k','return'],['p',' <'],['i','div'],['p',' '],['i','className'],['p','={'],['i','at'],['p','}>{'],['i','at'],['p','}</'],['i','div'],['p','>;'],['br'],
        ['p','}'],
      ]},
    ],
  },

  // ============================================================
  // REAL WORLD
  // ============================================================
  {
    id: 'r-fetch', n: 10, category: 'Real world',
    title: 'Fetch with retry',
    tags: ['async', 'retry', 'network'],
    problem: "A request that can succeed, fail, or be retried — without a tangle of nested if-statements. The graph names every legal transition; the calling code stays flat.",
    blocks: [
      { kind: 'fsl', tokens: [
        ['k','const'],['p',' '],['i','req'],['p',' = '],['i','sm'],['p','`'],['br'],
        ['p','  '],['s','idle'],['p','     '],['k',"'fetch'"],['p','   '],['a','→'],['p',' '],['s','loading'],['p',';'],['br'],
        ['p','  '],['s','loading'],['p','  '],['k',"'resolve'"],['p',' '],['a','→'],['p',' '],['s','success'],['p',';'],['br'],
        ['p','  '],['s','loading'],['p','  '],['k',"'reject'"],['p','  '],['a','→'],['p',' '],['s','error'],['p',';'],['br'],
        ['p','  '],['s','error'],['p','    '],['k',"'retry'"],['p','   '],['a','→'],['p',' '],['s','loading'],['p',';'],['br'],
        ['p','  '],['s','success'],['p','  '],['k',"'reset'"],['p','   '],['a','→'],['p',' '],['s','idle'],['p',';'],['br'],
        ['p','`;'],
      ]},
      { kind: 'jssm', tokens: [
        ['k','async function'],['p',' '],['i','run'],['p','() {'],['br'],
        ['p','  '],['i','req'],['p','.go('],['s',"'fetch'"],['p',');'],['br'],
        ['p','  '],['k','try'],['p',' { '],['k','const'],['p',' '],['i','data'],['p',' = '],['k','await'],['p',' '],['i','api'],['p','.get(); '],['i','req'],['p','.go('],['s',"'resolve'"],['p',', { '],['i','data'],['p',' }); }'],['br'],
        ['p','  '],['k','catch'],['p',' { '],['i','req'],['p','.go('],['s',"'reject'"],['p','); }'],['br'],
        ['p','}'],
      ]},
    ],
    graph: {
      width: 620, height: 260, accentNode: 'loading',
      nodes: [
        { id:'idle', x:90, y:130 }, { id:'loading', x:300, y:130 },
        { id:'success', x:510, y:60 }, { id:'error', x:510, y:200 },
      ],
      edges: [
        { from:'idle',    to:'loading', label:'fetch' },
        { from:'loading', to:'success', label:'resolve' },
        { from:'loading', to:'error',   label:'reject' },
        { from:'error',   to:'loading', label:'retry', curve:'arc', arcOffset:55 },
        { from:'success', to:'idle',    label:'reset', curve:'arc-up', arcOffset:55 },
      ],
    },
  },

  {
    id: 'r-form', n: 11, category: 'Real world',
    title: 'Multi-step form',
    tags: ['wizard', 'navigation', 'forms'],
    problem: "Wizard, checkout, onboarding. Forward and back navigation, with the submit button only legal on the last step.",
    blocks: [
      { kind: 'fsl', tokens: [
        ['k','const'],['p',' '],['i','wizard'],['p',' = '],['i','sm'],['p','`'],['br'],
        ['p','  '],['s','account'],['p','  '],['k',"'next'"],['p','   '],['a','→'],['p',' '],['s','profile'],['p',';'],['br'],
        ['p','  '],['s','profile'],['p','  '],['k',"'next'"],['p','   '],['a','→'],['p',' '],['s','review'],['p',';'],['br'],
        ['p','  '],['s','review'],['p','   '],['k',"'submit'"],['p',' '],['a','→'],['p',' '],['s','done'],['p',';'],['br'],
        ['br'],
        ['p','  '],['s','profile'],['p','  '],['k',"'back'"],['p','   '],['a','→'],['p',' '],['s','account'],['p',';'],['br'],
        ['p','  '],['s','review'],['p','   '],['k',"'back'"],['p','   '],['a','→'],['p',' '],['s','profile'],['p',';'],['br'],
        ['p','`;'],['br'],['br'],
        ['cm',"// `submit` is only legal on `review` — the button literally cannot fire elsewhere"],
      ]},
    ],
    note: "The disabled-state for the submit button comes for free: `wizard.valid_action('submit')` tells you whether to grey it out, and you wired no logic to make that work.",
  },

  {
    id: 'r-optimistic', n: 12, category: 'Real world',
    title: 'Optimistic UI',
    tags: ['async', 'rollback', 'ux'],
    problem: "Show success immediately, roll back on failure. The machine carries the optimistic state explicitly, so the rollback path is just another arrow.",
    blocks: [
      { kind: 'fsl', tokens: [
        ['k','const'],['p',' '],['i','like'],['p',' = '],['i','sm'],['p','`'],['br'],
        ['p','  '],['s','off'],['p','        '],['k',"'click'"],['p','    '],['a','→'],['p',' '],['s','optimistic_on'],['p',';'],['br'],
        ['p','  '],['s','optimistic_on'],['p','  '],['k',"'confirm'"],['p','  '],['a','→'],['p',' '],['s','on'],['p',';'],['br'],
        ['p','  '],['s','optimistic_on'],['p','  '],['k',"'rollback'"],['p',' '],['a','→'],['p',' '],['s','off'],['p',';'],['br'],
        ['p','  '],['s','on'],['p','         '],['k',"'click'"],['p','    '],['a','→'],['p',' '],['s','optimistic_off'],['p',';'],['br'],
        ['p','  '],['s','optimistic_off'],['p',' '],['k',"'confirm'"],['p','  '],['a','→'],['p',' '],['s','off'],['p',';'],['br'],
        ['p','  '],['s','optimistic_off'],['p',' '],['k',"'rollback'"],['p',' '],['a','→'],['p',' '],['s','on'],['p',';'],['br'],
        ['p','`;'],
      ]},
    ],
    note: "Treat `optimistic_*` states as 'in flight' in your UI — show a heart icon, but slightly faded. The dual edges out of each one mean rollback can never land you somewhere illegal.",
  },

  {
    id: 'r-test', n: 13, category: 'Real world',
    title: 'Testing transitions',
    tags: ['testing', 'vitest', 'coverage'],
    problem: "Walk every legal path with a tiny generator. Assert that illegal actions are refused. Your test suite gets graph coverage for free.",
    blocks: [
      { kind: 'vitest', tokens: [
        ['i','test'],['p','('],['s',"'cycle ends where it began'"],['p',', () => {'],['br'],
        ['p','  '],['k','const'],['p',' '],['i','m'],['p',' = '],['i','traffic'],['p','();'],['br'],
        ['p','  ['],['s',"'next'"],['p',', '],['s',"'next'"],['p',', '],['s',"'next'"],['p','].forEach('],['i','a'],['p',' => '],['i','m'],['p','.go('],['i','a'],['p','));'],['br'],
        ['p','  '],['i','expect'],['p','('],['i','m'],['p','.state()).toBe('],['s',"'red'"],['p',');'],['br'],
        ['p','});'],['br'],['br'],
        ['i','test'],['p','('],['s',"'cannot stop on red'"],['p',', () => {'],['br'],
        ['p','  '],['k','const'],['p',' '],['i','m'],['p',' = '],['i','traffic'],['p','();'],['br'],
        ['p','  '],['i','expect'],['p','('],['i','m'],['p','.valid_action('],['s',"'stop'"],['p',')).toBe('],['k','false'],['p',');'],['br'],
        ['p','});'],
      ]},
    ],
    note: "The graph itself is the contract. Tests stop being about implementation details and start being about *which paths through the graph matter to your users.*",
  },
];

// Categories with display order
const CATEGORIES = ['Patterns', 'Hooks', 'Composition', 'Real world'];

// Computed counts for the sidebar
function recipesByCategory() {
  const map = {};
  for (const c of CATEGORIES) map[c] = [];
  for (const r of RECIPES) map[r.category].push(r);
  return map;
}

window.RECIPES = RECIPES;
window.CATEGORIES = CATEGORIES;
window.recipesByCategory = recipesByCategory;
