/* Sankey / alluvial MASS-FLOW model for the fsl#1965 ecosystem chart.

   Pure, dependency-free, and shared verbatim between Node and the browser: the
   generator inlines everything above the node-only marker at the bottom, so the
   page runs exactly the source `tests/flow_model.spec.ts` covers. One copy, one
   proof. `make_size_chart.cjs` also runs the conservation check here as a BUILD
   GATE, so a graph that fails to balance never reaches a published page.

   The diagram answers "where did the bytes go": every column is a derived
   ecosystem EVENT, every node is (package @ column) with height = that
   package's installed size then, and every ribbon is mass crossing from one
   node to the next. Nothing is hand-placed -- adding repos to the archive adds
   columns and ribbons with no code change.

   CONSERVATION is the correctness property, not an aesthetic one. At every node
   the incoming ribbons must sum to exactly the node's mass, and so must the
   outgoing ribbons, once explicit source terms (birth, growth) and sink terms
   (shrink, death, discard) are counted. `conservationViolations()` re-derives
   that from the built graph, so a mis-routed ribbon fails loudly instead of
   merely looking plausible. */

'use strict';

/** Installed size of a package at wall-clock time `t`, as a step function.
 *
 *  Zero before the package's first publish. Zero again after its last publish
 *  IF the package flowed out (npm-deprecated, obsoleted, or abandoned) -- a
 *  still-current package holds its last measured size forever.
 *
 *  @param pk  Package record: {times[], totals[], dead, lastT}, times ascending.
 *  @param t   Milliseconds since epoch.
 *  @returns   Installed bytes at that instant.
 *
 *  @example
 *  stepAt({times:[10,20], totals:[5,9], dead:false, lastT:20}, 25)   // => 9
 *  stepAt({times:[10,20], totals:[5,9], dead:true,  lastT:20}, 25)   // => 0
 */
function stepAt(pk, t) {
  if (t < pk.times[0]) { return 0; }
  if (pk.dead && t > pk.lastT) { return 0; }
  let lo = 0, hi = pk.times.length - 1, idx = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (pk.times[mid] <= t) { idx = mid; lo = mid + 1; } else { hi = mid - 1; }
  }
  return pk.totals[idx];
}

/** Derive the ecosystem's lifecycle events from the archive alone.
 *
 *  Four kinds, none of them curated:
 *    - `birth`       a package's first published version
 *    - `death`       a package's last published version, when it flowed out
 *    - `supersede`   an obsoletedBy edge, dated at the successor's first
 *                    release AFTER the predecessor's last (the moment the work
 *                    actually reappears downstream), falling back to the
 *                    predecessor's last release when the successor never
 *                    published again
 *    - `decompose`   a family present in a package that stops being published
 *                    there and starts being published by another package --
 *                    the monorepo split, caught without naming it
 *
 *  @param pkgs  Package records (see stepAt) also carrying {name, by, status}.
 *  @returns     Events sorted ascending by time.
 *
 *  @example
 *  deriveEvents([{name:'a',times:[1],totals:[9],dead:false,lastT:1,by:null}])
 *  // => [{ t: 1, kind: 'birth', pkg: 'a', target: null, what: null }]
 */
function deriveEvents(pkgs) {
  const byName = new Map(pkgs.map(p => [p.name, p]));
  const events = [];
  const push = (t, kind, pkg, target, what) => events.push({ t, kind, pkg, target: target || null, what: what || null });

  for (const pk of pkgs) {
    push(pk.born !== undefined ? pk.born : pk.times[0], 'birth', pk.name, null, null);
    if (pk.dead) { push(pk.lastT, 'death', pk.name, null, pk.reason || null); }
  }

  for (const pk of pkgs) {
    if (!pk.dead || !pk.by) { continue; }
    const succ = byName.get(pk.by);
    if (!succ) { continue; }
    let when = pk.lastT;
    for (const t of succ.times) { if (t > pk.lastT) { when = t; break; } }
    push(when, 'supersede', pk.name, succ.name, pk.reason || null);
  }

  for (const ev of decompositions(pkgs)) { events.push(ev); }

  events.sort((a, b) => a.t - b.t || a.pkg.localeCompare(b.pkg));
  return events;
}

/** Detect decomposition: a file family leaving one package and appearing in
 *  another within a year, which is what a monorepo split looks like from the
 *  outside. Purely a diff of published family sets -- no package is named.
 *
 *  @param pkgs  Package records additionally carrying `famSpan`: Map(family ->
 *               {first, last}) of the first/last publish times that family
 *               appeared in that package.
 *  @returns     `decompose` events, unsorted.
 */
function decompositions(pkgs) {
  const YEAR = 365 * 864e5;
  const out = [];
  for (const from of pkgs) {
    if (!from.famSpan) { continue; }
    for (const [fam, span] of from.famSpan) {
      for (const to of pkgs) {
        if (to === from || !to.famSpan) { continue; }
        const there = to.famSpan.get(fam);
        if (!there) { continue; }
        const gap = there.first - span.last;
        if (gap >= 0 && gap < YEAR && there.first > span.first) {
          out.push({ t: there.first, kind: 'decompose', pkg: from.name, target: to.name, what: fam });
        }
      }
    }
  }
  return out;
}

