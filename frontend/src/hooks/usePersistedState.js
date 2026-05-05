import { useEffect, useState } from 'react';

export function usePersistedState(key, initial, options = {}) {
  const { serialize = JSON.stringify, deserialize = JSON.parse, sanitize } = options;

  const [state, setState] = useState(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored === null) return initial;
      const parsed = deserialize(stored);
      return sanitize ? sanitize(parsed) : parsed;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(key, serialize(state));
    } catch {
      // storage full or unavailable — silent fail
    }
  }, [key, state, serialize]);

  return [state, setState];
}
