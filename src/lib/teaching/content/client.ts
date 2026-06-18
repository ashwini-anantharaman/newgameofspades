import type { Lesson } from "../../store/content";
import type { Scenario } from "../../store/content";
import type { LessonResponse, ScenarioResponse } from "./protocol";

export async function fetchLesson(nodeId: string, title: string, blurb: string): Promise<LessonResponse> {
  const res = await fetch("/api/content/lesson", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ nodeId, title, blurb }),
  });
  if (!res.ok) throw new Error(`lesson ${res.status}`);
  return (await res.json()) as LessonResponse;
}

export async function fetchScenario(
  nodeId: string,
  title: string,
  blurb: string,
  difficulty: 1 | 2 | 3,
): Promise<ScenarioResponse> {
  const res = await fetch("/api/content/scenario", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ nodeId, title, blurb, difficulty }),
  });
  if (!res.ok) throw new Error(`scenario ${res.status}`);
  return (await res.json()) as ScenarioResponse;
}

export type { Lesson, Scenario };
