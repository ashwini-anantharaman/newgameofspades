import { useCallback, useEffect, useState } from "react";
import { LESSONS } from "../../store/content";
import { nodeById } from "../skillTree";
import { scenariosForNode } from "../scenarioGen";
import type { Lesson, Scenario } from "../../store/content";
import { fetchLesson, fetchScenario } from "./client";
import { getCachedLesson, setCachedLesson, getCachedScenario, setCachedScenario, clearCachedLesson } from "./cache";

export type ContentSource = "ai" | "static" | "cache";

export function useNodeLesson(nodeId: string) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<ContentSource>("static");
  const [apiError, setApiError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async (skipCache = false) => {
    const node = nodeById(nodeId);
    const fallback: Lesson = LESSONS[nodeId] ?? {
      nodeId,
      title: node?.title ?? nodeId,
      steps: [{
        heading: node?.title ?? "Concept",
        body: node?.blurb ?? "",
        takeaway: node?.blurb ?? "",
        demo: "normalTrick",
      }],
    };

    if (!skipCache) {
      const cached = getCachedLesson(nodeId);
      if (cached) {
        setLesson(cached);
        setSource("cache");
        setApiError(null);
        setLoading(false);
        return;
      }
    }

    // Show built-in text immediately so the lesson screen doesn't block on the API.
    setLesson(fallback);
    setSource("static");
    setLoading(false);
    setApiError(null);
    setGenerating(true);
    try {
      const res = await fetchLesson(nodeId, node?.title ?? nodeId, node?.blurb ?? "");
      setLesson(res.lesson);
      setSource(res.source);
      if (res.source === "ai") {
        setCachedLesson(nodeId, res.lesson, "ai");
      }
      setApiError(null);
    } catch {
      // Built-in lesson is already on screen — no need to alarm the user.
      setApiError(null);
    } finally {
      setGenerating(false);
    }
  }, [nodeId]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    clearCachedLesson(nodeId);
    await load(true);
  }, [load, nodeId]);

  return { lesson, loading, source, apiError, refresh, generating };
}

export function useNodeScenario(nodeId: string, difficulty: 1 | 2 | 3) {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<ContentSource>("static");
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setScenario(null);
    setApiError(null);

    const node = nodeById(nodeId);
    const pool = scenariosForNode(nodeId);
    const fallback =
      pool.find((s) => s.difficulty === difficulty) ??
      pool[0] ??
      null;

    const cached = getCachedScenario(nodeId, difficulty);
    if (cached) {
      setScenario(cached);
      setSource("cache");
      setLoading(false);
      return;
    }

    if (fallback) {
      setScenario(fallback);
      setSource("static");
      setLoading(false);
    } else {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetchScenario(nodeId, node?.title ?? nodeId, node?.blurb ?? "", difficulty);
        if (cancelled) return;
        setScenario(res.scenario);
        setSource(res.source);
        if (res.source === "ai") setCachedScenario(nodeId, difficulty, res.scenario, "ai");
      } catch {
        if (cancelled) return;
        setSource("static");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [nodeId, difficulty]);

  return { scenario, loading, source, apiError };
}
