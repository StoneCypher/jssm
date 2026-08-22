// Examples.jsx — interactive multi-tab example explorer.
// Each example is a real fsl machine, written in arrow-syntax.

const EXAMPLES = {
  toggle: {
    label: 'toggle',
    file: 'lamp.ts',
    blurb: 'The smallest useful machine. Two states, one verb.',
    recipe: 'cookbook/patterns-toggle.html',
    initial: 'off',
    states: ['off', 'on'],
    layout: { off: { x: 130, y: 110 }, on: { x: 410, y: 110 } },
    edges: [
      { from: 'off', to: 'on',  event: 'flip', curve: 'top' },
      { from: 'on',  to: 'off', event: 'flip', curve: 'bottom' },
    ],
    events: ['flip'],
    transition: (s, e) => e === 'flip' ? (s === 'off' ? 'on' : 'off') : s,
    code: [
      ['k', 'const'], ['p', ' '], ['i', 'lamp'], ['p', ' = '], ['i', 'sm'], ['p', '`'], ['br', ''],
      ['p', '  '], ['s', 'off'], ['p', ' '], ['k', "'flip'"], ['p', ' '], ['a', '→'], ['p', ' '], ['s', 'on'], ['p', ';'], ['br', ''],
      ['p', '  '], ['s', 'on'],  ['p', '  '], ['k', "'flip'"], ['p', ' '], ['a', '→'], ['p', ' '], ['s', 'off'], ['p', ';'], ['br', ''],
      ['p', '`;'],
    ],
  },

  traffic: {
    label: 'traffic light',
    file: 'traffic.ts',
    blurb: 'A linear cycle. red → green → yellow → red, on a single shared verb.',
    recipe: 'cookbook/patterns-cycle.html',
    initial: 'red',
    states: ['red', 'green', 'yellow'],
    layout: { red: { x: 90, y: 110 }, green: { x: 270, y: 110 }, yellow: { x: 450, y: 110 } },
    edges: [
      { from: 'red', to: 'green', event: 'next' },
      { from: 'green', to: 'yellow', event: 'next' },
      { from: 'yellow', to: 'red', event: 'next', curve: 'arc', arcOffset: 60 },
    ],
    events: ['next'],
    transition: (s, e) => {
      if (e !== 'next') return s;
      if (s === 'red')    return 'green';
      if (s === 'green')  return 'yellow';
      if (s === 'yellow') return 'red';
      return s;
    },
    code: [
      ['k', 'const'], ['p', ' '], ['i', 'light'], ['p', ' = '], ['i', 'sm'], ['p', '`'], ['br', ''],
      ['p', '  '], ['s', 'red'],    ['p', '    '], ['k', "'next'"], ['p', ' '], ['a', '→'], ['p', ' '], ['s', 'green'], ['p', ';'], ['br', ''],
      ['p', '  '], ['s', 'green'],  ['p', '  '],   ['k', "'next'"], ['p', ' '], ['a', '→'], ['p', ' '], ['s', 'yellow'], ['p', ';'], ['br', ''],
      ['p', '  '], ['s', 'yellow'], ['p', ' '],    ['k', "'next'"], ['p', ' '], ['a', '→'], ['p', ' '], ['s', 'red'], ['p', ';'], ['br', ''],
      ['p', '`;'],
    ],
  },

  fetch: {
    label: 'data fetch',
    file: 'request.ts',
    blurb: 'Loading, success, and failure as states — not as nullable booleans.',
    recipe: 'cookbook/patterns-fetch.html',
    initial: 'idle',
    states: ['idle', 'loading', 'success', 'error'],
    layout: {
      idle:    { x: 80,  y: 60  },
      loading: { x: 270, y: 60  },
      success: { x: 460, y: 30  },
      error:   { x: 460, y: 150 },
    },
    edges: [
      { from: 'idle',    to: 'loading', event: 'fetch' },
      { from: 'loading', to: 'success', event: 'resolve' },
      { from: 'loading', to: 'error',   event: 'reject' },
      { from: 'success', to: 'idle',    event: 'reset', curve: 'top' },
      { from: 'error',   to: 'loading', event: 'retry' },
    ],
    events: ['fetch', 'resolve', 'reject', 'retry', 'reset'],
    transition: (s, e) => {
      if (s === 'idle'    && e === 'fetch')   return 'loading';
      if (s === 'loading' && e === 'resolve') return 'success';
      if (s === 'loading' && e === 'reject')  return 'error';
      if (s === 'success' && e === 'reset')   return 'idle';
      if (s === 'error'   && e === 'retry')   return 'loading';
      return s;
    },
    code: [
      ['k', 'const'], ['p', ' '], ['i', 'req'], ['p', ' = '], ['i', 'sm'], ['p', '`'], ['br', ''],
      ['p', '  '], ['s', 'idle'],    ['p', '    '], ['k', "'fetch'"],   ['p', '   '], ['a', '→'], ['p', ' '], ['s', 'loading'], ['p', ';'], ['br', ''],
      ['p', '  '], ['s', 'loading'], ['p', ' '],    ['k', "'resolve'"], ['p', ' '],   ['a', '→'], ['p', ' '], ['s', 'success'], ['p', ';'], ['br', ''],
      ['p', '  '], ['s', 'loading'], ['p', ' '],    ['k', "'reject'"],  ['p', '  '],  ['a', '→'], ['p', ' '], ['s', 'error'],   ['p', ';'], ['br', ''],
      ['p', '  '], ['s', 'success'], ['p', ' '],    ['k', "'reset'"],   ['p', '   '], ['a', '→'], ['p', ' '], ['s', 'idle'],    ['p', ';'], ['br', ''],
      ['p', '  '], ['s', 'error'],   ['p', '   '],  ['k', "'retry'"],   ['p', '   '], ['a', '→'], ['p', ' '], ['s', 'loading'], ['p', ';'], ['br', ''],
      ['p', '`;'],
    ],
  },

  auth: {
    label: 'auth flow',
    file: 'session.ts',
    blurb: "Real-world branching. fsl rejects 'logout' while you're still signing in.",
    recipe: 'cookbook/patterns-auth.html',
    initial: 'anon',
    states: ['anon', 'authing', 'authed', 'failed'],
    layout: {
      anon:    { x: 80,  y: 110 },
      authing: { x: 250, y: 110 },
      authed:  { x: 440, y: 50  },
      failed:  { x: 440, y: 170 },
    },
    edges: [
      { from: 'anon',    to: 'authing', event: 'login' },
      { from: 'authing', to: 'authed',  event: 'ok' },
      { from: 'authing', to: 'failed',  event: 'fail' },
      { from: 'authed',  to: 'anon',    event: 'logout', curve: 'arc' },
      { from: 'failed',  to: 'authing', event: 'login' },
    ],
    events: ['login', 'ok', 'fail', 'logout'],
    transition: (s, e) => {
      if (s === 'anon'    && e === 'login')  return 'authing';
      if (s === 'authing' && e === 'ok')     return 'authed';
      if (s === 'authing' && e === 'fail')   return 'failed';
      if (s === 'authed'  && e === 'logout') return 'anon';
      if (s === 'failed'  && e === 'login')  return 'authing';
      return s;
    },
    code: [
      ['k', 'const'], ['p', ' '], ['i', 'session'], ['p', ' = '], ['i', 'sm'], ['p', '`'], ['br', ''],
      ['p', '  '], ['s', 'anon'],    ['p', '    '], ['k', "'login'"],  ['p', '  '], ['a', '→'], ['p', ' '], ['s', 'authing'], ['p', ';'], ['br', ''],
      ['p', '  '], ['s', 'authing'], ['p', ' '],    ['k', "'ok'"],     ['p', '     '], ['a', '→'], ['p', ' '], ['s', 'authed'],  ['p', ';'], ['br', ''],
      ['p', '  '], ['s', 'authing'], ['p', ' '],    ['k', "'fail'"],   ['p', '   '], ['a', '→'], ['p', ' '], ['s', 'failed'],  ['p', ';'], ['br', ''],
      ['p', '  '], ['s', 'authed'],  ['p', '  '],   ['k', "'logout'"], ['p', ' '], ['a', '→'], ['p', ' '], ['s', 'anon'],    ['p', ';'], ['br', ''],
      ['p', '  '], ['s', 'failed'],  ['p', '  '],   ['k', "'login'"],  ['p', '  '], ['a', '→'], ['p', ' '], ['s', 'authing'], ['p', ';'], ['br', ''],
      ['p', '`;'],
    ],
  },
};

