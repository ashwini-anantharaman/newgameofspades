import { buildSystemPrompt, buildUserContent } from "../src/lib/teaching/llm/prompt.js";
import { streamCoach } from "../src/lib/teaching/llm/client.js";
import type { CoachRequest, StreamEvent } from "../src/lib/teaching/llm/protocol.js";

let failures = 0;
const check = (n: string, c: boolean) => { if (!c) { failures++; console.log("  FAIL:", n); } else console.log("  ok  :", n); };

const req: CoachRequest = {
  kind: "coach", mode: "reflect", phase: "playing",
  hand: [{ rank: "A", suit: "spades" }, { rank: "3", suit: "spades" }, { rank: "K", suit: "clubs" }],
  trick: [{ seat: "W", card: { rank: "K", suit: "hearts" } }, { seat: "N", card: { rank: "2", suit: "hearts" } }, { seat: "E", card: { rank: "9", suit: "hearts" } }],
  ledSuit: "hearts",
  bids: { N: 3, E: 2, S: 4, W: 3 },
  scoreLine: "You: 1 trick, bid 4 (need 3 more)",
  evals: [
    { card: { rank: "3", suit: "spades" }, score: 0.88, best: true, weak: false, tags: ["trumps-in"], nodeIds: ["trump", "high_spades"], rationale: "Trumps the trick with a low spade." },
    { card: { rank: "A", suit: "spades" }, score: 0.45, best: false, weak: false, tags: ["wastes-high-spade"], nodeIds: ["high_spades"], rationale: "Trumps in, but a lower spade would have won." },
    { card: { rank: "K", suit: "clubs" }, score: 0.4, best: false, weak: true, tags: ["safe-discard"], nodeIds: ["follow"], rationale: "Discard a low loser and hold your trumps." },
  ],
  verdict: { chosen: { rank: "A", suit: "spades" }, best: { rank: "3", suit: "spades" }, correct: false, chosenRationale: "Trumps in, but a lower spade would have won.", bestRationale: "Trumps the trick with a low spade." },
  weakNodes: ["high_spades"],
  recent: [],
};

console.log("Prompt builder");
const sys = buildSystemPrompt(req);
const usr = buildUserContent(req);
check("system encodes ground-truth rule", /GROUND TRUTH/.test(sys));
check("system injects focus area", /high_spades/.test(sys));
check("user content lists ranked moves with [BEST]", /\[BEST\]/.test(usr));
check("user content includes the verdict", /verdict: suboptimal/.test(usr));
check("user content uses suit symbols", /\u2660/.test(usr));
check("reflect task present", /react to the move they just made/.test(usr));

console.log("Stream client + fallback");
// Mock a streaming Response by patching global fetch.
function mockFetch(frames: StreamEvent[], ok = true): any {
  const body = frames.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
  return async () => {
    if (!ok) return { ok: false, status: 500, body: null };
    const enc = new TextEncoder();
    let sent = false;
    const stream = new ReadableStream({
      pull(ctrl) {
        if (sent) { ctrl.close(); return; }
        // emit in two chunks to exercise buffering
        const mid = Math.floor(body.length / 2);
        ctrl.enqueue(enc.encode(body.slice(0, mid)));
        ctrl.enqueue(enc.encode(body.slice(mid)));
        sent = true;
      },
    });
    return { ok: true, status: 200, body: stream };
  };
}

(globalThis as any).fetch = mockFetch([
  { type: "delta", text: "Partner wasn't winning, " },
  { type: "delta", text: "so trumping made sense — " },
  { type: "delta", text: "but the 3 would've won just as well." },
  { type: "done" },
]);

let streamed = "";
const full = await streamCoach(req, { onDelta: (t) => (streamed += t) }, "/api/coach");
check("streamed deltas accumulate", full.includes("trumping made sense"));
check("onDelta fired incrementally", streamed === full && full.length > 0);

console.log("Fallback on error");
(globalThis as any).fetch = mockFetch([], false);
let errored = false;
const fb = await streamCoach(req, { onError: () => (errored = true) }, "/api/coach");
check("error surfaces", errored);
check("returns empty so caller can use deterministic fallback", fb === "");

console.log(failures === 0 ? "\nPIPELINE CHECKS PASSED" : `\n${failures} FAILED`);
if (failures) process.exit(1);
