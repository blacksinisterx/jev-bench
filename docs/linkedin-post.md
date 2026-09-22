# LinkedIn post draft — JevBench

**Attach:** `try-it-yourself.png` as the primary image (it's the single frame that tells the whole story) or `dashboard.png` for the full picture.

---

Building JevGuard and JevRouter (parts 1 and 2 of this series), a question kept nagging: Jev is structurally a classifier — typed input, calibrated probability out. Classifiers need labeled training data. Jev doesn't. So when does a simple, actually-trained classifier just... beat it?

Third project answers that directly. Same task (allow/review/block safety gating), three deciders, one held-out test set:

→ **Rule-based** (regex): 60.3% accuracy. 100% on obvious keyword matches, 28.6% on paraphrases with zero shared keywords.
→ **Jev** (mock provider, so this runs at $0): 71.4%. Same structural blind spot as the rules — it's a keyword heuristic too, built specifically to not be smarter than the rule-based decider, since faking a "smart" mock to make Jev look good would defeat the entire point of an honest benchmark.
→ **A trained classifier** (TF-IDF + logistic regression, scikit-learn): 74.6% — but only after 147 labeled examples. With 10-40 examples it's worse than both zero-shot approaches. It only crosses Jev's accuracy around 80 labeled examples.

That crossover point is the actual answer: Jev works from the first call, no data pipeline, no labeling. A classifier needs an upfront investment before it's competitive — but scales toward near-zero marginal cost once trained. Neither is universally "better"; it's a data-volume-dependent tradeoff, and now there's a chart that shows exactly where it flips.

The image attached isn't cherry-picked — it's an actual run from the "try it yourself" panel: a paraphrased dangerous command ("clear out the entire production backup bucket") that the regex rules miss completely, Jev's mock partially catches (flags it for review instead of allowing it outright), and the trained classifier gets exactly right.

Caught a real bug building this, too: my first version of the dataset let near-duplicate phrasings of the same example leak across the train/test split, and the classifier scored a suspicious 100%. Fixed it by grouping the split by base phrase instead of by individual example — the numbers above are post-fix.

Repo + full write-up (including the exact honesty caveats around the mock-vs-real-Jev comparison): [link]

#AI #MachineLearning #Benchmarking #BuildInPublic

---

**Notes for posting:**
- Swap `[link]` once the repo is pushed.
- The "caught a bug" paragraph is optional if the post is running long — cut it first if trimming.
