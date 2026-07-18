// CookbookSidebar.jsx — scalable category browser with counts + search box.
// Designed to handle hundreds of recipes via collapsible categories,
// live filtering by search query, and fixed-height scrollable lists per group.

function CookbookSidebar({ query, setQuery, activeTags, toggleTag, allTags, filtered, activeId }) {
  const grouped = React.useMemo(() => {
    const m = {};
    for (const c of CATEGORIES) m[c] = [];
    for (const r of filtered) m[r.category].push(r);
    return m;
  }, [filtered]);

  const totalCount = RECIPES.length;
  const shownCount = filtered.length;

  return (
    <aside style={{
      position: 'sticky', top: 64, alignSelf: 'flex-start',
      maxHeight: 'calc(100vh - 64px)',
      display: 'flex', flexDirection: 'column',
      borderRight: '1px solid var(--rule)',
      paddingRight: 20,
    }}>
      {/* Search */}
      <div style={{ padding: '20px 0 14px' }}>
        <label style={{
          display: 'block',
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--fg-3)', marginBottom: 8,
        }}>// search</label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="filter recipes…"
            style={{
              width: '100%', padding: '8px 32px 8px 12px',
              background: 'var(--bg-2)', border: '1px solid var(--rule-2)',
              borderRadius: 4,
              fontFamily: 'var(--font-mono)', fontSize: 13,
              color: 'var(--fg-1)', outline: 'none',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{
              position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)',
              background: 'transparent', border: 0, color: 'var(--fg-3)',
              cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1,
            }} aria-label="clear">×</button>
          )}
        </div>
        <div style={{
          marginTop: 8,
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)',
        }}>
          {shownCount === totalCount
            ? <>{totalCount} recipes</>
            : <>{shownCount} of {totalCount}</>}
        </div>
      </div>

      {/* Tag chips */}
      {allTags.length > 0 && (
        <div style={{ padding: '4px 0 14px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--fg-3)', marginBottom: 8,
          }}>// tags</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {allTags.slice(0, 18).map(tag => {
              const on = activeTags.includes(tag);
              return (
                <button key={tag} onClick={() => toggleTag(tag)} style={{
                  padding: '3px 8px', borderRadius: 3,
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  background: on ? 'var(--accent)' : 'var(--bg-2)',
                  color: on ? '#fff' : 'var(--fg-2)',
                  border: `1px solid ${on ? 'var(--accent)' : 'var(--rule)'}`,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'all 100ms var(--ease)',
                }}>{tag}</button>
              );
            })}
          </div>
        </div>
      )}

      {/* Categorized list — independently scrollable so adding hundreds doesn't blow out the rail */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8, marginRight: -8, paddingRight: 8 }}>
        {CATEGORIES.map(cat => (
          <CategoryGroup key={cat} name={cat} recipes={grouped[cat]} activeId={activeId} query={query}/>
        ))}
        {shownCount === 0 && (
          <div style={{
            padding: '32px 8px', textAlign: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-3)',
          }}>no matches</div>
        )}
      </div>
    </aside>
  );
}

function CategoryGroup({ name, recipes, activeId, query }) {
  const containsActive = recipes.some(r => r.id === activeId);
  // Default closed; auto-open when this category contains the active (scrolled-to) recipe,
  // or when the user is actively searching (so matches are immediately visible).
  const [userOpen, setUserOpen] = React.useState(null); // null = follow auto, true/false = user override
  const auto = containsActive || (query && query.trim().length > 0);
  const open = userOpen === null ? auto : userOpen;

  // When auto-open changes (e.g. you scroll into this category), reset the user override
  // so behavior tracks scroll again.
  const prevAuto = React.useRef(auto);
  React.useEffect(() => {
    if (prevAuto.current !== auto) {
      setUserOpen(null);
      prevAuto.current = auto;
    }
  }, [auto]);

  if (recipes.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <button onClick={() => setUserOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        background: 'transparent', border: 0, padding: '6px 0',
        cursor: 'pointer', textAlign: 'left',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)',
          width: 10, transform: `rotate(${open ? 90 : 0}deg)`,
          transition: 'transform 120ms var(--ease)',
        }}>▸</span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--accent)',
        }}>{name}</span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)',
          marginLeft: 'auto',
        }}>{recipes.length}</span>
      </button>

      {open && (
        <ul style={{ margin: '4px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
          {recipes.map(r => (
            <RecipeLink key={r.id} recipe={r} active={activeId === r.id}/>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecipeLink({ recipe, active }) {
  const [hover, setHover] = React.useState(false);
  return (
    <li>
      <a href={`#${recipe.id}`}
         onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
         style={{
           display: 'flex', gap: 10, alignItems: 'baseline',
           padding: '5px 12px',
           borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
           marginLeft: -2,
           fontFamily: 'var(--font-sans)', fontSize: 13.5,
           color: active ? 'var(--fg-1)' : (hover ? 'var(--fg-1)' : 'var(--fg-2)'),
           textDecoration: 'none',
           transition: 'color 100ms var(--ease)',
         }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--fg-3)', minWidth: 22,
        }}>{String(recipe.n).padStart(2, '0')}</span>
        <span>{recipe.title}</span>
      </a>
    </li>
  );
}

window.CookbookSidebar = CookbookSidebar;
