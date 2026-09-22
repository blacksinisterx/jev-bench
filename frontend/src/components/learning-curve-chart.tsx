import type { LearningCurvePoint } from "@/types";

// Fixed, mode-invariant data colors (not theme tokens) -- this is a data
// visualization, and the blue/orange pair here is the validated first-two
// categorical slots (clears CVD + normal-vision separation in both modes).
const CLASSIFIER_COLOR = "#3987e5";
const RULE_COLOR = "#8a8a86";
const JEV_COLOR = "#eb6834";

const W = 640;
const H = 280;
const PAD = { top: 16, right: 16, bottom: 32, left: 40 };

export function LearningCurveChart({
  curve,
  ruleBasedAccuracy,
  jevAccuracy,
}: {
  curve: LearningCurvePoint[];
  ruleBasedAccuracy: number;
  jevAccuracy: number;
}) {
  const maxX = Math.max(...curve.map((p) => p.train_size)) * 1.08;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const x = (v: number) => PAD.left + (v / maxX) * innerW;
  const y = (v: number) => PAD.top + innerH - v * innerH;

  const linePoints = curve.map((p) => `${x(p.train_size)},${y(p.accuracy)}`).join(" ");
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Classifier accuracy vs. training set size, with Jev and rule-based accuracy as flat reference lines">
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity={0.1} strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.6}>
              {Math.round(t * 100)}%
            </text>
          </g>
        ))}

        {curve.map((p) => (
          <text key={p.train_size} x={x(p.train_size)} y={H - 8} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>
            {p.train_size}
          </text>
        ))}

        <line x1={PAD.left} x2={W - PAD.right} y1={y(ruleBasedAccuracy)} y2={y(ruleBasedAccuracy)} stroke={RULE_COLOR} strokeWidth={2} strokeDasharray="5 4">
          <title>Rule-based accuracy: {(ruleBasedAccuracy * 100).toFixed(1)}% (needs no training data)</title>
        </line>
        <line x1={PAD.left} x2={W - PAD.right} y1={y(jevAccuracy)} y2={y(jevAccuracy)} stroke={JEV_COLOR} strokeWidth={2} strokeDasharray="5 4">
          <title>Jev accuracy: {(jevAccuracy * 100).toFixed(1)}% (needs no training data)</title>
        </line>

        <polyline points={linePoints} fill="none" stroke={CLASSIFIER_COLOR} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {curve.map((p) => (
          <circle key={p.train_size} cx={x(p.train_size)} cy={y(p.accuracy)} r={4.5} fill={CLASSIFIER_COLOR}>
            <title>{p.train_size} labeled examples → {(p.accuracy * 100).toFixed(1)}% accuracy</title>
          </circle>
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: CLASSIFIER_COLOR }} />
          Trained classifier (grows with labeled data)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4" style={{ backgroundColor: RULE_COLOR, borderTop: `2px dashed ${RULE_COLOR}` }} />
          Rule-based (flat — needs 0 examples)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4" style={{ backgroundColor: JEV_COLOR, borderTop: `2px dashed ${JEV_COLOR}` }} />
          Jev, mock (flat — needs 0 examples)
        </span>
      </div>
    </div>
  );
}
