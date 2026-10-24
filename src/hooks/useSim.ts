import { useEffect, useReducer } from "react";

/** Re-render whenever a simulation emitter (cache, limiter, bus) changes. Throttled to ~5fps. */
export function useSim(...sources: { subscribe: (fn: () => void) => () => void }[]) {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    let pending = false;
    const onChange = () => {
      if (pending) return;
      pending = true;
      setTimeout(() => { pending = false; force(); }, 200);
    };
    const unsubs = sources.map((s) => s.subscribe(onChange));
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
