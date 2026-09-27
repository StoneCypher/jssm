// Learn.jsx — teaching panel for the five core ideas of fsl.
// Each step shows real fsl arrow syntax + the matching concept visual.

const STEPS = [
  {
    id: 1,
    eyebrow: 'graphs',
    title: 'Define graphs with arrows.',
    body: "An fsl program is a graph. States are nodes, arrows are edges — usually written inline as a tagged template. (You can also keep them in a `.fsl` file when they get long.)",
    code: [
      { t: 'k', v: 'import' }, { t: 'p', v: ' { ' }, { t: 'i', v: 'sm' }, { t: 'p', v: ' } ' }, { t: 'k', v: 'from' }, { t: 'p', v: ' ' }, { t: 's', v: "'jssm'" }, { t: 'p', v: ';' },
      { t: 'br' }, { t: 'br' },
      { t: 'k', v: 'const' }, { t: 'p', v: ' ' }, { t: 'i', v: 'light' }, { t: 'p', v: ' = ' }, { t: 'i', v: 'sm' }, { t: 'p', v: '`' },
      { t: 'br' },
      { t: 'p', v: '  ' }, { t: 's',  v: 'red' }, { t: 'p', v: ' ' }, { t: 'a', v: '→' }, { t: 'p', v: ' ' },
      { t: 's',  v: 'green' }, { t: 'p', v: ' ' }, { t: 'a', v: '→' }, { t: 'p', v: ' ' },
      { t: 's',  v: 'yellow' }, { t: 'p', v: ' ' }, { t: 'a', v: '→' }, { t: 'p', v: ' ' },
      { t: 's',  v: 'red' }, { t: 'p', v: ';' },
      { t: 'br' },
      { t: 'p', v: '`;' },
    ],
    visual: 'graph',
  },
  {
    id: 2,
    eyebrow: 'actions',
    title: 'Name actions for uniform behavior.',
    body: "Label each arrow with the action that takes it. Three different states, one shared verb — `next` advances the cycle wherever you are.",
    code: [
      { t: 'k', v: 'const' }, { t: 'p', v: ' ' }, { t: 'i', v: 'light' }, { t: 'p', v: ' = ' }, { t: 'i', v: 'sm' }, { t: 'p', v: '`' }, { t: 'br' },
      { t: 'p', v: '  ' }, { t: 's', v: 'red' }, { t: 'p', v: ' ' }, { t: 'k', v: "'next'" }, { t: 'p', v: ' ' }, { t: 'a', v: '→' }, { t: 'p', v: ' ' },
      { t: 's', v: 'green' }, { t: 'p', v: ' ' }, { t: 'k', v: "'next'" }, { t: 'p', v: ' ' }, { t: 'a', v: '→' }, { t: 'p', v: ' ' },
      { t: 'br' },
      { t: 'p', v: '  ' }, { t: 's', v: 'yellow' }, { t: 'p', v: ' ' }, { t: 'k', v: "'next'" }, { t: 'p', v: ' ' }, { t: 'a', v: '→' }, { t: 'p', v: ' ' },
      { t: 's', v: 'red' }, { t: 'p', v: ';' }, { t: 'br' },
      { t: 'p', v: '`;' }, { t: 'br' }, { t: 'br' },
      { t: 'i', v: 'light' }, { t: 'p', v: '.go(' }, { t: 'k', v: "'next'" }, { t: 'p', v: ');  ' }, { t: 'cm', v: '// red → green' },
    ],
    visual: 'actions',
  },
  {
    id: 3,
    eyebrow: 'refusal',
    title: "The machine refuses what you can't do.",
    body: "Actions that don't match an outgoing arrow are refused. jssm catches them when the graph is loaded and again at every transition.",
    code: [
      { t: 'cm', v: '// light.state() === \'red\'' }, { t: 'br' }, { t: 'br' },
      { t: 'i', v: 'light' }, { t: 'p', v: '.go(' }, { t: 'k', v: "'stop'" }, { t: 'p', v: ');    ' }, { t: 'err', v: "// refused — no action 'stop' on red" }, { t: 'br' },
      { t: 'i', v: 'light' }, { t: 'p', v: '.go(' }, { t: 'k', v: "'reset'" }, { t: 'p', v: ');   ' }, { t: 'err', v: "// refused — 'reset' is undefined" }, { t: 'br' },
      { t: 'i', v: 'light' }, { t: 'p', v: '.go(' }, { t: 'k', v: "'next'" }, { t: 'p', v: ');    ' }, { t: 'ok',  v: '// ok — red → green' },
    ],
    visual: 'refusal',
  },
  {
    id: 4,
    eyebrow: 'singularity',
    title: 'Always exactly one state.',
    body: "No nullable enum. No half-loaded transition. `m.state()` returns one of the declared states, full stop. Render off it without defensive code.",
    code: [
      { t: 'k', v: 'const' }, { t: 'p', v: ' ' }, { t: 'i', v: 'light' }, { t: 'p', v: ' = ' }, { t: 'i', v: 'sm' }, { t: 'p', v: '`' }, { t: 's', v: 'red' }, { t: 'p', v: ' ' }, { t: 'a', v: '→' }, { t: 'p', v: ' ' }, { t: 's', v: 'green' }, { t: 'p', v: ' ' }, { t: 'a', v: '→' }, { t: 'p', v: ' ' }, { t: 's', v: 'yellow' }, { t: 'p', v: ' ' }, { t: 'a', v: '→' }, { t: 'p', v: ' ' }, { t: 's', v: 'red' }, { t: 'p', v: ';`;' },
      { t: 'br' }, { t: 'br' },
      { t: 'i', v: 'light' }, { t: 'p', v: '.state() ' }, { t: 'cm', v: "// → 'red' | 'green' | 'yellow'" },
      { t: 'br' }, { t: 'br' },
      { t: 'k', v: 'switch' }, { t: 'p', v: ' (' }, { t: 'i', v: 'light' }, { t: 'p', v: '.state()) {' }, { t: 'br' },
      { t: 'p', v: '  ' }, { t: 'k', v: 'case' }, { t: 'p', v: ' ' }, { t: 's', v: "'red'" }, { t: 'p', v: ': ...; ' }, { t: 'k', v: 'break' }, { t: 'p', v: ';' }, { t: 'br' },
      { t: 'p', v: '  ' }, { t: 'cm', v: '// ...' },
      { t: 'br' },
      { t: 'p', v: '}' },
    ],
    visual: 'one',
  },
  {
    id: 5,
    eyebrow: 'hooks',
    title: 'React to changes with hooks.',
    body: "Subscribe to transitions and read the current state. Hooks are pure observers — they can't change the graph, only respond to it.",
    code: [
      { t: 'i', v: 'machine' }, { t: 'p', v: '.hook_any_transition(' }, { t: 'br' },
      { t: 'p', v: '  () => ' }, { t: 'i', v: 'console' }, { t: 'p', v: '.log(' }, { t: 'i', v: 'machine' }, { t: 'p', v: '.state())' }, { t: 'br' },
      { t: 'p', v: ');' }, { t: 'br' }, { t: 'br' },
      { t: 'cm', v: '// also: hook_entry, hook_exit, hook_action' },
    ],
    visual: 'hooks',
  },
];

