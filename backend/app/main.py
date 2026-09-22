import json
import random

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import config
from .bench.run import RESULTS_PATH, run
from .dataset import build_dataset, train_test_split
from .deciders import classifier, jev_decider, rule_based
from .providers import get_provider

app = FastAPI(title="JevBench", description="Jev vs. rules vs. a trained classifier, on the same task.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_state: dict = {"pipeline": None, "provider": None}


@app.on_event("startup")
def _startup() -> None:
    if not RESULTS_PATH.exists():
        run()
    dataset = build_dataset(per_bucket=35)
    train, _ = train_test_split(dataset, test_fraction=0.3)
    _state["pipeline"] = classifier.train(train)
    _state["provider"] = get_provider(config.JEV_PROVIDER)


class PredictRequest(BaseModel):
    text: str


@app.get("/results")
def results() -> dict:
    return json.loads(RESULTS_PATH.read_text())


@app.post("/rerun")
def rerun() -> dict:
    """Re-runs the full benchmark (dataset build, training, learning curve).
    Takes a couple seconds -- this is a real benchmark, not a cached fake."""
    return run()


@app.post("/predict")
def predict(req: PredictRequest) -> dict:
    rb_label = rule_based.predict(req.text)
    clf_label = classifier.predict(_state["pipeline"], req.text)
    jev_label, jev_latency_ms, input_tokens = jev_decider.predict(_state["provider"], req.text)
    jev_cost = _state["provider"].cost_estimate_usd(input_tokens)
    return {
        "text": req.text,
        "rule_based": {"label": rb_label},
        "classifier": {"label": clf_label},
        "jev": {"label": jev_label, "latency_ms": round(jev_latency_ms, 4), "cost_usd": round(jev_cost, 8), "provider": config.JEV_PROVIDER},
    }


@app.get("/examples")
def examples() -> list[dict]:
    dataset = build_dataset(per_bucket=35)
    rng = random.Random(3)
    by_bucket: dict[tuple, list[dict]] = {}
    for ex in dataset:
        by_bucket.setdefault((ex["label"], ex["difficulty"]), []).append(ex)
    sample = []
    for _key, group in by_bucket.items():
        sample.append(rng.choice(group))
    return sample


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "provider": config.JEV_PROVIDER}
