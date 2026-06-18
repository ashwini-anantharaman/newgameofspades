import type { Lesson } from "../../store/content";
import type { Scenario } from "../../store/content";

const PREFIX = "spades.content.";

interface Cached<T> {
  source: "ai";
  data: T;
}

export function getCachedLesson(nodeId: string): Lesson | null {
  const raw = read<Cached<Lesson>>(`${PREFIX}lesson.${nodeId}`);
  return raw?.source === "ai" ? raw.data : null;
}

export function setCachedLesson(nodeId: string, lesson: Lesson, source: "ai" | "static"): void {
  if (source !== "ai") return;
  write(`${PREFIX}lesson.${nodeId}`, { source: "ai", data: lesson });
}

export function getCachedScenario(nodeId: string, difficulty: number): Scenario | null {
  const raw = read<Cached<Scenario>>(`${PREFIX}scenario.${nodeId}.${difficulty}`);
  return raw?.source === "ai" ? raw.data : null;
}

export function setCachedScenario(nodeId: string, difficulty: number, scenario: Scenario, source: "ai" | "static"): void {
  if (source !== "ai") return;
  write(`${PREFIX}scenario.${nodeId}.${difficulty}`, { source: "ai", data: scenario });
}

export function clearCachedLesson(nodeId: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(`${PREFIX}lesson.${nodeId}`);
}

function read<T>(key: string): T | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, val: unknown): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch { /* quota */ }
}
