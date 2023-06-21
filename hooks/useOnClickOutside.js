import { useEffect } from 'react'

export const useOnClickOutside = (ref, handler) => {
  useEffect(() => {
    const listener = (e) => {
      const el = ref?.current;
      // Do nothing if clicking ref's element or descendent elements
      if (!el || el.contains((event?.target) || null)) {
        return;
      }
      handler(event);
    };
    document.addEventListener(`mousedown`, listener);
    document.addEventListener(`touchstart`, listener);
    return () => {
      document.removeEventListener(`mousedown`, listener);
      document.removeEventListener(`touchstart`, listener);
    };
    // Reload only if ref or handler changes
  }, [ref, handler]);
}