const EX_TOK = {
  s:  '#5fbeb1', // state name
  k:  '#c4ae5a', // 'string' (event)
  a:  '#5fbeb1', // arrow
  p:  '#c9cfde',
  cm: 'rgb(201 207 222 / 50%)',
};

function ExCode({ tokens }) {
  return (
    <pre style={{
      margin: 0, padding: '20px 24px',
      fontFamily: 'var(--font-mono)', fontSize: 14, lineHeight: 1.7,
      color: 'var(--fg-1)', overflow: 'auto', background: 'transparent',
      whiteSpace: 'pre-wrap', wordBreak: 'normal',
    }}>
      {tokens.map(([t, v], i) => {
        if (t === 'br') return <span key={i}>{'\n'}</span>;
        return <span key={i} style={{ color: EX_TOK[t] || 'var(--fg-1)' }}>{v}</span>;
      })}
    </pre>
  );
}

function Diagram({ ex, current, history }) {
  const W = 540, H = 220;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <defs>
        <marker id="exa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="rgb(201 207 222 / 70%)"/>
        </marker>
        <marker id="exa-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#5fbeb1"/>
        </marker>
      </defs>

      {(() => {
        // Detect bidirectional pairs (A→B AND B→A both un-curved) so we can
        // bow each one to the side instead of stacking labels on the same line.
        const pairKey = (f, t) => [f, t].sort().join('|');
        const pairCounts = {};
        ex.edges.forEach(e => {
          if (e.curve) return;
          const k = pairKey(e.from, e.to);
          pairCounts[k] = (pairCounts[k] || 0) + 1;
        });
        return ex.edges.map((edge, i) => {
          const a = ex.layout[edge.from], b = ex.layout[edge.to];
          const justFired = history[history.length - 1] === edge.event && current === edge.to;
          const stroke = justFired ? '#5fbeb1' : 'rgb(201 207 222 / 45%)';
          const labelFill = justFired ? '#5fbeb1' : 'rgb(201 207 222 / 60%)';
          const marker = justFired ? 'url(#exa-active)' : 'url(#exa)';

          const dx = b.x - a.x, dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len, uy = dy / len;
          const NODE_W = 100, NODE_H = 40;
          const horiz = Math.abs(ux) > Math.abs(uy);
          const inset = horiz ? NODE_W / 2 : NODE_H / 2;
          const x1 = a.x + ux * inset, y1 = a.y + uy * inset;
          const x2 = b.x - ux * inset, y2 = b.y - uy * inset;

          // perpendicular unit vector (rotate (ux,uy) 90° CCW)
          const px = -uy, py = ux;

          if (edge.curve === 'arc' || edge.curve === 'top' || edge.curve === 'bottom') {
            const dir = edge.curve === 'bottom' ? 1 : -1;
            const offset = edge.arcOffset != null ? edge.arcOffset : 36;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2 + dir * offset;
            const labelY = my + dir * 6 - (dir > 0 ? 0 : 4);
            return (
              <g key={i}>
                <path d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                      fill="none" stroke={stroke} strokeWidth="1.2" markerEnd={marker}/>
                <text x={mx} y={labelY} textAnchor="middle"
                      fontFamily="JetBrains Mono, monospace" fontSize="10" fill={labelFill}>
                  {`'${edge.event}'`}
                </text>
              </g>
            );
          }

          // Bidirectional pair? Bow each direction to a fixed world-space side.
          const isPair = pairCounts[pairKey(edge.from, edge.to)] > 1;
          if (isPair) {
            // Compute perpendicular from the canonical (lex-smaller→larger) orientation
            // so it doesn't flip with edge direction. Then sideSign picks opposite sides.
            const canonFrom = edge.from < edge.to ? a : b;
            const canonTo   = edge.from < edge.to ? b : a;
            const cdx = canonTo.x - canonFrom.x, cdy = canonTo.y - canonFrom.y;
            const clen = Math.hypot(cdx, cdy) || 1;
            const cux = cdx / clen, cuy = cdy / clen;
            const cpx = -cuy, cpy = cux; // canonical perpendicular (stable)
            const sideSign = edge.from < edge.to ? 1 : -1;
            const BOW = 22;
            const cx0 = (x1 + x2) / 2 + cpx * BOW * sideSign;
            const cy0 = (y1 + y2) / 2 + cpy * BOW * sideSign;
            const lx = (x1 + x2) / 2 + cpx * (BOW + 7) * sideSign;
            const ly = (y1 + y2) / 2 + cpy * (BOW + 7) * sideSign;
            return (
              <g key={i}>
                <path d={`M ${x1} ${y1} Q ${cx0} ${cy0} ${x2} ${y2}`}
                      fill="none" stroke={stroke} strokeWidth="1.2" markerEnd={marker}/>
                <text x={lx} y={ly + 3} textAnchor="middle"
                      fontFamily="JetBrains Mono, monospace" fontSize="10" fill={labelFill}>
                  {`'${edge.event}'`}
                </text>
              </g>
            );
          }

          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={stroke} strokeWidth="1.2" markerEnd={marker}/>
              <text x={mx} y={my - 6} textAnchor="middle"
                    fontFamily="JetBrains Mono, monospace" fontSize="10" fill={labelFill}>
                {`'${edge.event}'`}
              </text>
            </g>
          );
        });
      })()}

      {ex.states.map(s => {
        const p = ex.layout[s];
        const isActive = s === current;
        return (
          <g key={s} style={{ transition: 'all 200ms var(--ease)' }}>
            <rect x={p.x - 50} y={p.y - 20} width="100" height="40" rx="6"
                  fill={isActive ? '#287a70' : '#3f2a59'}
                  stroke={isActive ? '#5fbeb1' : 'rgb(201 207 222 / 22%)'}
                  strokeWidth={isActive ? 1.5 : 1}
                  style={{ transition: 'all 200ms var(--ease)' }}/>
            <text x={p.x} y={p.y + 5} textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace" fontSize="13"
                  fill={isActive ? '#fff' : '#c9cfde'}>{s}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Examples() {
  const [activeKey, setActiveKey] = React.useState('traffic');
  const ex = EXAMPLES[activeKey];
  const [current, setCurrent] = React.useState(ex.initial);
  const [history, setHistory] = React.useState([]);
  const [rejected, setRejected] = React.useState(null);

  React.useEffect(() => {
    setCurrent(ex.initial);
    setHistory([]);
    setRejected(null);
  }, [activeKey]);

  const fire = (event) => {
    const next = ex.transition(current, event);
    if (next === current) {
      setRejected(event);
      setTimeout(() => setRejected(null), 1000);
      return;
    }
    setCurrent(next);
    setHistory(h => [...h.slice(-6), event]);
  };

  const reset = () => {
    setCurrent(ex.initial);
    setHistory([]);
    setRejected(null);
  };

  const allowed = (event) => ex.transition(current, event) !== current;

  return (
    <section id="examples" style={{ padding: '64px 32px', maxWidth: 1200, margin: '0 auto', scrollMarginTop: 80 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--accent)', marginBottom: 12,
      }}>// examples</div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        gap: 24, flexWrap: 'wrap', marginBottom: 32,
      }}>
        <h2 style={{
          margin: 0,
          fontFamily: 'var(--font-sans)', fontSize: 32, fontWeight: 600,
          letterSpacing: '-0.02em', color: 'var(--fg-1)',
        }}>Drive a real machine.</h2>
        <p style={{
          margin: 0, maxWidth: 520, fontSize: 15, lineHeight: 1.55, color: 'var(--fg-2)',
        }}>
          Each example is a real jssm machine, written inline as a tagged
          template. Send events to the running machine; rejected events show
          what jssm refuses when the graph is loaded.
        </p>
      </div>

      <div style={{
        display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap',
        borderBottom: '1px solid var(--rule)',
      }}>
        {Object.entries(EXAMPLES).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setActiveKey(k)}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 13,
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: '12px 18px',
              color: activeKey === k ? 'var(--accent)' : 'var(--fg-2)',
              borderBottom: activeKey === k ? '1px solid var(--accent)' : '1px solid transparent',
              marginBottom: -1,
              transition: 'color 120ms var(--ease)',
            }}
          >{v.label}</button>
        ))}
      </div>

      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 24, flexWrap: 'wrap',
        margin: '0 0 20px',
      }}>
        <p style={{
          margin: 0, maxWidth: 720, fontSize: 14, lineHeight: 1.55,
          color: 'var(--fg-3)', fontStyle: 'italic', flex: 1,
        }}>{ex.blurb}</p>
        {ex.recipe && (
          <a href={ex.recipe} style={{
            fontFamily: 'var(--font-mono)', fontSize: 12,
            color: 'var(--accent)', textDecoration: 'none',
            borderBottom: '1px solid var(--accent-dim)',
            paddingBottom: 1, whiteSpace: 'nowrap',
          }}>View full recipe →</a>
        )}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
        background: 'var(--bg-1)', border: '1px solid var(--rule)', borderRadius: 12,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: 28, borderRight: '1px solid var(--rule)',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>diagram</span>
            <button
              onClick={reset}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                background: 'transparent', border: '1px solid var(--rule)',
                color: 'var(--fg-3)', cursor: 'pointer',
                padding: '4px 10px', borderRadius: 4,
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}
            >reset</button>
          </div>

          <Diagram ex={ex} current={current} history={history}/>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>request</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ex.events.map(ev => {
                const ok = allowed(ev);
                const isRejected = rejected === ev;
                return (
                  <button
                    key={ev}
                    onClick={() => fire(ev)}
                    style={{
                      fontFamily: 'var(--font-mono)', fontSize: 13,
                      padding: '8px 14px', borderRadius: 4, cursor: 'pointer',
                      background: ok ? 'var(--accent)' : 'transparent',
                      color: ok ? '#fff' : (isRejected ? '#c294c2' : 'var(--fg-3)'),
                      border: ok
                        ? '1px solid var(--accent)'
                        : `1px solid ${isRejected ? '#7a577a' : 'var(--rule)'}`,
                      transition: 'all 120ms var(--ease)',
                    }}
                  >
                    {`'${ev}'`}
                    {!ok && <span style={{ marginLeft: 6, opacity: 0.6 }}>✗</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{
            padding: '12px 14px',
            background: 'var(--bg-2)',
            border: '1px solid var(--rule)',
            borderRadius: 6,
            fontFamily: 'var(--font-mono)', fontSize: 12,
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ color: 'var(--fg-3)' }}>
              at: <span style={{ color: 'var(--accent)' }}>{current}</span>
            </div>
            <div style={{ color: 'var(--fg-3)', minHeight: 16 }}>
              {rejected
                ? <span style={{ color: '#c294c2' }}>
                    refused: '<span style={{ color: '#c4ae5a' }}>{rejected}</span>' has no edge from '<span style={{ color: '#5fbeb1' }}>{current}</span>'
                  </span>
                : history.length > 0
                  ? <span>history: {history.map((h, i) => (
                      <span key={i}>
                        <span style={{ color: 'var(--fg-2)' }}>'{h}'</span>
                        {i < history.length - 1 && <span style={{ color: 'var(--fg-4)', margin: '0 4px' }}>→</span>}
                      </span>
                    ))}</span>
                  : <span style={{ color: 'var(--fg-4)' }}>no transitions yet</span>
              }
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-2)', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            padding: '10px 16px', borderBottom: '1px solid var(--rule)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'rgb(0 0 0 / 12%)',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>{ex.file}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>jssm + fsl</span>
          </div>
          <ExCode tokens={ex.code}/>
        </div>
      </div>
    </section>
  );
}

window.Examples = Examples;
