import { useEffect, useState } from "react";

async function coachApiReachable(): Promise<boolean> {
  const res = await fetch("/api/health", {
    signal: AbortSignal.timeout(4000),
    credentials: "same-origin",
  });
  if (!res.ok) return false;
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return false;
  const body = (await res.json()) as { ok?: boolean };
  return body.ok === true;
}

/** Polls /api/health — true when coach server is reachable, false when not, null while checking. */
export function useCoachApiStatus(): boolean | null {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const ok = await coachApiReachable();
        if (!cancelled) setOnline(ok);
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

export { coachApiReachable };
