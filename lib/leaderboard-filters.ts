export type LeaderboardFilters = {
  from: string | null;
  to: string | null;
  minGames: number;
};

export type FilterPresetId =
  | "all-time-10"
  | "this-year-5"
  | "past-12-months-10"
  | "all-time-25";

export type FilterPreset = {
  id: FilterPresetId;
  label: string;
  filters: LeaderboardFilters;
};

export type StoredLeaderboardFilters = LeaderboardFilters & {
  preset?: FilterPresetId;
};

export const DEFAULT_FILTERS: LeaderboardFilters = {
  from: null,
  to: null,
  minGames: 10,
};

export const FILTERS_COOKIE_NAME = "davies-ohl-filters";
export const FILTERS_STORAGE_KEY = "davies-ohl:leaderboard-filters:v1";

const PRESET_IDS: FilterPresetId[] = [
  "all-time-10",
  "this-year-5",
  "past-12-months-10",
  "all-time-25",
];

function validDate(value: string | string[] | undefined) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
    ? null
    : value;
}

function isFilterPresetId(value: unknown): value is FilterPresetId {
  return (
    typeof value === "string" &&
    (PRESET_IDS as string[]).includes(value)
  );
}

function utcDateString(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  return Math.abs(
    Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`),
  ) / 86_400_000;
}

export function sameFilters(a: LeaderboardFilters, b: LeaderboardFilters) {
  return a.from === b.from && a.to === b.to && a.minGames === b.minGames;
}

export function getFilterPresets(): FilterPreset[] {
  const now = new Date();
  const startOfYear = utcDateString(now.getUTCFullYear(), 0, 1);
  const fromPastYear = utcDateString(
    now.getUTCFullYear() - 1,
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  return [
    { id: "all-time-10", label: "All time, 10+", filters: DEFAULT_FILTERS },
    {
      id: "this-year-5",
      label: "This year, 5+",
      filters: { from: startOfYear, to: null, minGames: 5 },
    },
    {
      id: "past-12-months-10",
      label: "Past 12 months, 10+",
      filters: { from: fromPastYear, to: null, minGames: 10 },
    },
    {
      id: "all-time-25",
      label: "All time, 25+",
      filters: { from: null, to: null, minGames: 25 },
    },
  ];
}

export function matchingPresetId(filters: LeaderboardFilters): FilterPresetId | undefined {
  return getFilterPresets().find((preset) => sameFilters(filters, preset.filters))
    ?.id;
}

export function getActivePresetId(filters: LeaderboardFilters): FilterPresetId | undefined {
  const exact = matchingPresetId(filters);
  if (exact) {
    return exact;
  }

  if (filters.to !== null || filters.minGames !== 10 || !filters.from) {
    return undefined;
  }

  const pastYear = getFilterPresets().find(
    (preset) => preset.id === "past-12-months-10",
  );
  if (
    pastYear?.filters.from &&
    daysBetween(filters.from, pastYear.filters.from) <= 62
  ) {
    return "past-12-months-10";
  }

  return undefined;
}

export function toStoredFilters(
  filters: LeaderboardFilters,
  preset?: FilterPresetId,
): StoredLeaderboardFilters {
  const resolvedPreset = preset ?? getActivePresetId(filters);
  return resolvedPreset ? { ...filters, preset: resolvedPreset } : { ...filters };
}

export function resolveLeaderboardFilters(
  stored: StoredLeaderboardFilters,
): LeaderboardFilters {
  if (stored.preset) {
    const preset = getFilterPresets().find((item) => item.id === stored.preset);
    if (preset) {
      return preset.filters;
    }
  }

  return {
    from: stored.from,
    to: stored.to,
    minGames: stored.minGames,
  };
}

function isStoredFilters(value: unknown): value is StoredLeaderboardFilters {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<StoredLeaderboardFilters>;
  const validOptionalDate = (date: unknown) =>
    date === null ||
    (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date));

  if (
    !validOptionalDate(candidate.from) ||
    !validOptionalDate(candidate.to) ||
    !Number.isInteger(candidate.minGames) ||
    Number(candidate.minGames) < 1 ||
    Number(candidate.minGames) > 500
  ) {
    return false;
  }

  return candidate.preset === undefined || isFilterPresetId(candidate.preset);
}

export function parseStoredFilters(
  raw: string | undefined | null,
): StoredLeaderboardFilters | null {
  if (!raw) {
    return null;
  }

  try {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = JSON.parse(decodeURIComponent(raw));
    }

    return isStoredFilters(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function parseLeaderboardFilters(
  params: Record<string, string | string[] | undefined>,
): LeaderboardFilters {
  const parsedMinGames =
    typeof params.minGames === "string"
      ? Number.parseInt(params.minGames, 10)
      : DEFAULT_FILTERS.minGames;

  let from = validDate(params.from);
  let to = validDate(params.to);

  if (from && to && from > to) {
    [from, to] = [to, from];
  }

  return {
    from,
    to,
    minGames: Number.isFinite(parsedMinGames)
      ? Math.min(500, Math.max(1, parsedMinGames))
      : DEFAULT_FILTERS.minGames,
  };
}

export function hasLeaderboardFilterParams(
  params: Record<string, string | string[] | undefined>,
) {
  return ["from", "to", "minGames"].some((key) => params[key] !== undefined);
}
