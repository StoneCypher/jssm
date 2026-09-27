function Install() {
  const tabs = [
    { id: 'npm',  cmd: 'npm i --save-dev jssm' },
    { id: 'pnpm', cmd: 'pnpm add -D jssm' },
    { id: 'yarn', cmd: 'yarn add --dev jssm' },
    { id: 'bun',  cmd: 'bun add --dev jssm' },
    { id: 'deno', cmd: 'deno install --dev npm:jssm' },
  ];
  const [active, setActive] = React.useState('npm');
  const [copied, setCopied] = React.useState(false);
  const cmd = tabs.find(t => t.id === active).cmd;

  const copy = () => {
    navigator.clipboard?.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const reqRow = (label, value, ok = true) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '10px 0', borderBottom: '1px solid var(--rule)',
      fontFamily: 'var(--font-mono)', fontSize: 12,
    }}>
      <span style={{ color: 'var(--fg-3)' }}>{label}</span>
      <span style={{ color: ok ? 'var(--fg-1)' : 'var(--warning)' }}>{value}</span>
    </div>
  );

  return (
    <section id="install" style={{ padding: '64px 32px', maxWidth: 1200, margin: '0 auto', scrollMarginTop: 80 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--accent)', marginBottom: 12,
      }}>// install</div>
      <h2 style={{
        margin: '0 0 16px',
        fontFamily: 'var(--font-sans)', fontSize: 32, fontWeight: 600,
        letterSpacing: '-0.02em', color: 'var(--fg-1)',
      }}>One package. No runtime, no codegen.</h2>
      <p style={{
        margin: '0 0 32px', maxWidth: 620, fontSize: 16, lineHeight: 1.55, color: 'var(--fg-2)',
      }}>
        jssm ships as one library. Write your graph inline as a tagged
        template — <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-1)', background: 'var(--bg-2)', padding: '1px 6px', border: '1px solid var(--rule)', borderRadius: 4 }}>{'sm`...`'}</code> — or keep
        long graphs in a <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-1)', background: 'var(--bg-2)', padding: '1px 6px', border: '1px solid var(--rule)', borderRadius: 4 }}>.fsl</code> file. No codegen, no build step.
      </p>

      <div style={{
        display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'stretch',
      }}>
        {/* Install command card */}
        <div style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--rule)',
          borderRadius: 8,
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex', gap: 0, borderBottom: '1px solid var(--rule)',
            background: 'rgb(0 0 0 / 12%)',
          }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '12px 18px',
                  color: active === t.id ? 'var(--accent)' : 'var(--fg-3)',
                  borderBottom: active === t.id ? '1px solid var(--accent)' : '1px solid transparent',
                  marginBottom: -1,
                  transition: 'color 120ms var(--ease)',
                }}
              >{t.id}</button>
            ))}
          </div>

          {/* Command */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '24px 24px',
            fontFamily: 'var(--font-mono)', fontSize: 16,
          }}>
            <span>
              <span style={{ color: 'var(--fg-3)' }}>$ </span>
              <span style={{ color: 'var(--fg-1)' }}>{cmd}</span>
            </span>
            <button
              onClick={copy}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                background: 'transparent', cursor: 'pointer',
                color: copied ? 'var(--accent)' : 'var(--fg-3)',
                border: '1px solid var(--rule)',
                padding: '6px 10px', borderRadius: 4,
                transition: 'color 120ms var(--ease), border-color 120ms var(--ease)',
              }}
            >{copied ? 'copied' : 'copy'}</button>
          </div>

          {/* tsconfig hint */}
          <div style={{
            borderTop: '1px solid var(--rule)',
            padding: '14px 24px',
            background: 'var(--bg-2)',
            fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-3)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ color: 'var(--accent)' }}>{'>'}</span>
            <span>fsl is a graph DSL — jssm parses it to JSON, then runs it. No type-level magic; refusal happens at load and at runtime.</span>
          </div>
        </div>

        {/* Requirements panel */}
        <div style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--rule)',
          borderRadius: 8,
          padding: 24,
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)',
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12,
          }}>requirements</div>
          {reqRow('node', '≥ 18')}
          {reqRow('runtime', 'jssm')}
          {reqRow('size', '~30 kb min+gz')}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            padding: '10px 0',
            fontFamily: 'var(--font-mono)', fontSize: 12,
          }}>
            <span style={{ color: 'var(--fg-3)' }}>license</span>
            <span style={{ color: 'var(--fg-1)' }}>MIT</span>
          </div>
        </div>
      </div>
    </section>
  );
}

window.Install = Install;
