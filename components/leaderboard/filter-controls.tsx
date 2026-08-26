"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { NumberStepper } from "@/components/ui/number-stepper";
import { LogGameFlow } from "@/components/leaderboard/log-game-flow";
import {
  DEFAULT_FILTERS,
  type LeaderboardFilters,
} from "@/lib/leaderboard-filters";
import type {
  LogGameLocation,
  LogGamePlayer,
} from "@/lib/log-game-options";

const STORAGE_KEY = "davies-ohl:leaderboard-filters:v1";

type Props = {
  filters: LeaderboardFilters;
  hasUrlFilters: boolean;
  isAuthenticated: boolean;
  players: LogGamePlayer[];
  locations: LogGameLocation[];
};

type Preset = {
  label: string;
  filters: LeaderboardFilters;
};

function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getPresets(): Preset[] {
  const today = new Date();
  const startOfYear = `${today.getUTCFullYear()}-01-01`;
  const lastYear = new Date(today);
  lastYear.setUTCFullYear(lastYear.getUTCFullYear() - 1);

  return [
    { label: "All time, 10+", filters: DEFAULT_FILTERS },
    {
      label: "This year, 5+",
      filters: { from: startOfYear, to: null, minGames: 5 },
    },
    {
      label: "Past 12 months, 10+",
      filters: { from: dateString(lastYear), to: null, minGames: 10 },
    },
    {
      label: "All time, 25+",
      filters: { from: null, to: null, minGames: 25 },
    },
  ];
}

function sameFilters(a: LeaderboardFilters, b: LeaderboardFilters) {
  return a.from === b.from && a.to === b.to && a.minGames === b.minGames;
}

function isStoredFilters(value: unknown): value is LeaderboardFilters {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<LeaderboardFilters>;
  const validOptionalDate = (date: unknown) =>
    date === null ||
    (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date));

  return (
    validOptionalDate(candidate.from) &&
    validOptionalDate(candidate.to) &&
    Number.isInteger(candidate.minGames) &&
    Number(candidate.minGames) >= 1 &&
    Number(candidate.minGames) <= 500
  );
}

function filterUrl(filters: LeaderboardFilters) {
  const params = new URLSearchParams();
  params.set("minGames", String(filters.minGames));

  if (filters.from) {
    params.set("from", filters.from);
  }

  if (filters.to) {
    params.set("to", filters.to);
  }

  return `/?${params.toString()}`;
}

export function FilterControls({
  filters,
  hasUrlFilters,
  isAuthenticated,
  players,
  locations,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const presets = getPresets();

  useEffect(() => {
    if (hasUrlFilters) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
      return;
    }

    try {
      const stored: unknown = JSON.parse(
        window.localStorage.getItem(STORAGE_KEY) ?? "null",
      );

      if (isStoredFilters(stored) && !sameFilters(stored, DEFAULT_FILTERS)) {
        router.replace(filterUrl(stored), { scroll: false });
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [filters, hasUrlFilters, router]);

  function apply(filtersToApply: LeaderboardFilters) {
    if (sameFilters(filtersToApply, filters)) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filtersToApply));
    startTransition(() => {
      router.push(filterUrl(filtersToApply), { scroll: false });
    });
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-2 py-2 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 overflow-visible">
        {presets.map((preset) => {
          const active = sameFilters(filters, preset.filters);

          return (
            <Button
              key={preset.label}
              type="button"
              variant={active ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => apply(preset.filters)}
              disabled={isPending}
            >
              {preset.label}
            </Button>
          );
        })}

        <DateRangePicker
          from={filters.from}
          to={filters.to}
          onChange={(range) => apply({ ...filters, ...range })}
        />

        <NumberStepper
          value={filters.minGames}
          min={1}
          max={500}
          suffix="games min"
          onChange={(minGames) => apply({ ...filters, minGames })}
        />
      </div>

      <LogGameFlow
        isAuthenticated={isAuthenticated}
        players={players}
        locations={locations}
      />
    </div>
  );
}
