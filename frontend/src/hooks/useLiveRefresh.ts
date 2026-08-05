import { useCallback, useEffect, useRef } from "react";

type Options = {
  /** Poll interval in ms (default 10s). Set 0 to disable polling. */
  intervalMs?: number;
  /** Window events that trigger an immediate refresh */
  events?: string[];
  enabled?: boolean;
};

/**
 * Runs `onRefresh` on mount, on window focus, on custom events, and on an interval.
 */
export function useLiveRefresh(onRefresh: () => void | Promise<void>, options: Options = {}) {
  const { intervalMs = 10_000, events = [], enabled = true } = options;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const run = useCallback(() => {
    void onRefreshRef.current();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    run();

    const onFocus = () => run();
    window.addEventListener("focus", onFocus);

    const handlers = events.map((name) => {
      const handler = () => run();
      window.addEventListener(name, handler);
      return { name, handler };
    });

    let interval: ReturnType<typeof setInterval> | undefined;
    if (intervalMs > 0) {
      interval = setInterval(run, intervalMs);
    }

    return () => {
      window.removeEventListener("focus", onFocus);
      handlers.forEach(({ name, handler }) => window.removeEventListener(name, handler));
      if (interval) clearInterval(interval);
    };
  }, [enabled, intervalMs, events.join(","), run]);
}
