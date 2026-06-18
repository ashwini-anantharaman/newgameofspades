"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server/app.ts
var app_exports = {};
__export(app_exports, {
  default: () => app_default
});
module.exports = __toCommonJS(app_exports);
var import_express = __toESM(require("express"), 1);

// server/lib/coachHandler.ts
var import_sdk = __toESM(require("@anthropic-ai/sdk"), 1);

// src/lib/teaching/llm/prompt.ts
var SUIT_SYM = { spades: "\u2660", hearts: "\u2665", diamonds: "\u2666", clubs: "\u2663" };
var card = (c3) => `${c3.rank}${SUIT_SYM[c3.suit]}`;
var cards = (cs) => cs.map(card).join(" ");
function buildSystemPrompt(req) {
  const focus = req.weakNodes.length ? `
The learner is currently working on: ${req.weakNodes.join(", ")}. When relevant, steer your comment toward these.` : "";
  return [
    "You are a warm Spades tutor for a beginner.",
    "",
    "GROUND TRUTH: Trust the engine evaluation completely. Never rank moves yourself or disagree with [BEST].",
    "",
    "Voice \u2014 strict limits:",
    "- Max 2 short sentences, ~25 words total. Plain language.",
    "- At most one brief question, or none.",
    "- Good move: one specific praise line.",
    "- Weak move: name the better card + one reason. No lecture.",
    "- Never restate rules unless asked. Never reference unseen cards.",
    focus
  ].filter(Boolean).join("\n");
}
function buildUserContent(req) {
  const lines = [];
  lines.push(`Phase: ${req.phase}`);
  lines.push(`Your hand: ${cards(req.hand)}`);
  if (req.trick.length) lines.push(`Trick so far (led ${req.ledSuit}): ${req.trick.map((p) => `${p.seat} ${card(p.card)}`).join(", ")}`);
  lines.push(`Bids: ${Object.entries(req.bids).map(([s, b]) => `${s}=${b ?? "?"}`).join(" ")}`);
  if (req.scoreLine) lines.push(req.scoreLine);
  lines.push("");
  lines.push("Engine evaluation of your legal moves (best first):");
  for (const e of req.evals.slice(0, 6)) {
    lines.push(`  ${card(e.card)}  score ${e.score.toFixed(2)}${e.best ? " [BEST]" : ""}${e.weak ? " [weak]" : ""} \u2014 ${e.rationale}`);
  }
  if (req.verdict) {
    const v = req.verdict;
    lines.push("");
    lines.push(`Learner played ${card(v.chosen)} \u2014 engine verdict: ${v.correct ? "good (near-best)" : "suboptimal"}.`);
    lines.push(`Engine's best was ${card(v.best)} (${v.bestRationale}).`);
  }
  if (req.recent.length) {
    lines.push("");
    lines.push("Recent conversation:");
    for (const r of req.recent.slice(-4)) lines.push(`  ${r}`);
  }
  lines.push("");
  switch (req.kind) {
    case "coach":
      if (req.mode === "bid") lines.push("Task: one line on their bid vs engine count. Optional one short question.");
      else if (req.verdict) lines.push("Task: react to their move in 1-2 sentences max.");
      else lines.push("Task: light nudge or one question. Do not give the answer.");
      break;
    case "ask":
      lines.push(`The learner asks: "${req.question}"`);
      lines.push("Task: answer in 1-2 sentences using engine eval.");
      break;
    case "briefing":
      lines.push("Task: one encouraging sentence on what to focus on this game.");
      break;
  }
  return lines.join("\n");
}

// src/lib/teaching/llm/protocol.ts
var COACH_MODEL = typeof process !== "undefined" && process.env?.COACH_MODEL || "claude-sonnet-4-6";
var MAX_TOKENS = 96;
var CONTENT_MAX_TOKENS = 1200;

// server/lib/coachHandler.ts
var _client = null;
function client() {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
    _client = new import_sdk.default({ apiKey });
  }
  return _client;
}
var sse = (e) => `data: ${JSON.stringify(e)}

`;
async function* coachStream(req) {
  try {
    const system = buildSystemPrompt(req);
    const content = buildUserContent(req);
    const stream = client().messages.stream({
      model: COACH_MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content }]
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield sse({ type: "delta", text: event.delta.text });
      }
    }
    yield sse({ type: "done" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "coach error";
    yield sse({ type: "error", message });
    yield sse({ type: "done" });
  }
}