const SYN = {
  s:  '#5fbeb1', // state
  k:  '#c4ae5a', // string / keyword-as-string
  a:  '#5fbeb1', // arrow
  i:  '#c9cfde', // identifier
  p:  '#c9cfde', // punctuation
  cm: 'rgb(201 207 222 / 50%)',
  err: '#c294c2',
  ok: '#5fbeb1',
};

function CodeBlock({ tokens }) {
  return (
    <pre style={{
      margin: 0, padding: '20px 24px',
      fontFamily: 'var(--font-mono)', fontSize: 14, lineHeight: 1.7,
      background: 'var(--bg-2)',
      border: '1px solid var(--rule)',
      borderRadius: 8,
      whiteSpace: 'pre-wrap', wordBreak: 'normal',
      overflow: 'auto',
    }}>
      {tokens.map((tok, i) => {
        if (tok.t === 'br') return <span key={i}>{'\n'}</span>;
        return <span key={i} style={{ color: SYN[tok.t] || 'var(--fg-1)' }}>{tok.v}</span>;
      })}
    </pre>
  );
}

function StateNode({ x, y, label, active, dim }) {
  return (
    <g>
      <rect x={x - 42} y={y - 18} width="84" height="36" rx="6"
            fill={active ? '#287a70' : '#3f2a59'}
            stroke={active ? '#5fbeb1' : 'rgb(201 207 222 / 22%)'}
            strokeWidth={active ? 1.5 : 1}
            opacity={dim ? 0.4 : 1}
            style={{ transition: 'all 200ms var(--ease)' }}/>
      <text x={x} y={y + 4} textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="13"
            fill={active ? '#fff' : '#c9cfde'} opacity={dim ? 0.5 : 1}>
        {label}
      </text>
    </g>
  );
}

