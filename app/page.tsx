import { cookies } from "next/headers";
import { FilterControls } from "@/components/leaderboard/filter-controls";
import { GamesLogSection } from "@/components/leaderboard/games-log-table";
import { HighScores } from "@/components/leaderboard/high-scores";
import { LeaderboardHighlights } from "@/components/leaderboard/leaderboard-highlights";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { getSession } from "@/lib/auth/session";
import { getInitialGamesLog } from "@/lib/games-log";
import { getLogGameOptions } from "@/lib/log-game-options";
import { getLeaderboardPageData } from "@/lib/leaderboard-page-data";
import {
  DEFAULT_FILTERS,
  FILTERS_COOKIE_NAME,
  hasLeaderboardFilterParams,
  parseLeaderboardFilters,
  parseStoredFilters,
  resolveLeaderboardFilters,
} from "@/lib/leaderboard-filters";

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const hasUrlFilters = hasLeaderboardFilterParams(params);
  const stored = parseStoredFilters(
    (await cookies()).get(FILTERS_COOKIE_NAME)?.value,
  );
  const filters = hasUrlFilters
    ? parseLeaderboardFilters(params)
    : stored
      ? resolveLeaderboardFilters(stored)
      : DEFAULT_FILTERS;
  const [session, { rows, highScores }, gamesLog, logGameOptions] =
    await Promise.all([
      getSession(),
      getLeaderboardPageData(filters),
      getInitialGamesLog({ from: filters.from, to: filters.to }),
      getLogGameOptions(),
    ]);

  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl px-4 py-4">
      <div className="flex min-w-0 flex-col gap-2">
        <FilterControls
          filters={filters}
          hasUrlFilters={hasUrlFilters}
          isAuthenticated={Boolean(session)}
          players={logGameOptions.players}
          locations={logGameOptions.locations}
        />
        <LeaderboardHighlights rows={rows} />
        <LeaderboardTable rows={rows} />
        <HighScores groups={highScores} />
        <GamesLogSection
          key={`${filters.from ?? ""}-${filters.to ?? ""}-${gamesLog.games[0]?.id ?? 0}`}
          initialPage={gamesLog}
          filters={{ from: filters.from, to: filters.to }}
          isAuthenticated={Boolean(session)}
          players={logGameOptions.players}
          locations={logGameOptions.locations}
        />
      </div>
    </main>
  );
}
