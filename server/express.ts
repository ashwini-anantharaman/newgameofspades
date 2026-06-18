// Minimal Express server for the coach endpoint. Run alongside Vite in dev
// and proxy /api to it (see vite.config.ts).
//
//   cp .env.example .env   # add ANTHROPIC_API_KEY
//   npm run coach          # loads .env via --env-file
//
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import express from "express";

// Load .env when started without npm run coach (e.g. npx tsx server/express.ts).
const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = val;
  }
}
import { coachStream } from "../api/lib/coachHandler";
import { generateLesson, generateScenario } from "../api/lib/contentHandler";
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
  } catch (e: any) {
    res.write(`data: ${JSON.stringify({ type: "error", message: e?.message ?? "stream failed" })}\n\n`);
  } finally {
    res.end();
  }
});

app.post("/api/content/lesson", async (req, res) => {
  try {
    const body = req.body as LessonRequest;
    const result = await generateLesson(body);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "lesson failed" });
  }
});

app.post("/api/content/scenario", async (req, res) => {
  try {
    const body = req.body as ScenarioRequest;
    const result = await generateScenario(body);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "scenario failed" });
  }
});

const port = Number(process.env.PORT ?? 8787);
const server = app.listen(port, () => {
  console.log(`coach server on http://localhost:${port}`);
  console.log(`  routes: /api/health /api/coach /api/content/lesson /api/content/scenario`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\nPort ${port} is already in use. Run: npm run stop\n`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
