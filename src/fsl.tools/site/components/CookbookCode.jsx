// CookbookCode.jsx — shared syntax-highlighted code block for cookbook recipes.
// Token shape: ['t', 'value'] where t in {k,s,a,i,p,cm,err,ok,br,n}

const CB_SYN = {
  s:  '#5fbeb1', // state name
  k:  '#c4ae5a', // keyword / event string
  a:  '#5fbeb1', // arrow
  i:  '#c9cfde', // identifier
  p:  '#c9cfde', // punctuation
  n:  '#c294c2', // numeric / type literal
  cm: 'rgb(201 207 222 / 50%)',
  err: '#c294c2',
  ok: '#5fbeb1',
};

function CookbookCode({ tokens, lang = 'ts' }) {
  return (
    <div style={{
      background: 'var(--bg-2)',
      border: '1px solid var(--rule)',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '8px 16px', borderBottom: '1px solid var(--rule)',
        display: 'flex', justifyContent: 'space-between',
        background: 'rgb(0 0 0 / 12%)',
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{lang}</span>
      </div>
      <pre style={{
        margin: 0, padding: '20px 24px',
        fontFamily: 'var(--font-mono)', fontSize: 13.5, lineHeight: 1.7,
        whiteSpace: 'pre-wrap', wordBreak: 'normal',
        overflow: 'auto',
      }}>
        {tokens.map((tok, i) => {
          const [t, v] = Array.isArray(tok) ? tok : [tok.t, tok.v];
          if (t === 'br') return <span key={i}>{'\n'}</span>;
          return <span key={i} style={{ color: CB_SYN[t] || 'var(--fg-1)' }}>{v}</span>;
        })}
      </pre>
    </div>
  );
}

window.CookbookCode = CookbookCode;
