import { useCallback, useRef, useState } from 'react';

const VISIBLE_PER_GROUP = 3;

export function useBanners() {
  const [banners, setBanners] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const counter = useRef(0);

  const push = useCallback((entry) => {
    const item = typeof entry === 'function' ? { render: entry } : entry;
    setBanners(prev => {
      // Dedup by key — same key replaces in place (e.g. repeated retry on same file).
      if (item.key) {
        const idx = prev.findIndex(b => b.key === item.key);
        if (idx !== -1) {
          const copy = [...prev];
          copy[idx] = { ...item, id: prev[idx].id };
          return copy;
        }
      }
      const id = ++counter.current;
      return [...prev, { ...item, id }];
    });
  }, []);

  const dismiss = useCallback((id) => {
    setBanners(prev => prev.filter(b => b.id !== id));
  }, []);

  const dismissKey = useCallback((key) => {
    setBanners(prev => prev.filter(b => b.key !== key));
  }, []);

  const clear = useCallback(() => {
    setBanners([]);
    setExpanded(false);
  }, []);

  const toggleExpanded = useCallback(() => setExpanded(e => !e), []);

  return {
    banners, push, dismiss, dismissKey, clear,
    expanded, setExpanded, toggleExpanded,
  };
}


export default function BannerStack({
  banners, dismiss, expanded, toggleExpanded, className = '',
}) {
  if (!banners.length) return null;

  // Same groupKey = same rendered content; differing keys start a new group.
  const groups = [];
  for (const b of banners) {
    const last = groups[groups.length - 1];
    if (last && b.groupKey != null && last.groupKey === b.groupKey) {
      last.items.push(b);
    } else {
      groups.push({ groupKey: b.groupKey, items: [b] });
    }
  }

  const counts = banners.reduce((acc, b) => {
    const sev = b.severity || 'error';
    if (acc[sev] != null) acc[sev] += 1;
    return acc;
  }, { error: 0, warning: 0, info: 0 });

  const hasCollapsibleGroup = groups.some(g => g.items.length > VISIBLE_PER_GROUP);
  const showBar = banners.length >= 2;

  return (
    <div className={`relative flex flex-col gap-2 ${className}`}>
      {groups.map(g => {
        if (expanded) {
          return g.items.map(b => (
            <div key={b.id}>{b.render(() => dismiss(b.id))}</div>
          ));
        }
        if (g.items.length === 1) {
          const b = g.items[0];
          return <div key={b.id}>{b.render(() => dismiss(b.id))}</div>;
        }
        return (
          <StackedGroup
            key={g.items[0].id}
            items={g.items.slice(0, VISIBLE_PER_GROUP)}
            dismiss={dismiss}
          />
        );
      })}
      {showBar && (
        <div className="flex justify-center relative" style={{ marginTop: expanded ? -16 : -32, zIndex: 20 }}>
          <NotificationsBar
            counts={counts}
            expanded={expanded}
            onToggle={toggleExpanded}
            collapsible={hasCollapsibleGroup}
          />
        </div>
      )}
    </div>
  );
}


const PEEK_Y = 8.5;
const PEEK_X = 8;
const SHADOW = '0 8px 18px -8px rgba(0,0,0,0.55)';

function StackedGroup({ items, dismiss }) {
  return (
    <div
      style={{
        position: 'relative',
        paddingBottom: (items.length - 1) * PEEK_Y,
      }}
    >
      {items.map((b, i) => (
        <div
          key={b.id}
          style={
            i === 0
              ? {
                  position: 'relative',
                  zIndex: items.length,
                  borderRadius: 8,
                  boxShadow: SHADOW,
                }
              : {
                  position: 'absolute',
                  top: i * PEEK_Y,
                  left: i * PEEK_X,
                  right: i * PEEK_X,
                  zIndex: items.length - i,
                  borderRadius: 8,
                  boxShadow: SHADOW,
                }
          }
        >
          {b.render(() => dismiss(b.id))}
        </div>
      ))}
    </div>
  );
}


function NotificationsBar({ counts, expanded, onToggle, collapsible }) {
  return (
    <div
      className="inline-flex items-center gap-4 px-4 py-1 text-[13px] font-bold cursor-pointer bg-[#1c222c] hover:bg-[#373c3e] transition-colors"
      style={{
        border: '2px solid #7d7467',
        borderRadius: 999,
        color: '#e8e6e2',
      }}
      onClick={(!collapsible && !expanded) ? undefined : onToggle}
      role="button"
      aria-label={expanded ? 'Collapse notifications' : 'Expand notifications'}
    >
      <span>Notifications</span>
      <SeverityCount kind="error" count={counts.error} />
      <SeverityCount kind="warning" count={counts.warning} />
      <SeverityCount kind="info" count={counts.info} />
      <ChevronIcon up={expanded} />
    </div>
  );
}


function SeverityCount({ kind, count }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <SeverityIcon kind={kind} />
      <span>{count}</span>
    </span>
  );
}


function SeverityIcon({ kind }) {
  const common = {
    width: 14, height: 14, viewBox: '0 0 16 16',
    fill: 'none', strokeWidth: 2.6,
    strokeLinecap: 'round', strokeLinejoin: 'round',
    stroke: 'currentColor',
  };
  if (kind === 'error') {
    return (
      <svg {...common} aria-hidden="true">
        <circle cx="8" cy="8" r="7" />
        <path d="m5.5 5.5 5 5M10.5 5.5l-5 5" />
      </svg>
    );
  }
  if (kind === 'warning') {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M6.52 1.88l-5.33 9.76c-.13.23-.19.5-.19.76 0 .88.71 1.59 1.59 1.59H13.4c.88 0 1.59-.71 1.59-1.59 0-.27-.07-.53-.19-.76L9.48 1.88C9.18 1.34 8.62 1 8 1s-1.18.34-1.48.88Z" />
        <path d="M8 5v4" />
        <path d="M8 11.5h.01" />
      </svg>
    );
  }
  if (kind === 'info') {
    return (
      <svg {...common} aria-hidden="true">
        <circle cx="8" cy="8" r="7" />
        <path d="M8 12V7M8 6V4" />
      </svg>
    );
  }
  return null;
}


function ChevronIcon({ up }) {
  return (
    <svg
      viewBox="0 0 16 16" width="14" height="14"
      fill="none" stroke="currentColor"
      strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: up ? 'rotate(180deg)' : 'none', transition: 'transform 120ms' }}
      aria-hidden="true"
    >
      <path d="m2 5 6 6 6-6" />
    </svg>
  );
}
