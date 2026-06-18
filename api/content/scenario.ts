import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateScenario } from "../lib/contentHandler";
import type { ScenarioRequest } from "../../src/lib/teaching/content/protocol";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const result = await generateScenario(req.body as ScenarioRequest);
    res.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "scenario failed";
    res.status(500).json({ error: message });
  }
}
