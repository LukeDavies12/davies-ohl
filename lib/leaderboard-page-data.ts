import { unstable_cache } from "next/cache";
import { getHighScores, type HighScoreGroup } from "@/lib/high-scores";
import { getLeaderboard, type LeaderboardRow } from "@/lib/leaderboard";
import type { LeaderboardFilters } from "@/lib/leaderboard-filters";

export const LEADERBOARD_DATA_TAG = "leaderboard-data";

export type LeaderboardPageData = {
  rows: LeaderboardRow[];
  highScores: HighScoreGroup[];
};

async function fetchLeaderboardPageData(
  filters: LeaderboardFilters,
): Promise<LeaderboardPageData> {
  const [rows, highScores] = await Promise.all([
    getLeaderboard(filters),
    getHighScores(filters),
  ]);

  return { rows, highScores };
}

export function getLeaderboardPageData(filters: LeaderboardFilters) {
  const cacheKey = JSON.stringify(filters);

  return unstable_cache(
    () => fetchLeaderboardPageData(filters),
    ["leaderboard-page-data", cacheKey],
    {
      tags: [LEADERBOARD_DATA_TAG],
    },
  )();
}
