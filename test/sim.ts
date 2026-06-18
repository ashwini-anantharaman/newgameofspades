import { newGame, advance, applyAction, legalMoves, isLegal, scoreRound } from "../src/lib/engine/index.js";
import type { GameState, Seat } from "../src/lib/engine/types.js";
import { aiPlay, aiBid } from "../src/lib/engine/ai.js";
import { evaluateMoves, evaluateBid } from "../src/lib/engine/evaluate.js";
import { emptyProfile, applyObservation } from "../src/lib/teaching/profile.js";
import { analyzeMove } from "../src/lib/teaching/coach.js";
import { nodeStatus, isMastered, isNodeCleared } from "../src/lib/teaching/skillTree.js";

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failures++; console.log("  FAIL:", name); } else { console.log("  ok  :", name); }
}

// 1) Full AI game to completion, asserting only legal moves the whole way.
function playFullGame(seed: number): GameState {
  let s = newGame(seed);
  let guard = 0;
  while (s.phase !== "gameOver" && guard++ < 5000) {
    const r = advance(s);            // run AI seats
    s = r.state;
    if (s.phase === "scoring") { s = startNext(s); continue; }
    if (s.phase === "gameOver") break;
    if (s.turn === "S") {            // human seat -> play engine-evaluated best, legally
      if (s.phase === "bidding") {
        s = applyAction(s, { type: "BID", seat: "S", bid: aiBid(s.hands.S) });
      } else {
        const card = aiPlay(s, "S");
        if (!isLegal(s, "S", card)) throw new Error("illegal move generated");
        s = applyAction(s, { type: "PLAY", seat: "S", card });
      }
    }
  }
  return s;
}
import { startRound } from "../src/lib/engine/gameState.js";
function startNext(s: GameState): GameState { return startRound(s); }

console.log("Engine: full games");
for (const seed of [1, 7, 42, 1234, 99999]) {
  const s = playFullGame(seed);
  check(`game seed ${seed} reaches gameOver`, s.phase === "gameOver");
  check(`game seed ${seed} a team >= 500`, s.scores.NS >= 500 || s.scores.EW >= 500);
}

// 2) Rules spot checks
console.log("Engine: rules");
{
  let s = newGame(3);
  s = advance(s).state; // to bidding/human
  // bidding for all
  while (s.phase === "bidding") {
    s = applyAction(s, { type: "BID", seat: s.turn, bid: aiBid(s.hands[s.turn]) });
    s = advance(s).state;
  }
  check("after bidding, phase is playing", s.phase === "playing");
  const leader = s.turn;
  const legal = legalMoves(s, leader);
  check("opening leader cannot lead spades (unless only spades)",
    legal.every((c) => c.suit !== "spades") || s.hands[leader].every((c) => c.suit === "spades"));
}

// 3) Scoring: made, set, bags, nil
console.log("Scoring");
{
  const base = newGame(5);
  const mk = (bids: any, tricks: any): GameState => ({ ...base, bids, tricksWon: tricks, phase: "playing" });
  // made exactly: NS bid 3+2=5, win 5 -> +50
  let r = scoreRound(mk({ N: 3, S: 2, E: 4, W: 2 }, { N: 3, S: 2, E: 4, W: 2 }));
  check("made contract scores +10/trick", r.delta.NS === 50);
  // set: NS bid 5 win 4 -> -50
  r = scoreRound(mk({ N: 3, S: 2, E: 4, W: 2 }, { N: 2, S: 2, E: 4, W: 3 }));
  check("missed contract scores -10/trick", r.delta.NS === -50);
  // bags: NS bid 3 win 5 -> 30 + 2 bags
  r = scoreRound(mk({ N: 2, S: 1, E: 5, W: 5 }, { N: 3, S: 2, E: 4, W: 4 }));
  check("overtricks become bags", r.bagsAdded.NS === 2 && r.delta.NS === 32);
  // nil made: S nil, takes 0
  r = scoreRound(mk({ N: 3, S: "nil", E: 4, W: 3 }, { N: 3, S: 0, E: 3, W: 3 }));
  check("nil made = +100 on top of partner contract", r.nil.S === "made" && r.delta.NS === 130);
  // nil broken: S nil, takes 1
  r = scoreRound(mk({ N: 3, S: "nil", E: 4, W: 3 }, { N: 3, S: 1, E: 3, W: 3 }));
  check("nil broken = -100 and trick is a bag", r.nil.S === "broken" && r.delta.NS === -70 + 1 && r.bagsAdded.NS === 1);
}

