function Hero() {
  const [copied, setCopied] = React.useState(false);
  const [primaryHover, setPrimaryHover] = React.useState(false);
  const [secondaryHover, setSecondaryHover] = React.useState(false);
  const [discordHover, setDiscordHover] = React.useState(false);

  return (
    <section style={{
      position: 'relative',
      padding: '120px 32px 96px',
      maxWidth: 1200, margin: '0 auto',
      textAlign: 'left',
    }}>
      {/* faint dot grid */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(rgb(201 207 222 / 6%) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        maskImage: 'radial-gradient(ellipse at 50% 30%, black 30%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 30%, black 30%, transparent 75%)',
      }}/>

      <div style={{ position: 'relative', maxWidth: 880 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--accent)', marginBottom: 20,
        }}>// finite state language · v1.4.0</div>

        <h1 style={{
          margin: 0,
          fontFamily: 'var(--font-mono)', fontWeight: 500,
          fontSize: 'clamp(40px, 6vw, 72px)', lineHeight: 1.05,
          letterSpacing: '-0.03em', color: 'var(--fg-1)',
        }}>
          impossible&nbsp;<span style={{ color: 'var(--accent)' }}>→</span>&nbsp;unrepresentable
        </h1>

        <p style={{
          marginTop: 24, marginBottom: 36, maxWidth: 620,
          fontSize: 18, lineHeight: 1.55, color: 'var(--fg-2)',
        }}>
          fsl is a tiny DSL for JavaScript and TypeScript. Draw your program
          as a graph of states and arrows; the parser emits JSON, jssm runs
          it, and every move not on the picture is refused.
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <a href="#install"
            onMouseEnter={() => setPrimaryHover(true)} onMouseLeave={() => setPrimaryHover(false)}
            style={{
              fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 500,
              padding: '11px 20px', borderRadius: 4, border: 'none', cursor: 'pointer',
              background: primaryHover ? '#2f8c80' : 'var(--accent)',
              color: '#fff', textDecoration: 'none',
              transition: 'background 120ms var(--ease)',
            }}>Get started →</a>
          <a href="#learn"
            onMouseEnter={() => setSecondaryHover(true)} onMouseLeave={() => setSecondaryHover(false)}
            style={{
              fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 500,
              padding: '11px 20px', borderRadius: 4, cursor: 'pointer',
              background: 'transparent', color: 'var(--fg-1)', textDecoration: 'none',
              border: `1px solid ${secondaryHover ? 'var(--rule-2)' : 'var(--rule)'}`,
              transition: 'border-color 120ms var(--ease)',
            }}>Learn the language</a>

          <div
            onClick={() => { navigator.clipboard?.writeText('npm i --save-dev jssm'); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            style={{
              marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 12,
              fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-1)',
              padding: '10px 14px', background: 'var(--bg-2)',
              border: '1px solid var(--rule)', borderRadius: 4, cursor: 'pointer',
            }}>
            <span style={{ color: 'var(--fg-3)' }}>$</span>
            <span>npm i --save-dev jssm</span>
            <span style={{ color: copied ? 'var(--accent)' : 'var(--fg-3)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {copied ? 'copied' : 'copy'}
            </span>
          </div>

          <a
            href="https://discord.gg/fsl"
            target="_blank" rel="noopener"
            onMouseEnter={() => setDiscordHover(true)} onMouseLeave={() => setDiscordHover(false)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
              padding: '10px 14px', borderRadius: 4, cursor: 'pointer',
              background: discordHover ? 'rgb(88 101 242 / 14%)' : 'var(--bg-2)',
              color: 'var(--fg-1)', textDecoration: 'none',
              border: `1px solid ${discordHover ? '#5865f2' : 'var(--rule)'}`,
              transition: 'all 120ms var(--ease)',
            }}>
            <svg width="16" height="12" viewBox="0 0 71 55" fill="#5865f2" aria-hidden="true">
              <path d="M60.1 4.9A58.5 58.5 0 0 0 45.6.5a.2.2 0 0 0-.2.1c-.6 1.1-1.4 2.6-1.9 3.7a54 54 0 0 0-16.2 0A37.4 37.4 0 0 0 25.4.6a.2.2 0 0 0-.2-.1A58.4 58.4 0 0 0 10.7 4.9a.2.2 0 0 0-.1.1A59.7 59.7 0 0 0 .2 45.4a.2.2 0 0 0 .1.2 58.7 58.7 0 0 0 17.7 8.9.2.2 0 0 0 .3-.1c1.4-1.9 2.6-3.9 3.6-6a.2.2 0 0 0-.1-.3 38.7 38.7 0 0 1-5.5-2.6.2.2 0 0 1 0-.4l1.1-.8a.2.2 0 0 1 .2 0 41.9 41.9 0 0 0 35.6 0 .2.2 0 0 1 .2 0c.4.3.7.6 1.1.9a.2.2 0 0 1 0 .3 36.4 36.4 0 0 1-5.5 2.6.2.2 0 0 0-.1.3c1 2.1 2.2 4.1 3.6 6a.2.2 0 0 0 .3.1 58.5 58.5 0 0 0 17.7-9 .2.2 0 0 0 .1-.1c1.6-15.4-2.7-28.8-11.4-40.5a.2.2 0 0 0-.1-.1ZM23.7 37.3c-3.5 0-6.4-3.2-6.4-7.1 0-4 2.9-7.1 6.4-7.1 3.6 0 6.5 3.2 6.4 7.1 0 4-2.8 7.1-6.4 7.1Zm23.7 0c-3.5 0-6.4-3.2-6.4-7.1 0-4 2.9-7.1 6.4-7.1 3.6 0 6.5 3.2 6.4 7.1 0 4-2.8 7.1-6.4 7.1Z"/>
            </svg>
            <span>Discord</span>
          </a>
        </div>
      </div>
    </section>
  );
}

window.Hero = Hero;