// server/lib/contentHandler.ts
var import_sdk2 = __toESM(require("@anthropic-ai/sdk"), 1);

// src/lib/store/content.ts
var LESSONS = {
  suits: { nodeId: "suits", title: "Suits & ranking", steps: [
    { heading: "Four suits", body: "Spades, hearts, diamonds, clubs. Each suit has thirteen cards from 2 (low) to Ace (high).", takeaway: "Ace is highest in its suit, 2 is lowest.", demo: "rankRow" },
    { heading: "Spades are special", body: "In Spades, the spade suit is trump \u2014 but you still rank cards within each suit the same way.", takeaway: "Learn ranks first; trump comes later.", demo: "rankRow" }
  ] },
  trick: { nodeId: "trick", title: "What is a trick", steps: [
    { heading: "One trick", body: "Each player plays one card. The highest card of the led suit wins all four.", takeaway: "Highest of the led suit wins \u2014 unless a spade is played.", demo: "normalTrick" }
  ] },
  follow: { nodeId: "follow", title: "Following suit", steps: [
    { heading: "Follow if you can", body: "You must play the suit that was led if you hold it. Only when you're void may you play something else.", takeaway: "Have the led suit? You must play it.", demo: "followDemo" }
  ] },
  trump: { nodeId: "trump", title: "Spades are trump", steps: [
    { heading: "Trumps win", body: "A spade beats any card of another suit \u2014 even the 2 of spades beats the Ace of hearts.", takeaway: "Out of the led suit? A spade can steal the trick.", demo: "trumpTrick" }
  ] },
  breaking: { nodeId: "breaking", title: "Breaking spades", steps: [
    { heading: "Wait to lead spades", body: "You can't lead a spade until spades are 'broken' \u2014 first played when someone is void in the led suit.", takeaway: "No leading spades until they're broken.", demo: "breakingDemo" }
  ] },
  bid_basics: { nodeId: "bid_basics", title: "Bidding basics", steps: [
    { heading: "Predict your tricks", body: "Before play, each player bids how many tricks they expect. Your bid plus your partner's is your team's target.", takeaway: "Bid what you can win \u2014 together.", demo: "bidDemo" }
  ] },
  count_bid: { nodeId: "count_bid", title: "Counting your bid", steps: [
    { heading: "Count winners", body: "Count likely winners \u2014 Aces, high spades, long trumps \u2014 not just face cards.", takeaway: "Winners, not just high cards.", demo: "countDemo" }
  ] },
  high_spades: { nodeId: "high_spades", title: "Not wasting high spades", steps: [
    { heading: "Win cheaply", body: "If a small spade wins the trick, don't spend a big one. Save high trumps for when they matter.", takeaway: "Win with the smallest card that does the job.", demo: "cheapWin" }
  ] },
  partner: { nodeId: "partner", title: "Reading your partner", steps: [
    { heading: "Duck for partner", body: "If your partner is already winning the trick, play low. Don't beat your own side.", takeaway: "Partner winning? Duck low.", demo: "duckDemo" }
  ] },
  bags: { nodeId: "bags", title: "Avoiding bags", steps: [
    { heading: "Don't over-win", body: "Tricks past your bid are 'bags'. Ten bags cost you 100 points, so stop grabbing tricks you don't need.", takeaway: "Extra tricks can hurt \u2014 watch your bags.", demo: "bagDemo" }
  ] },
  nil: { nodeId: "nil", title: "Nil", steps: [
    { heading: "Zero tricks", body: "A nil bid means you'll win none. Succeed for +100; take even one and it's \u2212100.", takeaway: "Nil = win nothing, on purpose.", demo: "nilDemo" }
  ] },
  setting: { nodeId: "setting", title: "Setting opponents", steps: [
    { heading: "Set them", body: "Win tricks the opponents needed so they fall short of their bid \u2014 they lose 10 per bid trick.", takeaway: "Deny their tricks to set them.", demo: "setDemo" }
  ] }
};
var c = (rank, suit) => ({ rank, suit });
var SCENARIOS = [
  {
    id: "follow-1",
    nodeId: "follow",
    difficulty: 1,
    prompt: "Hearts were led. Which cards may you legally play?",
    hand: [c("A", "spades"), c("9", "hearts"), c("3", "hearts"), c("K", "clubs")],
    trick: [{ seat: "W", card: c("5", "hearts") }],
    ledSuit: "hearts",
    bids: { N: 3, E: 2, S: 3, W: 4 },
    spadesBroken: false,
    correctCards: [c("9", "hearts"), c("3", "hearts")],
    explainCorrect: "You hold hearts, so you must follow suit \u2014 only the hearts are legal."
  },
  {
    id: "partner-1",
    nodeId: "partner",
    difficulty: 2,
    prompt: "Your partner (North) is winning with the Ace of clubs. What do you play?",
    hand: [c("K", "clubs"), c("4", "clubs"), c("2", "clubs")],
    trick: [{ seat: "N", card: c("A", "clubs") }, { seat: "E", card: c("7", "clubs") }],
    ledSuit: "clubs",
    bids: { N: 4, E: 2, S: 3, W: 3 },
    spadesBroken: false,
    correctCards: [c("2", "clubs")],
    explainCorrect: "Partner already has the trick \u2014 duck with your lowest club and save the King."
  },
  {
    id: "high_spades-1",
    nodeId: "high_spades",
    difficulty: 2,
    prompt: "You're void in hearts and want this trick. Which spade do you play?",
    hand: [c("A", "spades"), c("3", "spades"), c("J", "diamonds")],
    trick: [{ seat: "W", card: c("K", "hearts") }, { seat: "N", card: c("2", "hearts") }, { seat: "E", card: c("9", "hearts") }],
    ledSuit: "hearts",
    bids: { N: 3, E: 2, S: 4, W: 3 },
    spadesBroken: false,
    correctCards: [c("3", "spades")],
    explainCorrect: "A low spade already wins \u2014 save the Ace of spades for later."
  },
  {
    id: "bags-1",
    nodeId: "bags",
    difficulty: 3,
    prompt: "Your team has already made its bid. Diamonds led, you can win or duck. Best play?",
    hand: [c("A", "diamonds"), c("4", "diamonds")],
    trick: [{ seat: "W", card: c("K", "diamonds") }],
    ledSuit: "diamonds",
    bids: { N: 2, E: 3, S: 2, W: 3 },
    spadesBroken: true,
    correctCards: [c("4", "diamonds")],
    explainCorrect: "You don't need the trick \u2014 taking it just adds a bag. Duck with the 4."
  }
];

