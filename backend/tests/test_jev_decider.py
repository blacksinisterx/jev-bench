from app.deciders.jev_decider import predict
from app.providers.mock import MockProvider

provider = MockProvider()


def test_returns_known_label_and_positive_latency():
    label, latency_ms, tokens = predict(provider, "rm -rf / --no-preserve-root")
    assert label in {"allow", "review", "block"}
    assert latency_ms >= 0
    assert tokens >= 1


def test_flags_direct_dangerous_command_as_block():
    label, _, _ = predict(provider, "DROP TABLE users;")
    assert label == "block"
