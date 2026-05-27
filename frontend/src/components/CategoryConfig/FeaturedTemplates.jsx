import { useState, useEffect } from 'react';
import { api, AuthError } from '../../api';

function SparkleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M7.53 1.282a.5.5 0 0 1 .94 0l.478 1.306a7.492 7.492 0 0 0 4.464 4.464l1.305.478a.5.5 0 0 1 0 .94l-1.305.478a7.492 7.492 0 0 0-4.464 4.464l-.478 1.305a.5.5 0 0 1-.94 0l-.478-1.305a7.492 7.492 0 0 0-4.464-4.464L1.282 8.47a.5.5 0 0 1 0-.94l1.306-.478a7.492 7.492 0 0 0 4.464-4.464Z" />
    </svg>
  );
}

function Label({ text, color }) {
  const colors = {
    blue:   { bg: 'rgba(31,111,235,0.15)', text: '#58a6ff', border: 'rgba(31,111,235,0.4)' },
    green:  { bg: 'rgba(35,134,54,0.15)',  text: '#3fb950', border: 'rgba(35,134,54,0.4)' },
    purple: { bg: 'rgba(137,87,229,0.15)', text: '#bc8cff', border: 'rgba(137,87,229,0.4)' },
    gray:   { bg: 'rgba(139,148,158,0.1)', text: '#8b949e', border: 'rgba(139,148,158,0.3)' },
    amber:  { bg: 'rgba(240,136,62,0.15)', text: '#f0883e', border: 'rgba(240,136,62,0.4)' },
  };
  const c = colors[color] || colors.gray;
  return (
    <span className="text-[11px] font-medium px-[7px] py-[2px] rounded-full leading-tight inline-block whitespace-nowrap"
      style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {text}
    </span>
  );
}