// src/lib/teaching/scenarioGen.ts
var c2 = (rank, suit) => ({ rank, suit });
var bids = { N: 3, E: 2, S: 3, W: 4 };
var BASE = {
  suits: [{
    id: "suits-1",
    nodeId: "suits",
    difficulty: 1,
    prompt: "Rank matters within each suit. Which card in your hand is the highest?",
    hand: [c2("K", "hearts"), c2("A", "spades"), c2("Q", "diamonds"), c2("5", "clubs")],
    trick: [],
    ledSuit: null,
    bids,
    spadesBroken: false,
    correctCards: [c2("A", "spades")],
    explainCorrect: "Ace is highest in its suit \u2014 the A\u2660 tops every other card here."
  }],
  trick: [{
    id: "trick-1",
    nodeId: "trick",
    difficulty: 1,
    prompt: "Hearts were led. Which card would win this trick if you played it now?",
    hand: [c2("A", "hearts"), c2("9", "hearts"), c2("K", "clubs")],
    trick: [{ seat: "W", card: c2("7", "hearts") }],
    ledSuit: "hearts",
    bids,
    spadesBroken: false,
    correctCards: [c2("A", "hearts")],
    explainCorrect: "The Ace of hearts is highest of the led suit \u2014 it wins the trick."
  }],
  follow: [{
    id: "follow-1",
    nodeId: "follow",
    difficulty: 1,
    prompt: "Hearts were led. Which cards may you legally play?",
    hand: [c2("A", "spades"), c2("9", "hearts"), c2("3", "hearts"), c2("K", "clubs")],
    trick: [{ seat: "W", card: c2("5", "hearts") }],
    ledSuit: "hearts",
    bids,
    spadesBroken: false,
    correctCards: [c2("9", "hearts"), c2("3", "hearts")],
    explainCorrect: "You hold hearts \u2014 you must follow suit. Only the hearts are legal."
  }],
  trump: [{
    id: "trump-1",
    nodeId: "trump",
    difficulty: 1,
    prompt: "A high heart is winning the trick. You're void in hearts \u2014 how do you take it?",
    hand: [c2("2", "spades"), c2("J", "diamonds"), c2("4", "clubs")],
    trick: [{ seat: "W", card: c2("A", "hearts") }, { seat: "N", card: c2("3", "hearts") }],
    ledSuit: "hearts",
    bids,
    spadesBroken: false,
    correctCards: [c2("2", "spades")],
    explainCorrect: "Any spade beats the Ace of hearts \u2014 even the 2\u2660 is trump."
  }],
  breaking: [{
    id: "breaking-1",
    nodeId: "breaking",
    difficulty: 1,
    prompt: "Spades aren't broken yet. You're leading \u2014 which cards are legal to lead?",
    hand: [c2("A", "spades"), c2("K", "hearts"), c2("5", "diamonds"), c2("3", "clubs")],
    trick: [],
    ledSuit: null,
    bids,
    spadesBroken: false,
    correctCards: [c2("K", "hearts"), c2("5", "diamonds"), c2("3", "clubs")],
    explainCorrect: "You can't lead spades until they're broken \u2014 lead a non-spade."
  }],
  bid_basics: [{
    id: "bid_basics-1",
    nodeId: "bid_basics",
    difficulty: 1,
    prompt: "You bid 3 with your partner. Which opening lead gives you a fair shot at tricks?",
    hand: [c2("A", "diamonds"), c2("K", "diamonds"), c2("7", "clubs"), c2("4", "clubs")],
    trick: [],
    ledSuit: null,
    bids: { N: 3, E: 2, S: 3, W: 3 },
    spadesBroken: false,
    correctCards: [c2("A", "diamonds")],
    explainCorrect: "Leading an Ace is a strong start toward making your bid."
  }],
  count_bid: [{
    id: "count_bid-1",
    nodeId: "count_bid",
    difficulty: 2,
    prompt: "Count likely winners before you play. Which card is most likely to win a trick here?",
    hand: [c2("A", "spades"), c2("K", "spades"), c2("A", "clubs"), c2("5", "hearts")],
    trick: [],
    ledSuit: null,
    bids: { N: 4, E: 2, S: 4, W: 3 },
    spadesBroken: true,
    correctCards: [c2("A", "spades")],
    explainCorrect: "High spades are almost always winners \u2014 count them toward your bid."
  }],
  high_spades: [{
    id: "high_spades-1",
    nodeId: "high_spades",
    difficulty: 2,
    prompt: "You're void in hearts and want this trick. Which spade do you play?",
    hand: [c2("A", "spades"), c2("3", "spades"), c2("J", "diamonds")],
    trick: [{ seat: "W", card: c2("K", "hearts") }, { seat: "N", card: c2("2", "hearts") }, { seat: "E", card: c2("9", "hearts") }],
    ledSuit: "hearts",
    bids,
    spadesBroken: false,
    correctCards: [c2("3", "spades")],
    explainCorrect: "A low spade already wins \u2014 save the Ace of spades for later."
  }],
  partner: [{
    id: "partner-1",
    nodeId: "partner",
    difficulty: 2,
    prompt: "Your partner (North) is winning with the Ace of clubs. What do you play?",
    hand: [c2("K", "clubs"), c2("4", "clubs"), c2("2", "clubs")],
    trick: [{ seat: "N", card: c2("A", "clubs") }, { seat: "E", card: c2("7", "clubs") }],
    ledSuit: "clubs",
    bids,
    spadesBroken: false,
    correctCards: [c2("2", "clubs")],
    explainCorrect: "Partner already has the trick \u2014 duck with your lowest club."
  }],
  bags: [{
    id: "bags-1",
    nodeId: "bags",
    difficulty: 3,
    prompt: "Your team already made its bid. Diamonds led \u2014 best play?",
    hand: [c2("A", "diamonds"), c2("4", "diamonds")],
    trick: [{ seat: "W", card: c2("K", "diamonds") }],
    ledSuit: "diamonds",
    bids: { N: 2, E: 3, S: 2, W: 3 },
    spadesBroken: true,
    correctCards: [c2("4", "diamonds")],
    explainCorrect: "You don't need the trick \u2014 taking it just adds a bag. Duck with the 4."
  }],
  nil: [{
    id: "nil-1",
    nodeId: "nil",
    difficulty: 2,
    prompt: "You bid nil \u2014 you must win zero tricks. Hearts were led. What do you play?",
    hand: [c2("9", "hearts"), c2("2", "hearts"), c2("K", "spades")],
    trick: [{ seat: "W", card: c2("6", "hearts") }],
    ledSuit: "hearts",
    bids: { N: 3, E: 2, S: "nil", W: 4 },
    spadesBroken: false,
    correctCards: [c2("2", "hearts")],
    explainCorrect: "Stay under the trick with your lowest heart \u2014 protect your nil."
  }],
  setting: [{
    id: "setting-1",
    nodeId: "setting",
    difficulty: 3,
    prompt: "East-West need this trick to make their bid. How do you set them?",
    hand: [c2("5", "spades"), c2("8", "diamonds"), c2("3", "clubs")],
    trick: [{ seat: "W", card: c2("A", "diamonds") }, { seat: "N", card: c2("6", "diamonds") }],
    ledSuit: "diamonds",
    bids: { N: 3, E: 5, S: 3, W: 5 },
    spadesBroken: true,
    correctCards: [c2("5", "spades")],
    explainCorrect: "Trump in and steal the trick \u2014 deny them the trick they need."
  }]
};
function scenariosForNode(nodeId) {
  return BASE[nodeId] ?? [];
}

