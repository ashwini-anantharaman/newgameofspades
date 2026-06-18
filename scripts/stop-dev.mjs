#!/usr/bin/env node
/** Kill coach + vite dev servers so a fresh `npm run start` works. */
import { execSync } from "node:child_process";

const PORTS = [8787, 5173, 5174, 5175, 5176, 5177];

function killPort(port) {
  try {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, { stdio: "ignore" });
    console.log(`  stopped port ${port}`);
  } catch {
    /* nothing listening */
  }
}

console.log("Stopping dev servers…");
for (const p of PORTS) killPort(p);
console.log("Done. Run: npm run start");
