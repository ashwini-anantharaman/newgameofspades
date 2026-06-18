import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateLesson } from "../../server/contentHandler";
import type { LessonRequest } from "../../src/lib/teaching/content/protocol";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const result = await generateLesson(req.body as LessonRequest);
    res.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "lesson failed";
    res.status(500).json({ error: message });
  }
}
