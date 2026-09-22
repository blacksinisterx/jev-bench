import { useEffect, useMemo, useState } from "react";
import { Loader2, Moon, RefreshCw, Sun, TestTube2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatTile } from "@/components/stat-tile";
import { LearningCurveChart } from "@/components/learning-curve-chart";
import { DeciderBadge, type DeciderId } from "@/components/decider-badge";
import { useTheme } from "@/lib/use-theme";
import { getExamples, getResults, predict, rerun } from "./api";
import type { BenchmarkResults, DemoExample, PredictResult } from "./types";

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="outline" size="icon" onClick={toggle} aria-label="Toggle theme">
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

const ROW_ORDER: DeciderId[] = ["rule_based", "jev", "classifier"];
const ROW_LABEL: Record<DeciderId, string> = { rule_based: "Rule-based", jev: "Jev", classifier: "Trained classifier" };

function pct(v: number | null): string {
  return v == null ? "—" : `${(v * 100).toFixed(1)}%`;
}

export default function App() {
  const { theme } = useTheme();
  const [results, setResults] = useState<BenchmarkResults | null>(null);
  const [examples, setExamples] = useState<DemoExample[]>([]);
  const [rerunning, setRerunning] = useState(false);
  const [text, setText] = useState("");
  const [prediction, setPrediction] = useState<PredictResult | null>(null);
  const [groundTruth, setGroundTruth] = useState<DemoExample | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getResults().then(setResults).catch(() => {});
    getExamples().then(setExamples).catch(() => {});
  }, []);

  async function runPredict(t: string, truth: DemoExample | null = null) {
    setPredicting(true);
    setError(null);
    try {
      const res = await predict(t);
      setPrediction(res);
      setGroundTruth(truth);
    } catch (e) {
      setError(e instanceof Error ? e.message : "prediction failed");
    } finally {
      setPredicting(false);
    }
  }

  async function handleRerun() {
    setRerunning(true);
    try {
      setResults(await rerun());
    } catch (e) {
      setError(e instanceof Error ? e.message : "re-run failed");
    } finally {
      setRerunning(false);
    }
  }

  const bestAccuracy = useMemo(() => {
    if (!results) return null;
    const entries = ROW_ORDER.map((id) => [id, results.deciders[id].overall] as const);
    return entries.sort((a, b) => b[1] - a[1])[0];
  }, [results]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <TestTube2 className="size-6 text-primary" />
            <div>
              <h1 className="text-lg font-semibold leading-tight">JevBench</h1>
              <p className="text-xs text-muted-foreground">Jev vs. rules vs. a trained classifier, on the same task</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {results && (
              <span className="rounded-full border px-2.5 py-1 font-mono text-xs text-muted-foreground">
                provider: {results.provider}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleRerun} disabled={rerunning}>
              {rerunning ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Re-run benchmark
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        {results && (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatTile label="Test set size" value={String(results.dataset.test)} sub={`${results.dataset.train} training examples available`} />
              <StatTile label="Rule-based accuracy" value={pct(results.deciders.rule_based.overall)} sub="0 labeled examples needed" />
              <StatTile label="Jev accuracy" value={pct(results.deciders.jev.overall)} sub={`${results.provider} provider, 0 examples needed`} />
              <StatTile label="Classifier accuracy" value={pct(results.deciders.classifier.overall)} sub={`after ${results.deciders.classifier.setup.labeled_examples_required} labeled examples`} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Accuracy vs. training data</CardTitle>
                <CardDescription>
                  The classifier needs labeled examples before it works at all; Jev and the rule-based decider need zero. Where does the line cross?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LearningCurveChart
                  curve={results.learning_curve}
                  ruleBasedAccuracy={results.reference_lines.rule_based_accuracy}
                  jevAccuracy={results.reference_lines.jev_accuracy}
                  key={theme}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Decider comparison</CardTitle>
                <CardDescription>Same held-out test set, split by phrasing difficulty. {bestAccuracy && <>Best overall: <strong>{ROW_LABEL[bestAccuracy[0]]}</strong>.</>}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Decider</TableHead>
                      <TableHead>Accuracy (direct / paraphrased)</TableHead>
                      <TableHead>Latency</TableHead>
                      <TableHead>Cost / call</TableHead>
                      <TableHead>Consistency</TableHead>
                      <TableHead>Setup cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ROW_ORDER.map((id) => {
                      const d = results.deciders[id];
                      return (
                        <TableRow key={id}>
                          <TableCell><DeciderBadge id={id} /></TableCell>
                          <TableCell className="font-mono text-xs">
                            {pct(d.overall)} <span className="text-muted-foreground">({pct(d.direct)} / {pct(d.paraphrased)})</span>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{d.avg_latency_ms.toFixed(3)}ms</TableCell>
                          <TableCell className="font-mono text-xs">${d.total_cost_usd.toFixed(6)}</TableCell>
                          <TableCell className="font-mono text-xs">{pct(d.consistency)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {d.setup.labeled_examples_required > 0
                              ? `${d.setup.labeled_examples_required} labeled examples, ${d.setup.training_time_s.toFixed(2)}s to train`
                              : "none"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What this means</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  The rule-based decider gets every <em>direct</em> (keyword-matchable) case right and fails hard on <em>paraphrased</em> ones it has no
                  keyword overlap with. Jev's mock provider &mdash; a stand-in used so this demo runs for $0 &mdash; has the same structural blind spot,
                  since it's also a keyword heuristic; it is <strong>not</strong> a measurement of real Jev's actual language understanding.
                </p>
                <p>
                  The trained classifier starts <em>worse</em> than both zero-shot approaches with only a handful of labeled examples, and only
                  overtakes the mock-Jev baseline once it has enough labeled data. That crossover point is the real tradeoff: Jev works from
                  the first call with no data pipeline; a classifier needs an investment before it's competitive, but scales toward $0 marginal cost per call once trained.
                </p>
                <p>
                  To see how a <em>real</em> Jev call compares (rather than this benchmark's keyword-heuristic stand-in), set <code>JEV_PROVIDER=jev_agent</code> or{" "}
                  <code>typesafe</code> with a key and re-run &mdash; see the README.
                </p>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Try it yourself</CardTitle>
            <CardDescription>Run a phrase through all three deciders and see where they agree or disagree.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {examples.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => runPredict(ex.text, ex)}
                  disabled={predicting}
                  className="rounded-md border bg-card px-2.5 py-1 text-xs transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                  title={`ground truth: ${ex.label} (${ex.difficulty})`}
                >
                  {ex.text.length > 50 ? ex.text.slice(0, 50) + "…" : ex.text}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom-text">Or write your own</Label>
              <Textarea id="custom-text" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. wipe the whole backups bucket, don't ask" />
            </div>
            <Button onClick={() => runPredict(text)} disabled={predicting || !text.trim()}>
              {predicting && <Loader2 className="size-4 animate-spin" />}
              Predict
            </Button>
            {error && <p className="text-sm text-critical">{error}</p>}

            {prediction && (
              <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-3">
                {ROW_ORDER.map((id) => {
                  const label = id === "jev" ? prediction.jev.label : id === "classifier" ? prediction.classifier.label : prediction.rule_based.label;
                  const isCorrect = groundTruth ? label === groundTruth.label : null;
                  return (
                    <div key={id} className="space-y-1">
                      <DeciderBadge id={id} />
                      <p className="font-mono text-sm">
                        {label}
                        {isCorrect !== null && <span className={isCorrect ? "text-good" : "text-critical"}> {isCorrect ? "✓ correct" : "✗ wrong"}</span>}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
