// CookbookGraph.jsx — small SVG state-graph for cookbook recipes.
// Pass nodes (id, label, x, y) and edges (from, to, label, curve, arc).

function CBNode({ x, y, label, accent }) {
  const isAccent = !!accent;
  return (
    <g>
      <rect
        x={x - 52} y={y - 22} width={104} height={44} rx={8}
        fill={isAccent ? 'rgb(40 122 112 / 18%)' : 'var(--bg-2)'}
        stroke={isAccent ? 'var(--accent)' : 'var(--rule-2)'}
        strokeWidth={1}
      />
      <text x={x} y={y + 5}
        textAnchor="middle"
        fontFamily="var(--font-mono)" fontSize={13}
        fill={isAccent ? 'var(--accent)' : 'var(--fg-1)'}
      >{label}</text>
    </g>
  );
}

function CBEdge({ x1, y1, x2, y2, label, curve, arcOffset = 32 }) {
  let path;
  let labelPos;
  if (curve === 'self') {
    // self-loop above node
    const r = 22;
    path = `M ${x1 - 10} ${y1 - r} C ${x1 - 30} ${y1 - r - 30}, ${x1 + 30} ${y1 - r - 30}, ${x1 + 10} ${y1 - r}`;
    labelPos = { x: x1, y: y1 - r - 24 };
  } else if (curve === 'arc') {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 + arcOffset;
    path = `M ${x1} ${y1} Q ${mx} ${my}, ${x2} ${y2}`;
    labelPos = { x: mx, y: my + 4 };
  } else if (curve === 'arc-up') {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 - arcOffset;
    path = `M ${x1} ${y1} Q ${mx} ${my}, ${x2} ${y2}`;
    labelPos = { x: mx, y: my - 6 };
  } else {
    path = `M ${x1} ${y1} L ${x2} ${y2}`;
    // Offset label perpendicular to the line so it doesn't sit on top of it.
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len; // unit normal (90° ccw)
    const off = 12;
    labelPos = {
      x: (x1 + x2) / 2 + nx * off,
      y: (y1 + y2) / 2 + ny * off + 3,
    };
  }
  return (
    <g>
      <path d={path} stroke="var(--rule-2)" strokeWidth={1.25} fill="none" markerEnd="url(#cb-arrow)"/>
      {label && (
        <text x={labelPos.x} y={labelPos.y} textAnchor="middle"
          fontFamily="var(--font-mono)" fontSize={11}
          fill="var(--fg-3)"
        >{label}</text>
      )}
    </g>
  );
}

function CookbookGraph({ width = 520, height = 200, nodes, edges, accentNode }) {
  const NW = 52; // node half width
  const NH = 22;
  // Compute edge endpoints on node bounds (simple horizontal/vertical only)
  function endpoint(from, to) {
    const dx = to.x - from.x, dy = to.y - from.y;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (adx > ady) {
      return { x: from.x + Math.sign(dx) * NW, y: from.y };
    }
    return { x: from.x, y: from.y + Math.sign(dy) * NH };
  }

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <marker id="cb-arrow" viewBox="0 0 10 10" refX="9" refY="5"
          markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--rule-2)"/>
        </marker>
      </defs>
      {edges.map((e, i) => {
        const from = nodes.find(n => n.id === e.from);
        const to = nodes.find(n => n.id === e.to);
        if (!from || !to) return null;
        if (e.curve === 'self') {
          return <CBEdge key={i} x1={from.x} y1={from.y} x2={from.x} y2={from.y} label={e.label} curve="self"/>;
        }
        const start = endpoint(from, to);
        const end = endpoint(to, from);
        return <CBEdge key={i} x1={start.x} y1={start.y} x2={end.x} y2={end.y} label={e.label} curve={e.curve} arcOffset={e.arcOffset}/>;
      })}
      {nodes.map(n => (
        <CBNode key={n.id} x={n.x} y={n.y} label={n.label || n.id} accent={n.id === accentNode}/>
      ))}
    </svg>
  );
}

window.CookbookGraph = CookbookGraph;