// 4) Evaluator: legal-only, has a best, bid sane
console.log("Evaluator");
{
  let s = newGame(11);
  s = advance(s).state;
  while (s.phase === "bidding") { s = applyAction(s, { type: "BID", seat: s.turn, bid: aiBid(s.hands[s.turn]) }); s = advance(s).state; }
  if (s.turn !== "S") { /* advance to S play */ }
  const evals = evaluateMoves(s, s.turn === "S" ? "S" : s.turn);
  check("evaluator returns at least one move", evals.length >= 1);
  check("exactly one best", evals.filter((e) => e.best).length === 1);
  check("scores within 0..1", evals.every((e) => e.score >= 0 && e.score <= 1));
  const be = evaluateBid(s.hands.S);
  check("bid suggestion in range", be.suggested >= be.range[0] && be.suggested <= be.range[1]);
}

// 5) Teaching: observation reducer + mastery gating + coach analysis
console.log("Teaching");
{
  let p = emptyProfile();
  // unprompted correct x3 on 'suits' should master it (target 2, score>=0.7)
  for (let i = 0; i < 6; i++) p = applyObservation(p, { nodeIds: ["suits"], correct: true, prompted: false });
  check("repeated unprompted correct masters node", isMastered(p, "suits"));
  check("mastered 'suits' unlocks 'trick' (available)", nodeStatus(p, "trick") === "available");
  check("locked node stays locked behind deps", nodeStatus(p, "setting") === "locked");

  let pLesson = emptyProfile();
  pLesson = {
    ...applyObservation(pLesson, { nodeIds: ["suits"], correct: true, prompted: false }),
    lessonsCompleted: { suits: true },
    practicesCompleted: { suits: true },
  };
  check("suits lesson+practice clears trick deps", nodeStatus(pLesson, "trick") === "available");
  check("isNodeCleared after lesson+practice", isNodeCleared(pLesson, "suits"));

  // prompted correct should NOT grant demonstrations
  let p2 = emptyProfile();
  for (let i = 0; i < 6; i++) p2 = applyObservation(p2, { nodeIds: ["suits"], correct: true, prompted: true });
  check("prompted-correct does not count toward mastery", !isMastered(p2, "suits") && p2.skills.suits.demonstrations === 0);

  // coach analyzeMove on a real position produces an observation
  let s = newGame(8);
  s = advance(s).state;
  while (s.phase === "bidding") { s = applyAction(s, { type: "BID", seat: s.turn, bid: aiBid(s.hands[s.turn]) }); s = advance(s).state; }
  const seat: Seat = s.turn === "S" ? "S" : s.turn;
  const legal = legalMoves(s, seat);
  const a = analyzeMove(s, seat, legal[0], false);
  check("analyzeMove yields a message and observation", a.message.length > 0 && a.observation.nodeIds.length >= 0);
}

console.log("Move quiz");
{
  const { buildMoveQuiz } = await import("../src/lib/teaching/quiz.js");
  let s = newGame(42);
  s = advance(s).state;
  while (s.phase === "bidding") {
    s = applyAction(s, { type: "BID", seat: s.turn, bid: aiBid(s.hands[s.turn]) });
    s = advance(s).state;
  }
  while (s.turn !== "S" && s.phase === "playing") {
    const card = aiPlay(s, s.turn);
    s = applyAction(s, { type: "PLAY", seat: s.turn, card });
    s = advance(s).state;
  }
  const solo = buildMoveQuiz(s, "S", "Solo");
  const guided = buildMoveQuiz(s, "S", "Guided");
  const hard = buildMoveQuiz(s, "S", "Hard");
  check("solo mode skips quiz", solo === null);
  if (legalMoves(s, "S").length > 1) {
  check("guided quiz has one step", guided?.steps.length === 1);
  check("guided uses card mcq", guided?.steps[0]?.id === "pick-card");
  check("hard uses card mcq", hard?.steps[0]?.id === "pick-card");
  check("guided mcq has card options", (guided?.steps[0]?.options.length ?? 0) >= 2);
  check("hard mcq has more or equal options", (hard?.steps[0]?.options.length ?? 0) >= (guided?.steps[0]?.options.length ?? 0));
  check("hard options use card labels", hard?.steps[0]?.options.every((o) => o.label.includes("♠") || o.label.includes("♥") || o.label.includes("♦") || o.label.includes("♣")) ?? false);
  } else {
    check("forced move skips quiz", guided === null);
  }
}

console.log("Node content");
{
  const { scenariosForNode, allNodeIds } = await import("../src/lib/teaching/scenarioGen.js");
  const { LESSONS } = await import("../src/lib/store/content.js");
  for (const id of allNodeIds()) {
    check(`scenario exists for ${id}`, scenariosForNode(id).length > 0);
    check(`lesson exists for ${id}`, Boolean(LESSONS[id]));
  }
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
if (failures) process.exit(1);
