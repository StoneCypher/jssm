// CookbookRecipeView.jsx — render one recipe from the data record.

function CookbookRecipeView({ recipe }) {
  const { id, n, category, title, problem, blocks = [], graph, note, tags } = recipe;

  return (
    <article id={id} style={{
      padding: '56px 0', borderTop: '1px solid var(--rule)',
      scrollMarginTop: 80,
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 14,
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--fg-3)', marginBottom: 12,
      }}>
        <span style={{ color: 'var(--accent)' }}>// {category}</span>
        <span>r{String(n).padStart(2, '0')}</span>
        {tags && tags.length > 0 && (
          <span style={{ color: 'var(--fg-4)' }}>· {tags.slice(0, 3).join(' · ')}</span>
        )}
      </div>

      <h2 style={{
        margin: '0 0 14px',
        fontFamily: 'var(--font-sans)', fontSize: 28, fontWeight: 600,
        letterSpacing: '-0.02em', color: 'var(--fg-1)', lineHeight: 1.15,
      }}>{title}</h2>

      <p style={{
        margin: '0 0 24px', maxWidth: 720,
        fontSize: 16, lineHeight: 1.6, color: 'var(--fg-2)', textWrap: 'pretty',
      }}>{problem}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {blocks.map((b, i) => (
          <div key={i}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--fg-3)', marginBottom: 6,
            }}>{b.kind}</div>
            <CookbookCode tokens={b.tokens} lang={b.kind}/>
          </div>
        ))}

        {graph && (
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--fg-3)', marginBottom: 6,
            }}>graph</div>
            <div style={{
              background: 'var(--bg-1)', border: '1px solid var(--rule)',
              borderRadius: 8, padding: 16,
            }}>
              <CookbookGraph {...graph}/>
            </div>
          </div>
        )}

        {note && (
          <p style={{
            margin: 0, fontSize: 14.5, lineHeight: 1.6, color: 'var(--fg-2)',
            maxWidth: 720, textWrap: 'pretty',
            paddingLeft: 16, borderLeft: '2px solid var(--rule-2)',
          }}>{renderNote(note)}</p>
        )}
      </div>
    </article>
  );
}

// Tiny inline-code/em renderer for note strings: `code` and *em*
function renderNote(s) {
  const out = [];
  let buf = '';
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '`') {
      const end = s.indexOf('`', i + 1);
      if (end > i) {
        if (buf) { out.push(buf); buf = ''; }
        out.push(<code key={out.length} style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.92em',
          background: 'var(--bg-2)', border: '1px solid var(--rule)',
          padding: '1px 6px', borderRadius: 4, color: 'var(--fg-1)',
        }}>{s.slice(i + 1, end)}</code>);
        i = end + 1; continue;
      }
    }
    if (ch === '*') {
      const end = s.indexOf('*', i + 1);
      if (end > i) {
        if (buf) { out.push(buf); buf = ''; }
        out.push(<em key={out.length}>{s.slice(i + 1, end)}</em>);
        i = end + 1; continue;
      }
    }
    buf += ch; i++;
  }
  if (buf) out.push(buf);
  return out;
}

window.CookbookRecipeView = CookbookRecipeView;
