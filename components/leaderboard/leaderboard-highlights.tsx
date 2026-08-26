import type { LeaderboardRow } from "@/lib/leaderboard";
import { cn } from "@/lib/utils";

type Props = {
  rows: LeaderboardRow[];
};

type MetricKey = "winPercentage" | "competitivenessPercentage";

type TopEntry = {
  player: string;
  value: number;
};

function percentage(value: number) {
  return `${value.toFixed(1)}%`;
}

function getTopFive(rows: LeaderboardRow[], metric: MetricKey): TopEntry[] {
  const sorted = [...rows].sort((a, b) => {
    const diff = b[metric] - a[metric];
    if (diff !== 0) {
      return diff;
    }

    return a.player.localeCompare(b.player);
  });

  return sorted.slice(0, 5).map((row) => ({
    player: row.player,
    value: row[metric],
  }));
}

function metricMax(rows: LeaderboardRow[], metric: MetricKey) {
  if (rows.length === 0) {
    return 1;
  }

  return Math.max(...rows.map((row) => row[metric]), 1);
}

function TopChart({
  title,
  entries,
  max,
  barClassName,
}: {
  title: string;
  entries: TopEntry[];
  max: number;
  barClassName: string;
}) {
  return (
    <section className="mb-4">
      <h2 className="mb-1 text-[11px] font-medium text-muted-foreground">
        {title}
      </h2>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data</p>
      ) : (
        <ol className="space-y-1">
          {entries.map((entry) => (
            <li key={`${title}-${entry.player}`}>
              <div className="mb-0.5 flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate text-foreground">{entry.player}</span>
                <span className="shrink-0 tabular-nums text-foreground">
                  {percentage(entry.value)}
                </span>
              </div>
              <div
                aria-hidden="true"
                className="relative h-1.5 rounded-xs bg-neutral-100"
              >
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-xs",
                    barClassName,
                  )}
                  style={{ width: `${(entry.value / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function LeaderboardHighlights({ rows }: Props) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
      <TopChart
        title="Top 5 Win %"
        entries={getTopFive(rows, "winPercentage")}
        max={metricMax(rows, "winPercentage")}
        barClassName="bg-primary"
      />
      <TopChart
        title="Top 5 Comp. %"
        entries={getTopFive(rows, "competitivenessPercentage")}
        max={metricMax(rows, "competitivenessPercentage")}
        barClassName="bg-neutral-600"
      />
    </div>
  );
}
