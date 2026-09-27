function DiagnosticPanel() {
  return (
    <section style={{ padding: '32px 32px 96px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--accent)', marginBottom: 12,
      }}>// diagnostics</div>
      <h2 style={{
        margin: '0 0 24px',
        fontFamily: 'var(--font-sans)', fontSize: 32, fontWeight: 600,
        letterSpacing: '-0.02em', color: 'var(--fg-1)',
      }}>Errors that point at the bug.</h2>
      <p style={{ margin: '0 0 32px', maxWidth: 620, fontSize: 16, lineHeight: 1.55, color: 'var(--fg-2)' }}>
        Diagnostics are written for the engineer who has to fix them. Name the
        problem, point at the location, suggest the next move.
      </p>

      <div style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--rule)',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 8px 24px -8px rgb(0 0 0 / 50%)',
      }}>
        <div style={{
          padding: '8px 14px', background: 'rgb(0 0 0 / 18%)',
          borderBottom: '1px solid var(--rule)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#7a577a' }}/>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#7a6d31' }}/>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#287a70' }}/>
          <span style={{ marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>fsl check</span>
        </div>
        <pre style={{ margin: 0, padding: 20, fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.65, color: 'var(--fg-1)', overflow: 'auto' }}>
<span style={{ color: 'var(--fg-3)' }}>$</span> fsl check src/traffic.fsl{'\n\n'}
<span style={{ color: '#c294c2' }}>error[E024]</span>: no edge from <span style={{ color: '#5fbeb1' }}>'red'</span> on action <span style={{ color: '#c4ae5a' }}>'stop'</span>{'\n'}
{'  '}<span style={{ color: 'var(--fg-3)' }}>--&gt;</span> src/controller.ts:42:14{'\n'}
{'   '}<span style={{ color: 'var(--fg-3)' }}>|</span>{'\n'}
{' '}<span style={{ color: 'var(--fg-3)' }}>42</span> <span style={{ color: 'var(--fg-3)' }}>|</span>   light.<span style={{ color: '#b07eb0' }}>request</span>(<span style={{ color: '#c4ae5a' }}>'stop'</span>);{'\n'}
{'   '}<span style={{ color: 'var(--fg-3)' }}>|</span>                  <span style={{ color: '#c294c2' }}>^^^^^^</span> action not declared at <span style={{ color: '#5fbeb1' }}>'red'</span>{'\n'}
{'   '}<span style={{ color: 'var(--fg-3)' }}>=</span> <span style={{ color: 'var(--fg-2)' }}>note</span>: <span style={{ color: '#5fbeb1' }}>'red'</span> only accepts <span style={{ color: '#c4ae5a' }}>'next'</span>{'\n'}
{'   '}<span style={{ color: 'var(--fg-3)' }}>=</span> <span style={{ color: 'var(--fg-2)' }}>help</span>: add an arrow <span style={{ color: '#5fbeb1' }}>red</span> <span style={{ color: '#c4ae5a' }}>'stop'</span> <span style={{ color: '#5fbeb1' }}>→</span> <span style={{ color: '#5fbeb1' }}>red;</span> or call <span style={{ color: '#c4ae5a' }}>'next'</span>{'\n\n'}
<span style={{ color: '#c4ae5a' }}>warning[W007]</span>: state <span style={{ color: '#5fbeb1' }}>'amber'</span> is unreachable — no inbound edge{'\n'}
{'  '}<span style={{ color: 'var(--fg-3)' }}>--&gt;</span> src/traffic.fsl:8:1{'\n\n'}
<span style={{ color: 'var(--fg-3)' }}>1 error, 1 warning · checked 4 files in 0.31s</span>
        </pre>
      </div>
    </section>
  );
}

window.DiagnosticPanel = DiagnosticPanel;
