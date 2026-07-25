function Nav() {
  const linkStyle = {
    color: 'var(--fg-2)', fontSize: 14, textDecoration: 'none',
    transition: 'color 120ms var(--ease)', cursor: 'pointer'
  };
  const [hover, setHover] = React.useState(null);
  const [active, setActive] = React.useState('Examples');
  const items = [
    { label: 'Install', href: '#install' },
    { label: 'Examples', href: '#examples' },
    { label: 'Learn', href: '#learn' },
    { label: 'Cookbook', href: 'cookbook/index.html' },
    { label: 'Community', href: '#community' },
  ];

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 10,
      display: 'flex', alignItems: 'center', gap: 28,
      padding: '14px 32px',
      background: 'rgb(55 34 78 / 80%)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--rule)',
    }}>
      <a style={{
        fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 17,
        letterSpacing: '-0.03em', color: 'var(--fg-1)', textDecoration: 'none',
        cursor: 'pointer'
      }}>fsl<span style={{ color: 'var(--accent)' }}>.</span>tools</a>

      <div style={{ flex: 1, display: 'flex', gap: 22, marginLeft: 16 }}>
        {items.map(it => (
          <a key={it.label}
             href={it.href}
             onClick={() => setActive(it.label)}
             onMouseEnter={() => setHover(it.label)} onMouseLeave={() => setHover(null)}
             style={{
               ...linkStyle,
               color: active === it.label ? 'var(--accent)' : (hover === it.label ? 'var(--fg-1)' : 'var(--fg-2)')
             }}>{it.label}</a>
        ))}
      </div>

      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-3)' }}>v1.4.0</span>
      <a style={{
        color: 'var(--fg-1)', fontSize: 13, textDecoration: 'none',
        border: '1px solid var(--rule-2)', padding: '6px 12px',
        borderRadius: 4, display: 'inline-flex', gap: 8, alignItems: 'center',
        cursor: 'pointer'
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.55v-2.13c-3.2.69-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.73-1.53-2.55-.29-5.23-1.27-5.23-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.17.91-.25 1.89-.38 2.86-.38s1.95.13 2.86.38c2.18-1.48 3.15-1.17 3.15-1.17.62 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.37-5.25 5.65.41.36.78 1.06.78 2.13v3.16c0 .31.21.66.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"/></svg>
        GitHub
      </a>
    </nav>
  );
}

window.Nav = Nav;
