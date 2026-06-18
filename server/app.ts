import express from "express";
import { coachStream } from "./lib/coachHandler";
import { generateLesson, generateScenario } from "./lib/contentHandler";
import type { CoachRequest } from "../src/lib/teaching/llm/protocol";
import type { LessonRequest, ScenarioRequest } from "../src/lib/teaching/content/protocol";

const app = express();
app.use(express.json({ limit: "256kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, coach: Boolean(process.env.ANTHROPIC_API_KEY) });
});

app.post("/api/coach", async (req, res) => {
  const body = req.body as CoachRequest;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

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
});

app.post("/api/content/lesson", async (req, res) => {
  try {
    const body = req.body as LessonRequest;
    const result = await generateLesson(body);
    res.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "lesson failed";
    res.status(500).json({ error: message });
  }
});

app.post("/api/content/scenario", async (req, res) => {
  try {
    const body = req.body as ScenarioRequest;
    const result = await generateScenario(body);
    res.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "scenario failed";
    res.status(500).json({ error: message });
  }
});

export default app;
