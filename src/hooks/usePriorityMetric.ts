import { useCallback, useEffect, useState } from "react";

export type PriorityMetric = "ice" | "rice" | "both";

const STORAGE_KEY = "pm_priority_metric";
const EVENT = "pm-priority-metric-change";

const isMetric = (v: unknown): v is PriorityMetric =>
  v === "ice" || v === "rice" || v === "both";

const read = (): PriorityMetric => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isMetric(v) ? v : "ice";
  } catch {
    return "ice";
  }
};

/** Métrica de priorização ativa (ICE / RICE / Ambas), compartilhada entre a aba de priorização e o board. */
export const usePriorityMetric = () => {
  const [metric, setMetricState] = useState<PriorityMetric>(read);

  useEffect(() => {
    const sync = () => setMetricState(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setMetric = useCallback((next: PriorityMetric) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    setMetricState(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return {
    metric,
    setMetric,
    showIce: metric === "ice" || metric === "both",
    showRice: metric === "rice" || metric === "both",
  };
};
