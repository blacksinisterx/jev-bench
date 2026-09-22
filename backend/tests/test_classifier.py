from app.dataset import build_dataset, train_test_split
from app.deciders import classifier


def test_trained_classifier_beats_chance_on_held_out_set():
    dataset = build_dataset(per_bucket=25)
    train, test = train_test_split(dataset)
    pipeline = classifier.train(train)
    preds = [classifier.predict(pipeline, e["text"]) for e in test]
    accuracy = sum(1 for p, e in zip(preds, test) if p == e["label"]) / len(test)
    assert accuracy > 0.4  # chance for 3 balanced classes is ~0.33


def test_predict_returns_a_known_label():
    dataset = build_dataset(per_bucket=15)
    train, _ = train_test_split(dataset)
    pipeline = classifier.train(train)
    assert classifier.predict(pipeline, "ls -la") in {"allow", "review", "block"}
