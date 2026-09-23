"""The benchmark harness. Runs offline (`python -m app.bench.run`), writes
results.json; the API serves that cached file rather than re-running
training on every request (that's how real benchmarks work -- run once,
publish results)."""

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

from ..dataset import build_dataset, train_test_split
from ..deciders import classifier, jev_decider, rule_based
from ..providers import get_provider
from .. import config

_COMMITTED_RESULTS_PATH = Path(__file__).parent.parent.parent / "results" / "benchmark_results.json"
# Vercel's filesystem is read-only outside /tmp. The committed results file
# still ships in the deployment for reference, but /rerun and cold-start
# regeneration write to /tmp there instead -- ephemeral per instance, which
# is fine for a demo "rerun and see it update" button.
RESULTS_PATH = Path("/tmp/benchmark_results.json") if os.environ.get("VERCEL") else _COMMITTED_RESULTS_PATH
LEARNING_CURVE_SIZES = [10, 20, 40, 80, 160]
CONSISTENCY_RUNS = 3


def _accuracy(preds: list[str], truth: list[dict]) -> dict:
    correct = sum(1 for p, t in zip(preds, truth) if p == t["label"])
    total = len(truth)
    by_difficulty: dict[str, list[int]] = {"direct": [0, 0], "paraphrased": [0, 0]}
    for p, t in zip(preds, truth):
        bucket = by_difficulty[t["difficulty"]]
        bucket[1] += 1
        if p == t["label"]:
            bucket[0] += 1
    return {
        "overall": round(correct / total, 4) if total else 0.0,
        "direct": round(by_difficulty["direct"][0] / by_difficulty["direct"][1], 4) if by_difficulty["direct"][1] else None,
        "paraphrased": round(by_difficulty["paraphrased"][0] / by_difficulty["paraphrased"][1], 4) if by_difficulty["paraphrased"][1] else None,
    }


def _consistency(predict_fn, texts: list[str], runs: int = CONSISTENCY_RUNS) -> float:
    """Fraction of examples whose prediction is identical across `runs` repeats.
    Deterministic deciders (rules, trained classifier, this mock) trivially
    score 1.0 -- that's expected and stated plainly in the report, not hidden."""
    all_runs = [[predict_fn(t) for t in texts] for _ in range(runs)]
    agree = sum(1 for i in range(len(texts)) if len(set(r[i] for r in all_runs)) == 1)
    return round(agree / len(texts), 4) if texts else 1.0


def run() -> dict:
    dataset = build_dataset(per_bucket=35)
    train, test = train_test_split(dataset, test_fraction=0.3)
    test_texts = [e["text"] for e in test]

    results: dict = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "provider": config.JEV_PROVIDER,
        "dataset": {
            "total": len(dataset), "train": len(train), "test": len(test),
        },
    }

    # ---- rule-based ----
    start = time.perf_counter()
    rb_preds = [rule_based.predict(t) for t in test_texts]
    rb_latency = (time.perf_counter() - start) / len(test_texts) * 1000
    results_rb = _accuracy(rb_preds, test)
    results_rb.update({
        "avg_latency_ms": round(rb_latency, 4),
        "total_cost_usd": 0.0,
        "consistency": _consistency(rule_based.predict, test_texts),
        "setup": {"labeled_examples_required": 0, "training_time_s": 0.0},
    })

    # ---- Jev ----
    provider = get_provider(config.JEV_PROVIDER)
    jev_preds, jev_latencies, jev_cost = [], [], 0.0
    for t in test_texts:
        label, latency_ms, input_tokens = jev_decider.predict(provider, t)
        jev_preds.append(label)
        jev_latencies.append(latency_ms)
        jev_cost += provider.cost_estimate_usd(input_tokens)
    results_jev = _accuracy(jev_preds, test)
    results_jev.update({
        "avg_latency_ms": round(sum(jev_latencies) / len(jev_latencies), 4),
        "total_cost_usd": round(jev_cost, 8),
        "consistency": _consistency(lambda t: jev_decider.predict(provider, t)[0], test_texts),
        "setup": {"labeled_examples_required": 0, "training_time_s": 0.0},
    })

    # ---- trained classifier (full train set) ----
    train_start = time.perf_counter()
    pipeline = classifier.train(train)
    training_time_s = time.perf_counter() - train_start
    start = time.perf_counter()
    clf_preds = [classifier.predict(pipeline, t) for t in test_texts]
    clf_latency = (time.perf_counter() - start) / len(test_texts) * 1000
    results_clf = _accuracy(clf_preds, test)
    results_clf.update({
        "avg_latency_ms": round(clf_latency, 4),
        "total_cost_usd": 0.0,
        "consistency": _consistency(lambda t: classifier.predict(pipeline, t), test_texts),
        "setup": {"labeled_examples_required": len(train), "training_time_s": round(training_time_s, 4)},
    })

    results["deciders"] = {"rule_based": results_rb, "jev": results_jev, "classifier": results_clf}

    # ---- learning curve: classifier accuracy vs. training set size ----
    import random
    rng = random.Random(7)
    curve = []
    for size in LEARNING_CURVE_SIZES:
        if size > len(train):
            continue
        subset = rng.sample(train, size)
        # guard against a degenerate subset missing a class -- resample until covered
        attempts = 0
        while len({e["label"] for e in subset}) < 3 and attempts < 20:
            subset = rng.sample(train, size)
            attempts += 1
        pipe = classifier.train(subset)
        preds = [classifier.predict(pipe, t) for t in test_texts]
        curve.append({"train_size": size, "accuracy": _accuracy(preds, test)["overall"]})
    curve.append({"train_size": len(train), "accuracy": results_clf["overall"]})
    results["learning_curve"] = curve
    results["reference_lines"] = {
        "rule_based_accuracy": results_rb["overall"],
        "jev_accuracy": results_jev["overall"],
    }

    RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    RESULTS_PATH.write_text(json.dumps(results, indent=2))
    return results


if __name__ == "__main__":
    r = run()
    print(json.dumps(r, indent=2))
