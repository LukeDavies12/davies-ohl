"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { NumberStepper } from "@/components/ui/number-stepper";
import { LogGameFlow } from "@/components/leaderboard/log-game-flow";
import {
  FILTERS_COOKIE_NAME,
  FILTERS_STORAGE_KEY,
  getActivePresetId,
  getFilterPresets,
  parseStoredFilters,
  resolveLeaderboardFilters,
  sameFilters,
  toStoredFilters,
  type LeaderboardFilters,
} from "@/lib/leaderboard-filters";
import type {
  LogGameLocation,
  LogGamePlayer,
} from "@/lib/log-game-options";

type Props = {
  filters: LeaderboardFilters;
  hasUrlFilters: boolean;
  isAuthenticated: boolean;
  players: LogGamePlayer[];
  locations: LogGameLocation[];
};

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function persistFilters(filters: LeaderboardFilters) {
  const stored = toStoredFilters(filters);
  const serialized = JSON.stringify(stored);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";

  window.localStorage.setItem(FILTERS_STORAGE_KEY, serialized);
  document.cookie = `${FILTERS_COOKIE_NAME}=${encodeURIComponent(serialized)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

function readStoredFilters() {
  const cookie = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${FILTERS_COOKIE_NAME}=`))
    ?.slice(FILTERS_COOKIE_NAME.length + 1);

  const fromCookie = parseStoredFilters(
    cookie ? decodeURIComponent(cookie) : null,
  );
  if (fromCookie) {
    return fromCookie;
  }

  try {
    return parseStoredFilters(window.localStorage.getItem(FILTERS_STORAGE_KEY));
  } catch {
    window.localStorage.removeItem(FILTERS_STORAGE_KEY);
    return null;
  }
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
  const presets = getFilterPresets();
  const activePresetId = getActivePresetId(filters);

  useEffect(() => {
    if (hasUrlFilters) {
      persistFilters(filters);
      return;
    }

    const stored = readStoredFilters();
    if (!stored) {
      persistFilters(filters);
      return;
    }

    const resolved = resolveLeaderboardFilters(stored);
    if (!sameFilters(resolved, filters)) {
      persistFilters(resolved);
      router.replace(filterUrl(resolved), { scroll: false });
      return;
    }

    persistFilters(filters);
  }, [filters, hasUrlFilters, router]);

  function apply(filtersToApply: LeaderboardFilters) {
    if (sameFilters(filtersToApply, filters)) {
      return;
    }

    persistFilters(filtersToApply);
    startTransition(() => {
      router.push(filterUrl(filtersToApply), { scroll: false });
    });
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-2 py-2 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 overflow-visible">
        {presets.map((preset) => {
          const active = activePresetId === preset.id;

          return (
            <Button
              key={preset.id}
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
