import { useCallback, useRef, useState } from 'react';

export function useBanners() {
  const [banners, setBanners] = useState([]);
  const counter = useRef(0);

  const push = useCallback((entry) => {
    const item = typeof entry === 'function' ? { render: entry } : entry;
    setBanners(prev => {
      // Dedup: a banner with the same key replaces its predecessor in place,
      // so repeated identical failures don't pile up.
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

  const clear = useCallback(() => setBanners([]), []);

  return { banners, push, dismiss, dismissKey, clear };
}

export default function BannerStack({ banners, dismiss, className = '' }) {
  if (!banners.length) return null;
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {banners.map(b => (
        <div key={b.id}>{b.render(() => dismiss(b.id))}</div>
      ))}
    </div>
  );
}
