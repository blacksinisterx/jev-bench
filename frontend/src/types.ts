export interface DeciderResult {
  overall: number;
  direct: number | null;
  paraphrased: number | null;
  avg_latency_ms: number;
  total_cost_usd: number;
  consistency: number;
  setup: {
    labeled_examples_required: number;
    training_time_s: number;
  };
}

export interface LearningCurvePoint {
  train_size: number;
  accuracy: number;
}

export interface BenchmarkResults {
  generated_at: string;
  provider: string;
  dataset: { total: number; train: number; test: number };
  deciders: {
    rule_based: DeciderResult;
    jev: DeciderResult;
    classifier: DeciderResult;
  };
  learning_curve: LearningCurvePoint[];
  reference_lines: { rule_based_accuracy: number; jev_accuracy: number };
}

export interface DemoExample {
  text: string;
  label: "allow" | "review" | "block";
  difficulty: "direct" | "paraphrased";
}

export interface PredictResult {
  text: string;
  rule_based: { label: string };
  classifier: { label: string };
  jev: { label: string; latency_ms: number; cost_usd: number; provider: string };
}
