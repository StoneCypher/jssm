// CookbookFooter.jsx — bottom CTA for cookbook page

function CookbookFooter() {
  return (
    <section style={{
      borderTop: '1px solid var(--rule)',
      padding: '64px 32px 96px',
      maxWidth: 1200, margin: '0 auto',
      display: 'grid', gridTemplateColumns: '120px 1fr', gap: 32,
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--accent)', paddingTop: 12,
      }}>// next</div>

      <div>
        <h2 style={{
          margin: '0 0 16px',
          fontFamily: 'var(--font-sans)', fontSize: 28, fontWeight: 600,
          letterSpacing: '-0.02em', color: 'var(--fg-1)',
        }}>Have a recipe to share?</h2>

        <p style={{ margin: '0 0 28px', maxWidth: 640, fontSize: 16, lineHeight: 1.55, color: 'var(--fg-2)' }}>
          The cookbook lives in the same repo as fsl. Open a PR with a new
          pattern you've found useful — short, copy-pasteable, with a real
          problem statement.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="index.html" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '12px 22px', borderRadius: 4,
            background: 'var(--bg-1)', color: 'var(--fg-1)',
            border: '1px solid var(--rule-2)', textDecoration: 'none',
            fontSize: 14, fontWeight: 500,
          }}>
            <span aria-hidden>←</span> Back to fsl.tools
          </a>
          <a href="https://github.com" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '12px 22px', borderRadius: 4,
            background: 'var(--accent)', color: '#fff',
            border: '1px solid var(--accent)', textDecoration: 'none',
            fontSize: 14, fontWeight: 500,
          }}>
            Open a PR <span aria-hidden>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

window.CookbookFooter = CookbookFooter;
