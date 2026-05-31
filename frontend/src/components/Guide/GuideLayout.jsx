import { useEffect, useRef, useState } from 'react';

// 3-column doc layout. Content column has bounded width for readable line
// length, right column hosts the in-page TOC.

export default function GuideLayout({ breadcrumb, toc, next, onNavigate, children }) {
  const contentRef = useRef(null);
  const [activeId, setActiveId] = useState(toc?.[0]?.id || '');

  useEffect(() => {
    if (!toc || toc.length === 0) return;
    const headings = toc.map(t => document.getElementById(t.id)).filter(Boolean);
    if (headings.length === 0) return;

    function updateActive() {
      const triggerY = 120;
      let current = headings[0].id;
      for (const h of headings) {
        const rect = h.getBoundingClientRect();
        if (rect.top <= triggerY) current = h.id;
        else break;
      }
      setActiveId(current);
    }

    updateActive();
    window.addEventListener('scroll', updateActive, { passive: true });
    window.addEventListener('resize', updateActive);
    return () => {
      window.removeEventListener('scroll', updateActive);
      window.removeEventListener('resize', updateActive);
    };
  }, [toc]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [breadcrumb?.page]);

  function scrollTo(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  return (
    <div className="flex gap-10 max-w-[1100px] mx-auto">
      {/* Center column */}
      <div ref={contentRef} className="flex-1 min-w-0 max-w-[720px]">
        {breadcrumb && (
          <nav className="flex items-center gap-1.5 text-[13px] text-[#8b949e] mb-5">
            <button
              onClick={() => onNavigate?.('guide-start')}
              className="hover:text-[#e6edf3] transition-colors"
            >
              {breadcrumb.group || 'Getting started'}
            </button>
            <span className="text-[#484f58]">/</span>
            <span className="text-[#c9d1d9]">{breadcrumb.page}</span>
          </nav>
        )}

        <article className="pb-8">{children}</article>

        {next && (
          <button
            onClick={() => onNavigate?.(next.id)}
            className="group block w-full text-left mt-8 rounded-[6px] border border-[#30363d] bg-[#0d1117] hover:bg-[#161b22] hover:border-[#484f58] px-5 py-4 transition-colors"
          >
            <div className="flex items-center justify-end gap-1.5 text-[12px] uppercase tracking-[0.08em] text-[#8b949e] group-hover:text-[#c9d1d9] font-semibold">
              Next
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </div>
            <div className="text-right text-[16px] font-semibold text-[#e6edf3] mt-1 group-hover:text-[#f0f6fc]">
              {next.title}
            </div>
          </button>
        )}
      </div>

      {/* Right TOC */}
      {toc && toc.length > 0 && (
        <aside className="w-[200px] shrink-0 hidden lg:block">
          <div className="sticky top-7">
            <ul className="space-y-px border-l border-[#21262d]">
              {toc.map(item => {
                const isActive = activeId === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => scrollTo(item.id)}
                      className={`block w-full text-left text-[13px] leading-[1.5] py-[5px] pr-2 -ml-px transition-colors ${
                        item.level === 3 ? 'pl-6' : 'pl-3'
                      }`}
                      style={{
                        borderLeft: '2px solid',
                        borderLeftColor: isActive ? '#e6edf3' : 'transparent',
                        color: isActive ? '#e6edf3' : '#8b949e',
                        fontWeight: isActive ? 500 : 400,
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = '#c9d1d9'; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = '#8b949e'; }}
                    >
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      )}
    </div>
  );
}