// src/lib/teaching/content/protocol.ts
var DEMO_KEYS = [
  "rankRow",
  "normalTrick",
  "followDemo",
  "trumpTrick",
  "breakingDemo",
  "bidDemo",
  "countDemo",
  "cheapWin",
  "duckDemo",
  "bagDemo",
  "nilDemo",
  "setDemo"
];

// src/lib/teaching/content/prompt.ts
function buildLessonPrompt(req) {
  return [
    `Create a Spades lesson for the concept "${req.title}" (${req.nodeId}).`,
    `Context: ${req.blurb}`,
    "",
    "Return ONLY valid JSON (no markdown) matching:",
    `{ "steps": [{ "heading": string, "body": string, "takeaway": string, "demo": string }] }`,
    "",
    "Rules:",
    "- 2 or 3 steps, beginner-friendly, short paragraphs.",
    "- demo must be one of: " + DEMO_KEYS.join(", "),
    "- Teach Spades rules accurately. No jargon without explanation.",
    `- nodeId in output concept is "${req.nodeId}".`
  ].join("\n");
}
function buildScenarioPrompt(req) {
  return [
    `Create a single Spades practice scenario for "${req.title}" (${req.nodeId}).`,
    `Context: ${req.blurb}. Difficulty level: ${req.difficulty}/3.`,
    "",
    "Return ONLY valid JSON (no markdown):",
    `{
  "id": string,
  "nodeId": "${req.nodeId}",
  "difficulty": ${req.difficulty},
  "prompt": string,
  "hand": [{ "rank": "2"|"3"|...|"A", "suit": "spades"|"hearts"|"diamonds"|"clubs" }],
  "trick": [{ "seat": "N"|"E"|"S"|"W", "card": { rank, suit } }],
  "ledSuit": "spades"|"hearts"|"diamonds"|"clubs"|null,
  "bids": { "N": number, "E": number, "S": number, "W": number },
  "spadesBroken": boolean,
  "correctCards": [{ rank, suit }],
  "explainCorrect": string
}`,
    "",
    "Rules:",
    "- South is the learner; hand is what South holds.",
    "- correctCards must be legal plays from hand given trick/led suit.",
    "- One clear best answer for teaching this concept.",
    "- 3-5 cards in hand, 0-3 cards in trick."
  ].join("\n");
}

