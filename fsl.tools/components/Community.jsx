// Community.jsx — single Discord link card pointing to the real fsl/jssm server.

const FSL_DISCORD_INVITE = 'https://discord.com/invite/9P95USqnMK';

function DiscordIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.07.07 0 0 0-.073.035c-.21.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.51 12.51 0 0 0-.617-1.249.073.073 0 0 0-.073-.035 19.74 19.74 0 0 0-4.885 1.515.066.066 0 0 0-.03.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.073.073 0 0 0 .079-.026c.462-.63.873-1.295 1.226-1.994a.072.072 0 0 0-.04-.1 13.1 13.1 0 0 1-1.872-.892.073.073 0 0 1-.007-.121c.126-.094.252-.192.372-.291a.07.07 0 0 1 .074-.01c3.927 1.793 8.18 1.793 12.061 0a.07.07 0 0 1 .075.009c.12.099.246.198.373.292a.073.073 0 0 1-.006.121 12.3 12.3 0 0 1-1.873.891.073.073 0 0 0-.039.101c.36.698.772 1.362 1.225 1.993a.072.072 0 0 0 .079.027 19.84 19.84 0 0 0 6.002-3.03.073.073 0 0 0 .03-.056c.5-5.177-.838-9.674-3.549-13.66a.058.058 0 0 0-.029-.028zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.957 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

function Community() {
  const [hover, setHover] = React.useState(false);

  return (
    <section id="community" style={{
      padding: '64px 32px', maxWidth: 1200, margin: '0 auto',
      scrollMarginTop: 80,
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 500,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--accent)', marginBottom: 12,
      }}>// community</div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        gap: 24, flexWrap: 'wrap', marginBottom: 32,
      }}>
        <h2 style={{
          margin: 0,
          fontFamily: 'var(--font-sans)', fontSize: 32, fontWeight: 600,
          letterSpacing: '-0.02em', color: 'var(--fg-1)',
        }}>Talk it through on Discord.</h2>
        <p style={{
          margin: 0, maxWidth: 480, fontSize: 15, lineHeight: 1.55, color: 'var(--fg-2)',
        }}>
          Questions, design feedback, machines you've built. The fsl &amp; jssm
          server is the one place to find the people working on this.
        </p>
      </div>

      <a
        href={FSL_DISCORD_INVITE}
        target="_blank" rel="noopener"
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{
          display: 'block',
          background: 'var(--bg-1)',
          border: `1px solid ${hover ? '#5865f2' : 'var(--rule)'}`,
          borderRadius: 12,
          padding: '32px 36px',
          textDecoration: 'none',
          transition: 'border-color 160ms var(--ease), background 160ms var(--ease)',
          boxShadow: '0 1px 0 rgb(255 255 255 / 4%) inset',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 24, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, color: 'var(--fg-1)' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 12,
              background: hover ? '#5865f2' : 'rgb(88 101 242 / 14%)',
              color: hover ? '#fff' : '#5865f2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 160ms var(--ease)',
              flexShrink: 0,
            }}>
              <DiscordIcon size={28}/>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{
                fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 600,
                color: 'var(--fg-1)', letterSpacing: '-0.01em',
              }}>fsl &amp; jssm Discord</span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-3)',
              }}>discord.com/invite/9P95USqnMK</span>
            </div>
          </div>

          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
            padding: '12px 22px', borderRadius: 4,
            background: hover ? '#5865f2' : 'var(--bg-2)',
            color: hover ? '#fff' : 'var(--fg-1)',
            border: `1px solid ${hover ? '#5865f2' : 'var(--rule)'}`,
            transition: 'all 160ms var(--ease)',
          }}>
            Join the server
            <span aria-hidden>→</span>
          </span>
        </div>
      </a>
    </section>
  );
}

window.Community = Community;
