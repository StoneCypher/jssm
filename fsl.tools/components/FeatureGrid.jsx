function MiniDiagram({ variant }) {
  if (variant === 'transitions') {
    return (
      <svg width="100%" height="64" viewBox="0 0 240 64" preserveAspectRatio="xMinYMid meet">
        <g fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#c9cfde" textAnchor="middle">
          <rect x="6" y="22" width="60" height="22" rx="4" fill="#3f2a59" stroke="#287a70" strokeWidth="1.2"/>
          <text x="36" y="37">a</text>
          <rect x="100" y="22" width="60" height="22" rx="4" fill="#3f2a59" stroke="rgb(201 207 222 / 22%)"/>
          <text x="130" y="37">b</text>
          <rect x="194" y="22" width="40" height="22" rx="4" fill="#3f2a59" stroke="rgb(201 207 222 / 22%)"/>
          <text x="214" y="37">c</text>
        </g>
        <g fill="none" stroke="rgb(201 207 222 / 50%)" strokeWidth="1.1">
          <path d="M66 33 L100 33" markerEnd="url(#a1)"/>
          <path d="M160 33 L194 33" markerEnd="url(#a1)"/>
        </g>
        <defs>
          <marker id="a1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#c9cfde" opacity="0.5"/>
          </marker>
        </defs>
      </svg>
    );
  }
  if (variant === 'exhaust') {
    return (
      <svg width="100%" height="64" viewBox="0 0 240 64" preserveAspectRatio="xMinYMid meet">
        <g fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#c9cfde">
          <text x="10" y="20">case 'idle':    ✓</text>
          <text x="10" y="36">case 'paid':    ✓</text>
          <text x="10" y="52" fill="#7a577a">case 'aborted': ✗ missing</text>
        </g>
      </svg>
    );
  }
  // 'inference'
  return (
    <svg width="100%" height="64" viewBox="0 0 240 64" preserveAspectRatio="xMinYMid meet">
      <g fontFamily="JetBrains Mono, monospace" fontSize="10">
        <text x="10" y="20" fill="#5fbeb1">red</text>
        <text x="40" y="20" fill="#c4ae5a">'next'</text>
        <text x="86" y="20" fill="#5fbeb1">→</text>
        <text x="100" y="20" fill="#5fbeb1">green;</text>
        <text x="10" y="38" fill="#5fbeb1">green</text>
        <text x="48" y="38" fill="#c4ae5a">'next'</text>
        <text x="94" y="38" fill="#5fbeb1">→</text>
        <text x="108" y="38" fill="#5fbeb1">yellow;</text>
        <text x="10" y="56" fill="#5fbeb1">yellow</text>
        <text x="56" y="56" fill="#c4ae5a">'next'</text>
        <text x="102" y="56" fill="#5fbeb1">→</text>
        <text x="116" y="56" fill="#5fbeb1">red;</text>
      </g>
    </svg>
  );
}

function Feature({ eyebrow, title, body, variant }) {
  return (
    <div style={{
      padding: 24,
      background: 'var(--bg-1)',
      border: '1px solid var(--rule)',
      borderRadius: 8,
      display: 'flex', flexDirection: 'column', gap: 16,
      boxShadow: '0 1px 0 rgb(255 255 255 / 4%) inset',
    }}>
      <div style={{
        height: 64,
        background: 'var(--bg-2)',
        border: '1px solid var(--rule)',
        borderRadius: 6,
        display: 'flex', alignItems: 'center',
      }}>
        <MiniDiagram variant={variant}/>
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--accent)',
      }}>{eyebrow}</div>
      <h3 style={{
        margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--fg-1)',
        letterSpacing: '-0.01em',
      }}>{title}</h3>
      <p style={{
        margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--fg-2)',
        textWrap: 'pretty',
      }}>{body}</p>
    </div>
  );
}

function FeatureGrid() {
  return (
    <section style={{ padding: '64px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
      }}>
        <Feature
          eyebrow="// arrows"
          title="Write the picture"
          body="An fsl file is the graph you'd draw. States, arrows, named actions. The compiler reads what you wrote, not what you meant."
          variant="transitions"
        />
        <Feature
          eyebrow="// refusal"
          title="Bad moves stop at the door"
          body="If there's no edge from `at` to where you want to go, jssm refuses — when the graph is loaded, and again at runtime."
          variant="exhaust"
        />
        <Feature
          eyebrow="// one state"
          title="Always exactly one"
          body="`m.state()` returns a single declared state. No nullable enum, no half-loaded transition. Render off it without defensive code."
          variant="inference"
        />
      </div>
    </section>
  );
}

window.FeatureGrid = FeatureGrid;