/** Collapse events into drawn columns, merging everything inside one window so
 *  five CLI retirements in the same season read as a single consolidation
 *  rather than five near-identical slices.
 *
 *  @param events    From deriveEvents, ascending.
 *  @param windowMs  Merge radius. Events within this of the open column join it.
 *  @returns         Columns `{t, tMin, tMax, events[]}` ascending by `t`.
 *
 *  @example
 *  collapseColumns([{t:0,kind:'birth'},{t:5,kind:'birth'}], 10).length   // => 1
 */
function collapseColumns(events, windowMs) {
  const cols = [];
  for (const ev of events) {
    const open = cols[cols.length - 1];
    if (open && ev.t - open.tMin <= windowMs) { open.events.push(ev); open.tMax = ev.t; continue; }
    cols.push({ t: ev.t, tMin: ev.t, tMax: ev.t, events: [ev] });
  }
  for (const c of cols) { c.t = Math.round((c.tMin + c.tMax) / 2); }
  return cols;
}

/** A short human label for a column, from the events it swallowed.
 *
 *  @param col  A column from collapseColumns.
 *  @returns    e.g. `"jssm born"` or `"5 events"`.
 */
function columnLabel(col) {
  const kinds = new Map();
  for (const ev of col.events) { kinds.set(ev.kind, (kinds.get(ev.kind) || 0) + 1); }
  if (col.events.length === 1) {
    const ev = col.events[0];
    if (ev.kind === 'birth')     { return ev.pkg + ' born'; }
    if (ev.kind === 'death')     { return ev.pkg + ' ends'; }
    if (ev.kind === 'supersede') { return ev.pkg + ' → ' + ev.target; }
    return ev.what ? ev.what + ' → ' + ev.target : ev.pkg + ' → ' + ev.target;
  }
  const ranked = [...kinds].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const head = ranked.slice(0, 2).map(([k, n]) => n + ' ' + k).join(', ');
  const rest = ranked.slice(2).reduce((a, kv) => a + kv[1], 0);
  return rest ? head + ' +' + rest : head;
}

/** The instant a column should sample a package at.
 *
 *  Normally the column's own midpoint -- but a package whose entire life falls
 *  inside one column's window would otherwise be sampled before its birth or
 *  after its death and vanish from the diagram entirely. When the column's
 *  window overlaps the package's life, the sample is pulled to the nearest
 *  instant the package was actually alive, so a short-lived package still gets
 *  a node instead of silently disappearing.
 *
 *  @param pk   Package record (see stepAt).
 *  @param col  A column from collapseColumns.
 *  @returns    Milliseconds since epoch to evaluate `stepAt` at.
 */
function sampleTime(pk, col) {
  const born = pk.times[0];
  if (col.t < born) { return born <= col.tMax ? born : col.t; }
  if (pk.dead && col.t > pk.lastT) { return pk.lastT >= col.tMin ? pk.lastT : col.t; }
  return col.t;
}

/** Build the whole flow graph: columns, nodes, and conserving ribbons.
 *
 *  Between adjacent columns each package contributes `carry` for the mass it
 *  keeps and `shrink` for what it sheds. A package that ends and has a
 *  supersession edge hands its successor only as much as that successor
 *  actually gained (`supersede`), and the remainder evaporates at the
 *  predecessor as `discard` -- so the 84 MB jssm-viz was carrying is visibly
 *  NOT teleported into jssm. Anything a node still needs after its inbound
 *  ribbons is new code, emitted as `birth` or `growth`.
 *
 *  @param pkgs      Package records (see stepAt / deriveEvents).
 *  @param windowMs  Column merge radius; defaults to 45 days.
 *  @returns         `{columns, nodes, links, events}`; nodes carry `{col, pkg,
 *                   mass}` and links `{from, to, bytes, kind, what}` where a
 *                   null endpoint means a source or a sink.
 */
