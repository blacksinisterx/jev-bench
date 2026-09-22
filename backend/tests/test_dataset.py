from app.dataset import build_dataset, train_test_split


def test_dataset_has_all_three_labels_and_both_difficulties():
    dataset = build_dataset(per_bucket=10)
    labels = {e["label"] for e in dataset}
    difficulties = {e["difficulty"] for e in dataset}
    assert labels == {"allow", "review", "block"}
    assert difficulties == {"direct", "paraphrased"}


def test_train_test_split_has_no_group_leakage():
    """The regression test for the exact bug this harness hit: near-duplicate
    wrapper-variants of the same base phrase must never appear on both sides
    of the split, or the classifier's accuracy is measuring memorization."""
    dataset = build_dataset(per_bucket=20)
    train, test = train_test_split(dataset, test_fraction=0.3)
    train_groups = {e["group"] for e in train}
    test_groups = {e["group"] for e in test}
    assert train_groups.isdisjoint(test_groups)


def test_train_test_split_covers_all_labels_in_both_splits():
    dataset = build_dataset(per_bucket=20)
    train, test = train_test_split(dataset, test_fraction=0.3)
    assert {e["label"] for e in train} == {"allow", "review", "block"}
    assert {e["label"] for e in test} == {"allow", "review", "block"}


def test_split_is_deterministic():
    dataset = build_dataset(per_bucket=15)
    train1, test1 = train_test_split(dataset)
    train2, test2 = train_test_split(dataset)
    assert [e["text"] for e in train1] == [e["text"] for e in train2]
    assert [e["text"] for e in test1] == [e["text"] for e in test2]