// server/lib/contentHandler.ts
var _client2 = null;
function client2() {
  if (!_client2) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
    _client2 = new import_sdk2.default({ apiKey });
  }
  return _client2;
}
var RANKS = /* @__PURE__ */ new Set(["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]);
var SUITS = /* @__PURE__ */ new Set(["spades", "hearts", "diamonds", "clubs"]);
var SEATS = /* @__PURE__ */ new Set(["N", "E", "S", "W"]);
function extractJson(text) {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : trimmed;
  return JSON.parse(raw);
}
function validDemo(d) {
  return DEMO_KEYS.includes(d) ? d : "normalTrick";
}
function parseLesson(nodeId, text, fallback) {
  try {
    const data = extractJson(text);
    const steps = (data.steps ?? []).filter((s) => s?.heading && s?.body).map((s) => ({
      heading: String(s.heading),
      body: String(s.body),
      takeaway: String(s.takeaway ?? s.body),
      demo: validDemo(String(s.demo ?? "normalTrick"))
    }));
    if (steps.length < 1) return { lesson: fallback, fromAi: false };
    return { lesson: { nodeId, title: fallback.title, steps }, fromAi: true };
  } catch {
    return { lesson: fallback, fromAi: false };
  }
}
function parseCard(c3) {
  if (!c3 || typeof c3 !== "object") return null;
  const o = c3;
  if (!o.rank || !o.suit || !RANKS.has(o.rank) || !SUITS.has(o.suit)) return null;
  return { rank: o.rank, suit: o.suit };
}
function parseScenario(nodeId, text, fallback) {
  try {
    const data = extractJson(text);
    const hand = (data.hand ?? []).map(parseCard).filter(Boolean);
    const trick = (data.trick ?? []).map((t) => {
      const card2 = parseCard(t.card);
      const seat = t.seat;
      if (!card2 || !seat || !SEATS.has(seat)) return null;
      return { seat, card: card2 };
    }).filter(Boolean);
    const correctCards = (data.correctCards ?? []).map(parseCard).filter(Boolean);
    if (!hand.length || !correctCards.length || !data.prompt) return { scenario: fallback, fromAi: false };
    const led = data.ledSuit;
    const ledSuit = led === null || led === void 0 ? null : SUITS.has(String(led)) ? String(led) : fallback.ledSuit;
    return {
      scenario: {
        id: String(data.id ?? `${nodeId}-ai`),
        nodeId,
        difficulty: [1, 2, 3].includes(Number(data.difficulty)) ? Number(data.difficulty) : fallback.difficulty,
        prompt: String(data.prompt),
        hand,
        trick,
        ledSuit,
        bids: data.bids ?? fallback.bids,
        spadesBroken: Boolean(data.spadesBroken),
        correctCards,
        explainCorrect: String(data.explainCorrect ?? fallback.explainCorrect)
      },
      fromAi: true
    };
  } catch {
    return { scenario: fallback, fromAi: false };
  }
}
async function generateLesson(req) {
  const fallback = LESSONS[req.nodeId] ?? {
    nodeId: req.nodeId,
    title: req.title,
    steps: [{ heading: req.title, body: req.blurb, takeaway: req.blurb, demo: "normalTrick" }]
  };
  try {
    const msg = await client2().messages.create({
      model: COACH_MODEL,
      max_tokens: CONTENT_MAX_TOKENS,
      system: "You write concise Spades teaching content. Output only valid JSON.",
      messages: [{ role: "user", content: buildLessonPrompt(req) }]
    });
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const { lesson, fromAi } = parseLesson(req.nodeId, text, fallback);
    return { lesson, source: fromAi ? "ai" : "static" };
  } catch {
    return { lesson: fallback, source: "static" };
  }
}
async function generateScenario(req) {
  const pool = scenariosForNode(req.nodeId);
  const fallback = pool.find((s) => s.difficulty === req.difficulty) ?? pool[0];
  if (!fallback) throw new Error(`no fallback scenario for ${req.nodeId}`);
  try {
    const msg = await client2().messages.create({
      model: COACH_MODEL,
      max_tokens: CONTENT_MAX_TOKENS,
      system: "You create Spades practice drills. Output only valid JSON.",
      messages: [{ role: "user", content: buildScenarioPrompt(req) }]
    });
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const { scenario, fromAi } = parseScenario(req.nodeId, text, fallback);
    return { scenario, source: fromAi ? "ai" : "static" };
  } catch {
    return { scenario: fallback, source: "static" };
  }
}

// server/app.ts
var app = (0, import_express.default)();
app.use(import_express.default.json({ limit: "256kb" }));
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, coach: Boolean(process.env.ANTHROPIC_API_KEY) });
});
app.post("/api/coach", async (req, res) => {
  const body = req.body;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  try {
    for await (const chunk of coachStream(body)) {
      res.write(chunk);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "stream failed";
    res.write(`data: ${JSON.stringify({ type: "error", message })}

`);
  } finally {
    res.end();
  }
});
app.post("/api/content/lesson", async (req, res) => {
  try {
    const body = req.body;
    const result = await generateLesson(body);
    res.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "lesson failed";
    res.status(500).json({ error: message });
  }
});
app.post("/api/content/scenario", async (req, res) => {
  try {
    const body = req.body;
    const result = await generateScenario(body);
    res.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "scenario failed";
    res.status(500).json({ error: message });
  }
});
var app_default = app;
module.exports = app_default;
//# sourceMappingURL=handler.cjs.map