function TemplateCard({ template, onNavigate }) {
  const id = template.templateId || template.id;
  const name = template.name || template.slug || 'Untitled';
  const desc = template.description || '';
  return (
    <button
      onClick={() => onNavigate('config-detail', id)}
      data-testid={`featured-card-${id}`}
      className="text-left border border-[#30363d] hover:border-[#484f58] rounded-lg overflow-hidden bg-gradient-to-br from-[#0d1117] to-[#000] hover:from-[#161b22] transition-colors group flex flex-col">
      {/* Hero image */}
      {template.heroImage ? (
        <div className="aspect-[16/9] bg-[#0d1117] overflow-hidden border-b border-[#30363d]">
          <img src={template.heroImage} alt={name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
        </div>
      ) : (
        <div className="aspect-[16/9] bg-gradient-to-br from-[#161b22] to-[#0d1117] border-b border-[#30363d] flex items-center justify-center">
          <SparkleIcon className="w-10 h-10 text-[#30363d]" />
        </div>
      )}

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-[15px] font-semibold text-[#e6edf3] group-hover:text-[#58a6ff] transition-colors">
            {name}
          </span>
          {template.isNew && <Label text="New" color="amber" />}
          {template.categoryLabel && <Label text={template.categoryLabel} color="blue" />}
        </div>
        {desc && (
          <div className="text-[13px] text-[#8b949e] leading-relaxed line-clamp-3 mb-3">
            {desc}
          </div>
        )}
        <div className="mt-auto text-[12px] text-[#6e7681] flex items-center gap-3 flex-wrap">
          {template.features?.length > 0 && (
            <span>{template.features.length} feature{template.features.length !== 1 ? 's' : ''}</span>
          )}
          {template.pages?.length > 0 && (
            <span>{template.pages.length} page{template.pages.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
    </button>
  );
}

function CardSkeleton() {
  return (
    <div className="border border-[#30363d] rounded-lg overflow-hidden bg-gradient-to-br from-[#0d1117] to-[#000]">
      <div className="aspect-[16/9] bg-[#161b22] animate-pulse" />
      <div className="p-4">
        <div className="h-[18px] bg-[#21262d] rounded animate-pulse w-3/4 mb-2" />
        <div className="h-[12px] bg-[#21262d] rounded animate-pulse w-full mb-1.5" />
        <div className="h-[12px] bg-[#21262d] rounded animate-pulse w-5/6 mb-1.5" />
        <div className="h-[12px] bg-[#21262d] rounded animate-pulse w-1/2" />
      </div>
    </div>
  );
}

export default function FeaturedTemplates({ onNavigate, bearerToken, onTokenExpired, activeEnv }) {
  const [byCategory, setByCategory] = useState({});  // { fullstack: [...], landing: [...] }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthError, setIsAuthError] = useState(false);

  useEffect(() => {
    if (!bearerToken) {
      setError('Set your API token in the sidebar first.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setIsAuthError(false);
    api.getTemplateSection({ page: 1, pageSize: 1, bearerToken })
      .then(data => {
        if (cancelled) return;
        const featured = (data && typeof data.featured === 'object' && !Array.isArray(data.featured))
          ? data.featured
          : {};
        setByCategory(featured);
      })
      .catch(e => {
        if (cancelled) return;
        if (e instanceof AuthError) {
          setIsAuthError(true);
          setError('Authentication failed — API token is expired or invalid.');
          onTokenExpired?.();
        } else {
          setError(e.message || 'Failed to load featured templates.');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [bearerToken, activeEnv, onTokenExpired]);

  // Order categories by total displayOrder of items (lower first), then alphabetical
  const categoryKeys = Object.keys(byCategory).filter(k => Array.isArray(byCategory[k]) && byCategory[k].length > 0);
  categoryKeys.sort((a, b) => {
    const aMin = Math.min(...byCategory[a].map(t => t.displayOrder ?? 999));
    const bMin = Math.min(...byCategory[b].map(t => t.displayOrder ?? 999));
    if (aMin !== bMin) return aMin - bMin;
    return a.localeCompare(b);
  });

  function categoryHeading(key) {
    const first = byCategory[key]?.[0];
    return first?.categoryLabel || key.charAt(0).toUpperCase() + key.slice(1);
  }

  const totalCount = categoryKeys.reduce((sum, k) => sum + byCategory[k].length, 0);

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <SparkleIcon className="w-7 h-7 text-[#bc8cff]" />
          <h1 className="text-[36px] font-bold leading-[1.1] bg-gradient-to-r from-[#e6edf3] via-[#dcd2ff] to-[#b794f4] bg-clip-text text-transparent">
            Featured Templates
          </h1>
        </div>
        <p className="text-[15px] text-[#8b949e] max-w-[640px]">
          Curated templates for the active environment. Grouped by category — click any card to see config details.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className={`mb-6 px-4 py-3 rounded-md border flex items-start gap-2 ${
          isAuthError
            ? 'bg-[#f85149]/10 border-[#f85149]/30 text-[#f85149]'
            : 'bg-[#f0883e]/10 border-[#f0883e]/30 text-[#f0883e]'
        }`}>
          <span className="text-[14px]">{error}</span>
        </div>
      )}

      {/* Loading skeleton (single group) */}
      {loading && (
        <div className="mb-8">
          <div className="h-[22px] bg-[#21262d] rounded animate-pulse w-40 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        </div>
      )}

      {/* Grouped sections */}
      {!loading && categoryKeys.map(key => {
        const sorted = [...byCategory[key]].sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
        return (
          <section key={key} className="mb-10">
            <div className="flex items-baseline gap-3 mb-4 pb-2 border-b border-[#21262d]">
              <h2 className="text-[20px] font-semibold text-[#e6edf3]">{categoryHeading(key)}</h2>
              <span className="text-[13px] text-[#6e7681]">{sorted.length} template{sorted.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sorted.map(t => (
                <TemplateCard key={t.templateId || t.id} template={t} onNavigate={onNavigate} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Empty state */}
      {!loading && !error && totalCount === 0 && (
        <div className="text-center py-20 border border-[#30363d] rounded-lg bg-gradient-to-b from-[#0d1117] to-[#000]">
          <SparkleIcon className="w-8 h-8 text-[#484f58] mx-auto mb-3" />
          <div className="text-[18px] font-semibold text-[#e6edf3] mb-1">No featured templates yet</div>
          <div className="text-[14px] text-[#8b949e]">
            Featured templates will appear here when the platform team curates them.
          </div>
        </div>
      )}
    </div>
  );
}
