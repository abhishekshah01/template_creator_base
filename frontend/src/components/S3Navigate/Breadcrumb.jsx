// AWS-style breadcrumb. Each crumb except the last is clickable.
//
//   Amazon S3 / Buckets / <bucket> / <prefix> / <object>
//
// Crumbs are passed as an array of { label, onClick? }. The last crumb's
// onClick is ignored — it renders as plain dark text.
export default function Breadcrumb({ crumbs }) {
  return (
    <nav className="flex items-center flex-wrap gap-x-1.5 gap-y-1 text-[14px] mb-4">
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="flex items-center gap-x-1.5">
            {isLast ? (
              <span className="text-[#ffffff] font-medium">{c.label}</span>
            ) : (
              <button onClick={c.onClick}
                className="text-[#88c4ff] hover:underline decoration-1 underline-offset-2">
                {c.label}
              </button>
            )}
            {!isLast && (
              <svg className="w-3 h-3 text-[#6e7681]" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
              </svg>
            )}
          </span>
        );
      })}
    </nav>
  );
}
