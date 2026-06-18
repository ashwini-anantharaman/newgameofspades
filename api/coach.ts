import type { VercelRequest, VercelResponse } from "@vercel/node";
import { coachStream } from "./lib/coachHandler";
import type { CoachRequest } from "../src/lib/teaching/llm/protocol";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body as CoachRequest;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  try {
    for await (const chunk of coachStream(body)) {
      res.write(chunk);
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "stream failed";
    res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`);
  } finally {
    res.end();
  }
}
