import Anthropic from "@anthropic-ai/sdk";
import { CoachRequest, StreamEvent } from "../src/lib/teaching/llm/protocol";
import { buildSystemPrompt, buildUserContent } from "../src/lib/teaching/llm/prompt";
import { COACH_MODEL, MAX_TOKENS } from "../src/lib/teaching/llm/protocol";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

const sse = (e: StreamEvent) => `data: ${JSON.stringify(e)}\n\n`;

/**
 * Core handler. Framework-agnostic: yields SSE-formatted strings.
 * Adapt to Express/Next/Vercel by piping these to the response (see express.ts).
 * Keeps the API key server-side; the model is told to teach to the engine
 * evaluation passed in the request (ground truth), never to re-rank moves.
 */
export async function* coachStream(req: CoachRequest): AsyncGenerator<string> {
  try {
    const system = buildSystemPrompt(req);
    const content = buildUserContent(req);

    const stream = client().messages.stream({
      model: COACH_MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield sse({ type: "delta", text: event.delta.text });
      }
    }
    yield sse({ type: "done" });
  } catch (e: any) {
    yield sse({ type: "error", message: e?.message ?? "coach error" });
    yield sse({ type: "done" });
  }
}

/** Convenience: collect the full text server-side (non-streaming callers). */
export async function coachComplete(req: CoachRequest): Promise<string> {
  const system = buildSystemPrompt(req);
  const content = buildUserContent(req);
  const msg = await client().messages.create({
    model: COACH_MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: "user", content }],
  });
  return msg.content.filter((b) => b.type === "text").map((b: any) => b.text).join("");
}
