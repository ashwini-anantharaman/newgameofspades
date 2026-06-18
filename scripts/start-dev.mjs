#!/usr/bin/env node
/** Kill stale servers, start coach API, wait for health, then start Vite. */
import { spawn, execSync } from "node:child_process";

const COACH_PORT = 8787;
const VITE_PORT = 5173;

function killPort(port) {
  try {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, { stdio: "ignore" });
  } catch { /* empty */ }
}

function run(cmd, args) {
  return spawn(cmd, args, { stdio: "inherit", shell: true, env: process.env });
}

async function waitForCoach(ms = 15_000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${COACH_PORT}/api/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const body = await res.json();
        console.log(`\n✓ Coach API ready (AI key: ${body.coach ? "yes" : "missing in .env"})\n`);
        return true;
      }
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  console.error("\n✗ Coach API did not start. Check .env has ANTHROPIC_API_KEY.\n");
  return false;
}

console.log("Cleaning up old servers…");
killPort(COACH_PORT);
killPort(VITE_PORT);
for (const p of [5174, 5175, 5176, 5177]) killPort(p);

console.log("Starting coach API…");
const coach = run("npm", ["run", "coach"]);

const ready = await waitForCoach();
if (!ready) {
  coach.kill("SIGTERM");
  process.exit(1);
}

console.log(`Starting app at http://localhost:${VITE_PORT}`);
console.log("  Play tab = opponent animations  |  Learn tab = lessons\n");
const web = run("npm", ["run", "dev"]);

function shutdown() {
  coach.kill("SIGTERM");
  web.kill("SIGTERM");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

coach.on("exit", (code) => {
  if (code) console.error(`Coach exited (${code})`);
  web.kill("SIGTERM");
  process.exit(code ?? 1);
});

web.on("exit", (code) => {
  coach.kill("SIGTERM");
  process.exit(code ?? 0);
});