function buildFlow(pkgs, windowMs) {
  const W = windowMs === undefined ? 45 * 864e5 : windowMs;
  const events = deriveEvents(pkgs);
  const columns = collapseColumns(events, W);
  for (const c of columns) { c.label = columnLabel(c); }

  // A terminal "today" column, one day past the last release anywhere in the
  // ecosystem. Without it a package that dies in the LAST event column has no
  // next column to flow into, and its mass exits as an unexplained death
  // instead of reaching (or visibly failing to reach) its successor. Derived
  // from the data, never from the clock, so the diagram stays deterministic.
  const horizon = pkgs.reduce((a, p) => Math.max(a, p.lastT), 0) + 864e5;
  if (horizon > columns[columns.length - 1].tMax) {
    columns.push({ t: horizon, tMin: horizon, tMax: horizon, events: [], label: 'today' });
  }

  const byName = new Map(pkgs.map(p => [p.name, p]));
  const nodes = [], nodeAt = new Map();       // "col|pkg" -> node
  const key = (ci, name) => ci + '|' + name;

  columns.forEach((col, ci) => {
    for (const pk of pkgs) {
      const t = sampleTime(pk, col);
      const mass = stepAt(pk, t);
      if (mass <= 0) { continue; }
      const n = { col: ci, pkg: pk.name, mass, t };
      nodes.push(n); nodeAt.set(key(ci, pk.name), n);
    }
  });

  const links = [];
  for (let ci = 0; ci + 1 < columns.length; ci++) {
    const inflow = new Map();                 // node key -> bytes already routed in
    const add = (k, b) => inflow.set(k, (inflow.get(k) || 0) + b);
    const headroom = k => nodeAt.get(k).mass - (inflow.get(k) || 0);

    // pass 1 -- a package that survives the step carries what it keeps and
    // sheds the rest. `carry` can never exceed the destination's own mass.
    for (const pk of pkgs) {
      const a = nodeAt.get(key(ci, pk.name)), b = nodeAt.get(key(ci + 1, pk.name));
      if (!a || !b) { continue; }
      const carried = Math.min(a.mass, b.mass);
      links.push({ from: a, to: b, bytes: carried, kind: 'carry', what: null });
      add(key(ci + 1, pk.name), carried);
      if (a.mass > carried) { links.push({ from: a, to: null, bytes: a.mass - carried, kind: 'shrink', what: null }); }
    }

    // pass 2 -- a package that ends here hands as much as its successor can
    // actually hold to that successor; the rest visibly evaporates AT THE
    // PREDECESSOR rather than passing through the successor and out the far
    // side. That is what makes jssm-viz's 84 MB read honestly: only the bytes
    // jssm truly gained cross the gap.
    for (const pk of pkgs) {
      const a = nodeAt.get(key(ci, pk.name));
      if (!a || nodeAt.get(key(ci + 1, pk.name))) { continue; }
      const succKey = pk.by && byName.has(pk.by) ? key(ci + 1, pk.by) : null;
      const succ = succKey ? nodeAt.get(succKey) : null;
      const give = succ ? Math.min(a.mass, Math.max(0, headroom(succKey))) : 0;
      if (give > 0) { links.push({ from: a, to: succ, bytes: give, kind: 'supersede', what: pk.reason || null }); add(succKey, give); }
      const lost = a.mass - give;
      if (lost > 0) {
        links.push({ from: a, to: null, bytes: lost,
          kind: succ ? 'discard' : 'death',
          what: succ ? 'superseded, not carried forward' : (pk.reason || null) });
      }
    }

    // pass 3 -- whatever a node still needs came from nowhere measurable: new
    // code. `birth` when the package did not exist a column ago, else `growth`.
    for (const pk of pkgs) {
      const k = key(ci + 1, pk.name);
      if (!nodeAt.has(k)) { continue; }
      const need = headroom(k);
      if (need <= 0) { continue; }
      const existed = nodeAt.has(key(ci, pk.name));
      links.push({ from: null, to: nodeAt.get(k), bytes: need, kind: existed ? 'growth' : 'birth', what: null });
    }
  }

  // every node in the first column is a source; every node in the last is a sink
  for (const n of nodes) {
    if (n.col === 0) { links.push({ from: null, to: n, bytes: n.mass, kind: 'birth', what: null }); }
    if (n.col === columns.length - 1) {
      const pk = byName.get(n.pkg);
      links.push({ from: n, to: null, bytes: n.mass, kind: pk && pk.dead ? 'death' : 'today', what: null });
    }
  }

  return { columns, nodes, links, events };
}

/** Re-derive conservation from the built graph and report every node whose
 *  ribbons do not balance. An empty array is the invariant holding.
 *
 *  Sources (`birth`, `growth`) and sinks (`shrink`, `death`, `discard`,
 *  `today`) are ordinary ribbons with one null endpoint, so they are counted
 *  here too -- unaccounted mass shows up as an imbalance, never as a silent
 *  rounding hole.
 *
 *  @param flow  From buildFlow.
 *  @param eps   Byte tolerance; defaults to 0 (the arithmetic is exact).
 *  @returns     `[{ col, pkg, mass, inflow, outflow }]`, empty when balanced.
 *
 *  @example
 *  conservationViolations(buildFlow(pkgs))   // => []
 */
function conservationViolations(flow, eps) {
  const E = eps === undefined ? 0 : eps;
  const inflow = new Map(), outflow = new Map();
  const bump = (m, n, b) => { if (n) { m.set(n, (m.get(n) || 0) + b); } };
  for (const l of flow.links) { bump(inflow, l.to, l.bytes); bump(outflow, l.from, l.bytes); }

  const bad = [];
  for (const n of flow.nodes) {
    const i = inflow.get(n) || 0, o = outflow.get(n) || 0;
    if (Math.abs(i - n.mass) > E || Math.abs(o - n.mass) > E) {
      bad.push({ col: n.col, pkg: n.pkg, mass: n.mass, inflow: i, outflow: o });
    }
  }
  return bad;
}

/* ---- node-only below this marker; the browser copy is truncated here ---- */
module.exports = { stepAt, deriveEvents, decompositions, collapseColumns, columnLabel, sampleTime, buildFlow, conservationViolations };