function LearnVisual({ kind }) {
  const arrowDefs = (
    <defs>
      <marker id="lrn-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" fill="rgb(201 207 222 / 70%)"/>
      </marker>
      <marker id="lrn-a-acc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" fill="#5fbeb1"/>
      </marker>
      <marker id="lrn-a-err" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" fill="#c294c2"/>
      </marker>
    </defs>
  );

  if (kind === 'graph') {
    return (
      <svg viewBox="0 0 480 200" width="100%" style={{ display: 'block' }}>
        {arrowDefs}
        <StateNode x={80}  y={100} label="red"/>
        <StateNode x={240} y={100} label="green"/>
        <StateNode x={400} y={100} label="yellow"/>
        <line x1="122" y1="100" x2="198" y2="100" stroke="rgb(201 207 222 / 60%)" strokeWidth="1.2" markerEnd="url(#lrn-a)"/>
        <line x1="282" y1="100" x2="358" y2="100" stroke="rgb(201 207 222 / 60%)" strokeWidth="1.2" markerEnd="url(#lrn-a)"/>
        {/* loop back to red */}
        <path d="M 400 82 Q 400 30 240 30 Q 80 30 80 82"
              fill="none" stroke="rgb(201 207 222 / 60%)" strokeWidth="1.2"
              markerEnd="url(#lrn-a)"/>
      </svg>
    );
  }

  if (kind === 'actions') {
    return (
      <svg viewBox="0 0 480 200" width="100%" style={{ display: 'block' }}>
        {arrowDefs}
        <StateNode x={80}  y={100} label="red"/>
        <StateNode x={240} y={100} label="green"/>
        <StateNode x={400} y={100} label="yellow"/>
        <line x1="122" y1="100" x2="198" y2="100" stroke="rgb(201 207 222 / 60%)" strokeWidth="1.2" markerEnd="url(#lrn-a)"/>
        <line x1="282" y1="100" x2="358" y2="100" stroke="rgb(201 207 222 / 60%)" strokeWidth="1.2" markerEnd="url(#lrn-a)"/>
        <path d="M 400 82 Q 400 30 240 30 Q 80 30 80 82"
              fill="none" stroke="rgb(201 207 222 / 60%)" strokeWidth="1.2"
              markerEnd="url(#lrn-a)"/>
        {/* labels */}
        <text x={160} y={92} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#c4ae5a">'next'</text>
        <text x={320} y={92} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#c4ae5a">'next'</text>
        <text x={240} y={24} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#c4ae5a">'next'</text>
      </svg>
    );
  }

  if (kind === 'refusal') {
    return (
      <svg viewBox="0 0 480 200" width="100%" style={{ display: 'block' }}>
        {arrowDefs}
        <StateNode x={80}  y={110} label="red" active/>
        <StateNode x={240} y={110} label="green"/>
        <StateNode x={400} y={110} label="yellow"/>
        {/* declared edge: red → green */}
        <line x1="122" y1="110" x2="198" y2="110"
              stroke="#5fbeb1" strokeWidth="1.4" markerEnd="url(#lrn-a-acc)"/>
        <text x={160} y={102} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#5fbeb1">request: green ✓</text>
        {/* refused: red → yellow */}
        <path d="M 122 100 Q 240 50 358 100"
              fill="none" stroke="#7a577a" strokeWidth="1.2"
              strokeDasharray="4 4" markerEnd="url(#lrn-a-err)"/>
        <text x={240} y={45} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#c294c2">request: yellow ✗</text>
        {/* refused: blue (no node) */}
        <text x={240} y={180} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#c294c2">request: blue ✗  (not a state)</text>
      </svg>
    );
  }

  if (kind === 'one') {
    return (
      <svg viewBox="0 0 480 200" width="100%" style={{ display: 'block' }}>
        {arrowDefs}
        <StateNode x={80}  y={100} label="red"   dim/>
        <StateNode x={240} y={100} label="green" active/>
        <StateNode x={400} y={100} label="yellow" dim/>
        {/* spotlight on 'green' */}
        <circle cx={240} cy={100} r={70} fill="rgb(40 122 112 / 8%)"/>
        <text x={240} y={170} textAnchor="middle"
              fontFamily="JetBrains Mono, monospace" fontSize="11" fill="rgb(201 207 222 / 60%)">
          m.state() === 'green'
        </text>
        <text x={240} y={188} textAnchor="middle"
              fontFamily="JetBrains Mono, monospace" fontSize="10" fill="rgb(201 207 222 / 40%)">
          (exactly one — never two, never zero)
        </text>
      </svg>
    );
  }

  // hooks
  return (
    <svg viewBox="0 0 480 200" width="100%" style={{ display: 'block' }}>
      {arrowDefs}
      <StateNode x={120} y={90} label="red"/>
      <StateNode x={300} y={90} label="green" active/>
      <line x1="162" y1="90" x2="258" y2="90"
            stroke="#5fbeb1" strokeWidth="1.4" markerEnd="url(#lrn-a-acc)"/>
      <text x={210} y={82} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#5fbeb1">'next'</text>

      {/* hook callback box, fed by a tap on the transition */}
      <line x1="210" y1="100" x2="210" y2="140"
            stroke="rgb(40 122 112 / 70%)" strokeDasharray="3 3" strokeWidth="1"/>
      <rect x={70} y={140} width="280" height="36" rx="4" fill="var(--bg-2)" stroke="#287a70"/>
      <text x={210} y={163} textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#c9cfde">
        hook_any_transition(() {'=>'} <tspan fill="#5fbeb1">log</tspan>(<tspan fill="#5fbeb1">machine</tspan>.state()))
      </text>
      <text x={240} y={196} textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontSize="10" fill="rgb(201 207 222 / 50%)">
        fires after every transition · receives no args, reads state itself
      </text>
    </svg>
  );
}

