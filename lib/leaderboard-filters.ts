export type LeaderboardFilters = {
  from: string | null;
  to: string | null;
  minGames: number;
};

export const DEFAULT_FILTERS: LeaderboardFilters = {
  from: null,
  to: null,
  minGames: 10,
};

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

