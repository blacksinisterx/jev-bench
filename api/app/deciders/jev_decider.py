import time

from ..providers.base import Provider
from ..questions import QUESTIONS
from ..schemas import ChoiceAnswer


def predict(provider: Provider, text: str) -> tuple[str, float, int]:
    """Returns (predicted_label, latency_ms, input_tokens_estimate)."""
    start = time.perf_counter()
    answers = provider.evaluate(text, QUESTIONS)
    latency_ms = (time.perf_counter() - start) * 1000
    verdict = answers.get("verdict")
    label = verdict.choice if isinstance(verdict, ChoiceAnswer) else "review"
    input_tokens = max(len(text) // 4, 1)
    return label, latency_ms, input_tokens
