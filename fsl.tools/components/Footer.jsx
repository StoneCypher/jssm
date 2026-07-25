function Footer() {
  const cols = [
    { title: 'Product', links: ['Docs', 'Playground', 'Examples', 'Changelog'] },
    { title: 'Resources', links: ['GitHub', 'Discord', 'Blog', 'RFCs'] },
    { title: 'Spec', links: ['Language reference', 'Diagnostics', 'Compatibility'] },
  ];
  return (
    <footer style={{
      borderTop: '1px solid var(--rule)',
      padding: '64px 32px 48px',
      maxWidth: 1200, margin: '0 auto',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 32,
        marginBottom: 48,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 17, letterSpacing: '-0.03em', color: 'var(--fg-1)' }}>
            fsl<span style={{ color: 'var(--accent)' }}>.</span>tools
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-3)' }}>finite state language</span>
        </div>
        {cols.map(c => (
          <div key={c.title} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{c.title}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {c.links.map(l => (
                <a key={l} style={{ fontSize: 13, color: 'var(--fg-2)', textDecoration: 'none', cursor: 'pointer' }}>{l}</a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 24, borderTop: '1px solid var(--rule)',
        fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)',
      }}>
        <span>© 2026 fsl contributors · MIT</span>
        <span>v1.4.0 · built {new Date().toISOString().slice(0, 10)}</span>
      </div>
    </footer>
  );
}

window.Footer = Footer;
