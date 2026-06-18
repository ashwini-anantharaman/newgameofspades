import { useEffect, useState } from "react";

/** Polls /api/health — true when coach server is reachable, false when not, null while checking. */
export function useCoachApiStatus(): boolean | null {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch("/api/health", { signal: AbortSignal.timeout(3000) });
        if (!cancelled) setOnline(res.ok);
      } catch {
        if (!cancelled) setOnline(false);
      }
    };
    check();
    const id = setInterval(check, 20_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return online;
}
