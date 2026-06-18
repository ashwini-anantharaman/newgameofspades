import { CoachRequest, StreamEvent } from "./protocol";

export interface StreamHandlers {
  onDelta?: (text: string) => void;
  onDone?: (full: string) => void;
  onError?: (message: string) => void;
}

/**
 * Streams a coaching reply from your server route. Browser-only: never holds an
 * API key. Returns the full text, and also fires handlers as tokens arrive.
 * Falls back gracefully — on any failure, onError fires and the promise resolves
 * with "" so the caller can drop in a deterministic message instead.
 */
export async function streamCoach(
  req: CoachRequest,
  handlers: StreamHandlers = {},
  endpoint = "/api/coach",
  signal?: AbortSignal
): Promise<string> {
  let full = "";
  let errored = false;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal,
    });
    if (!res.ok || !res.body) throw new Error(`coach endpoint ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // SSE frames separated by blank line
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const line = frame.replace(/^data:\s?/, "").trim();
        if (!line) continue;
        let evt: StreamEvent;
        try { evt = JSON.parse(line); } catch { continue; }
        if (evt.type === "delta") { full += evt.text; handlers.onDelta?.(evt.text); }
        else if (evt.type === "error") { errored = true; handlers.onError?.(evt.message); }
        else if (evt.type === "done") { /* end */ }
      }
    }
    if (!errored) handlers.onDone?.(full);
    return full;
  } catch (e: any) {
    handlers.onError?.(e?.message ?? "coach unavailable");
    return full; // partial or empty -> caller uses fallback
  }
}
