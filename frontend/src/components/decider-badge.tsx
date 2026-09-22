import { cn } from "@/lib/utils";

export type DeciderId = "rule_based" | "jev" | "classifier";

// Same colors as learning-curve-chart.tsx, deliberately -- color follows the
// entity consistently across every chart/table in this dashboard.
const CONFIG: Record<DeciderId, { label: string; classes: string; dot: string }> = {
  rule_based: { label: "Rule-based", classes: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/30", dot: "#8a8a86" },
  jev: { label: "Jev", classes: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30", dot: "#eb6834" },
  classifier: { label: "Trained classifier", classes: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30", dot: "#3987e5" },
};

export function DeciderBadge({ id, className }: { id: DeciderId; className?: string }) {
  const { label, classes, dot } = CONFIG[id];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", classes, className)}>
      <span className="size-2 rounded-full" style={{ backgroundColor: dot }} />
      {label}
    </span>
  );
}