function Learn() {
  const [active, setActive] = React.useState(1);
  const step = STEPS.find(s => s.id === active);

  return (
    <section id="learn" style={{
      padding: '64px 32px', maxWidth: 1200, margin: '0 auto',
      scrollMarginTop: 80,
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--accent)', marginBottom: 12,
      }}>// learn</div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        gap: 24, flexWrap: 'wrap', marginBottom: 32,
      }}>
        <h2 style={{
          margin: 0,
          fontFamily: 'var(--font-sans)', fontSize: 32, fontWeight: 600,
          letterSpacing: '-0.02em', color: 'var(--fg-1)',
        }}>Five ideas. That's the main language.</h2>
        <p style={{
          margin: 0, maxWidth: 480, fontSize: 15, lineHeight: 1.55, color: 'var(--fg-2)',
        }}>
          fsl is small on purpose. Read these five pages and you'll know
          enough to ship a machine in production.
        </p>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '300px 1fr', gap: 0,
        background: 'var(--bg-1)', border: '1px solid var(--rule)', borderRadius: 12,
        overflow: 'hidden', minHeight: 460,
      }}>
        {/* Step rail */}
        <div style={{
          borderRight: '1px solid var(--rule)',
          background: 'rgb(0 0 0 / 10%)',
          padding: '16px 0',
          display: 'flex', flexDirection: 'column',
        }}>
          {STEPS.map(s => {
            const isActive = s.id === active;
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                style={{
                  textAlign: 'left', cursor: 'pointer',
                  background: 'transparent', border: 'none',
                  borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  padding: '14px 22px',
                  display: 'flex', gap: 14, alignItems: 'baseline',
                  transition: 'background 120ms var(--ease)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = isActive ? 'transparent' : 'rgb(255 255 255 / 3%)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: isActive ? 'var(--accent)' : 'var(--fg-4)',
                  width: 18, flexShrink: 0,
                }}>0{s.id}</span>
                <span style={{
                  fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
                  color: isActive ? 'var(--fg-1)' : 'var(--fg-2)',
                  lineHeight: 1.4,
                }}>{s.title}</span>
              </button>
            );
          })}

          <div style={{
            marginTop: 'auto', padding: '20px 22px',
            borderTop: '1px solid var(--rule)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            <button
              onClick={() => setActive(a => Math.max(1, a - 1))}
              disabled={active === 1}
              style={{
                background: 'transparent', border: 'none',
                color: active === 1 ? 'var(--fg-4)' : 'var(--fg-2)',
                cursor: active === 1 ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', fontSize: 'inherit',
                letterSpacing: 'inherit', textTransform: 'inherit',
                padding: 0,
              }}
            >← prev</button>
            <span>{active}/{STEPS.length}</span>
            <button
              onClick={() => setActive(a => Math.min(STEPS.length, a + 1))}
              disabled={active === STEPS.length}
              style={{
                background: 'transparent', border: 'none',
                color: active === STEPS.length ? 'var(--fg-4)' : 'var(--fg-2)',
                cursor: active === STEPS.length ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', fontSize: 'inherit',
                letterSpacing: 'inherit', textTransform: 'inherit',
                padding: 0,
              }}
            >next →</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>// {step.eyebrow} · idea {step.id} of {STEPS.length}</div>
          <h3 style={{
            margin: 0, fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 500,
            color: 'var(--fg-1)', letterSpacing: '-0.02em', lineHeight: 1.2,
          }}>{step.title}</h3>
          <p style={{
            margin: 0, fontSize: 16, lineHeight: 1.6, color: 'var(--fg-2)',
            maxWidth: 640, textWrap: 'pretty',
          }}>{step.body}</p>

          <CodeBlock tokens={step.code}/>

          <div style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--rule)',
            borderRadius: 8,
            overflow: 'hidden',
            padding: '12px 16px',
          }}>
            <LearnVisual kind={step.visual}/>
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 24,
        display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
        fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-3)',
      }}>
        <span>continue with the full guide:</span>
        <a style={{
          color: 'var(--accent)', textDecoration: 'none',
          borderBottom: '1px solid var(--accent-dim)',
          paddingBottom: 1, cursor: 'pointer',
        }}>language reference →</a>
        <a style={{
          color: 'var(--accent)', textDecoration: 'none',
          borderBottom: '1px solid var(--accent-dim)',
          paddingBottom: 1, cursor: 'pointer',
        }}>diagnostic catalogue →</a>
        <a style={{
          color: 'var(--accent)', textDecoration: 'none',
          borderBottom: '1px solid var(--accent-dim)',
          paddingBottom: 1, cursor: 'pointer',
        }}>cookbook →</a>
      </div>
    </section>
  );
}

window.Learn = Learn;
