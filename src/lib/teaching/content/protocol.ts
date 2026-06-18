import type { Lesson } from "../../store/content";
import type { Scenario } from "../../store/content";

export interface LessonRequest {
  nodeId: string;
  title: string;
  blurb: string;
}

export interface ScenarioRequest {
  nodeId: string;
  title: string;
  blurb: string;
  difficulty: 1 | 2 | 3;
}

export interface LessonResponse {
  lesson: Lesson;
  source: "ai" | "static";
}

export interface ScenarioResponse {
  scenario: Scenario;
  source: "ai" | "static";
}

export const DEMO_KEYS = [
  "rankRow", "normalTrick", "followDemo", "trumpTrick", "breakingDemo",
  "bidDemo", "countDemo", "cheapWin", "duckDemo", "bagDemo", "nilDemo", "setDemo",
] as const;

export type DemoKey = (typeof DEMO_KEYS)[number];
