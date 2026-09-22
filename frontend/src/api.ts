import type { BenchmarkResults, DemoExample, PredictResult } from "./types";

const BASE = "/api";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const getResults = () => fetch(`${BASE}/results`).then((r) => json<BenchmarkResults>(r));

export const rerun = () => fetch(`${BASE}/rerun`, { method: "POST" }).then((r) => json<BenchmarkResults>(r));

export const getExamples = () => fetch(`${BASE}/examples`).then((r) => json<DemoExample[]>(r));

export const predict = (text: string) =>
  fetch(`${BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  }).then((r) => json<PredictResult>(r));
