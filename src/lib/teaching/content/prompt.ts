import { DEMO_KEYS, LessonRequest, ScenarioRequest } from "./protocol";

export function buildLessonPrompt(req: LessonRequest): string {
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
    `- nodeId in output concept is "${req.nodeId}".`,
  ].join("\n");
}

export function buildScenarioPrompt(req: ScenarioRequest): string {
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
    "- 3-5 cards in hand, 0-3 cards in trick.",
  ].join("\n");
}
