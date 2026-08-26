"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LeaderboardRow } from "@/lib/leaderboard";

type Props = {
  rows: LeaderboardRow[];
};

type SortKey = keyof LeaderboardRow;
type SortDirection = "asc" | "desc";

type SortState = {
  key: SortKey;
  direction: SortDirection;
};

const columns: Array<{ key: SortKey; label: string; align: "left" | "right" }> =
  [
    { key: "player", label: "Player", align: "left" },
    { key: "games", label: "Games", align: "right" },
    { key: "wins", label: "Wins", align: "right" },
    { key: "winPercentage", label: "Win %", align: "right" },
    { key: "competitivenessPercentage", label: "Comp. %", align: "right" },
  ];

function percentage(value: number) {
  return `${value.toFixed(1)}%`;
}

function rangePosition(value: number, min: number, max: number) {
  if (max === min) {
    return 50;
  }

  return ((value - min) / (max - min)) * 100;
}

function PercentageCell({
  value,
  min,
  max,
}: {
  value: number;
  min: number;
  max: number;
}) {
  const position = rangePosition(value, min, max);

  return (
    <div className="flex items-center justify-end gap-1 sm:gap-1.5">
      <div
        aria-hidden="true"
        className="relative h-1 w-5 shrink-0 rounded-full bg-neutral-100 sm:w-7"
      >
        <span
          className="absolute top-1/2 h-1.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
          style={{ left: `${position}%` }}
        />
      </div>
      <span className="min-w-[2.25rem] tabular-nums sm:min-w-[2.75rem]">
        {percentage(value)}
      </span>
    </div>
  );
}

function metricCell(
  value: number,
  range: { min: number; max: number } | null,
) {
  if (!range) {
    return percentage(value);
  }

  return <PercentageCell value={value} min={range.min} max={range.max} />;
}

function defaultDirection(key: SortKey): SortDirection {
  return key === "player" ? "asc" : "desc";
}

function compareRows(a: LeaderboardRow, b: LeaderboardRow, sort: SortState) {
  const left = a[sort.key];
  const right = b[sort.key];
  const cmp =
    typeof left === "string" && typeof right === "string"
      ? left.localeCompare(right)
      : (left as number) - (right as number);

  return sort.direction === "asc" ? cmp : -cmp;
}

function SortIndicator({
  direction,
  active,
}: {
  direction: SortDirection;
  active: boolean;
}) {
  const iconClass = "size-3 shrink-0 stroke-[1.5]";

  if (!active) {
    return (
      <ChevronsUpDown
        aria-hidden="true"
        className={cn(iconClass, "text-muted-foreground/35")}
      />
    );
  }

  if (direction === "asc") {
    return (
      <ChevronUp
        aria-hidden="true"
        className={cn(iconClass, "text-muted-foreground")}
      />
    );
  }

  return (
    <ChevronDown
      aria-hidden="true"
      className={cn(iconClass, "text-muted-foreground")}
    />
  );
}

export function LeaderboardTable({ rows }: Props) {
  const [sort, setSort] = useState<SortState | null>(null);

  const ranges = useMemo(() => {
    if (rows.length === 0) {
      return null;
    }

    const winValues = rows.map((row) => row.winPercentage);
    const compValues = rows.map((row) => row.competitivenessPercentage);

    return {
      winPercentage: {
        min: Math.min(...winValues),
        max: Math.max(...winValues),
      },
      competitivenessPercentage: {
        min: Math.min(...compValues),
        max: Math.max(...compValues),
      },
    };
  }, [rows]);

  const sortedRows = useMemo(() => {
    if (!sort) {
      return rows;
    }

    return [...rows].sort((a, b) => compareRows(a, b, sort));
  }, [rows, sort]);

  function toggleSort(key: SortKey) {
    setSort((current) => {
      if (current?.key === key) {
        return { key, direction: current.direction === "asc" ? "desc" : "asc" };
      }

      return { key, direction: defaultDirection(key) };
    });
  }

  return (
    <div className="mb-3 h-[16rem] w-full min-w-0 max-w-full overflow-hidden rounded-sm border border-border">
      <div className="h-full overflow-auto">
        <table className="w-full table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-[28%] sm:w-auto" />
            <col className="w-10 sm:w-16" />
            <col className="w-10 sm:w-16" />
            <col className="w-[4.75rem] sm:w-24" />
            <col className="w-[4.75rem] sm:w-28" />
          </colgroup>
          <thead>
            <tr className="text-[11px] font-medium text-muted-foreground">
              {columns.map((column) => {
                const isActive = sort?.key === column.key;

                return (
                  <th
                    key={column.key}
                    className={cn(
                      "sticky top-0 z-10 border-b border-border/40 bg-background px-1.5 py-1.5 sm:px-2.5",
                      column.key !== "player" && "whitespace-nowrap",
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center",
                        column.align === "right" && "justify-end",
                      )}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => toggleSort(column.key)}
                        className={cn(
                          "h-auto px-0 text-[11px] font-medium hover:bg-transparent",
                          isActive
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        <span>{column.label}</span>
                        <SortIndicator
                          direction={
                            sort?.direction ?? defaultDirection(column.key)
                          }
                          active={isActive}
                        />
                      </Button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr
                key={row.player}
                className="text-muted-foreground hover:bg-muted/25"
              >
                <td className="border-t border-border/30 px-1.5 py-1.5 font-medium text-foreground sm:px-2.5">
                  <span className="block truncate">{row.player}</span>
                </td>
                <td className="border-t border-border/30 px-1.5 py-1.5 text-right tabular-nums whitespace-nowrap sm:px-2.5">
                  {row.games}
                </td>
                <td className="border-t border-border/30 px-1.5 py-1.5 text-right tabular-nums whitespace-nowrap sm:px-2.5">
                  {row.wins}
                </td>
                <td className="border-t border-border/30 px-1.5 py-1.5 text-right font-medium whitespace-nowrap text-foreground sm:px-2.5">
                  {metricCell(row.winPercentage, ranges?.winPercentage ?? null)}
                </td>
                <td className="border-t border-border/30 px-1.5 py-1.5 text-right font-medium whitespace-nowrap text-foreground sm:px-2.5">
                  {metricCell(
                    row.competitivenessPercentage,
                    ranges?.competitivenessPercentage ?? null,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
