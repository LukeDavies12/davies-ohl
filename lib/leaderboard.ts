import { sql } from "drizzle-orm";
import { db } from "@/db";
import { gameDateWhereClause } from "@/lib/game-date-filter";
import type { LeaderboardFilters } from "@/lib/leaderboard-filters";

export type LeaderboardRow = {
  player: string;
  games: number;
  wins: number;
  winPercentage: number;
  competitivenessPercentage: number;
};

type DatabaseRow = {
  player: string;
  games: number;
  wins: number;
  win_percentage: string | number;
  competitiveness_percentage: string | number;
};

export async function getLeaderboard(
  filters: LeaderboardFilters,
): Promise<LeaderboardRow[]> {
  const whereClause = gameDateWhereClause(filters);

  const result = await db.execute<DatabaseRow>(sql`
    with game_results as (
      select
        ps.player_id,
        ps.game_id,
        ps.score,
        count(*) over (partition by ps.game_id)::integer as player_count,
        (rank() over (
          partition by ps.game_id
          order by ps.score asc
        ) - 1)::integer as players_behind,
        max(ps.score) over (partition by ps.game_id) as winning_score
      from player_score ps
      inner join game g on g.id = ps.game_id
      ${whereClause}
    ),
    player_totals as (
      select
        player_id,
        count(*)::integer as games,
        count(*) filter (where score = winning_score)::integer as wins,
        avg(
          case
            when player_count > 1
            then players_behind::numeric / (player_count - 1)
            else 0
          end
        ) * 100 as competitiveness_percentage
      from game_results
      group by player_id
    )
    select
      p.name as player,
      pt.games,
      pt.wins,
      round((pt.wins::numeric / pt.games) * 100, 1) as win_percentage,
      round(pt.competitiveness_percentage, 1) as competitiveness_percentage
    from player_totals pt
    inner join player p on p.id = pt.player_id
    where pt.games >= ${filters.minGames}
    order by
      win_percentage desc,
      pt.wins desc,
      competitiveness_percentage desc,
      p.name asc
  `);

  return result.rows.map((row) => ({
    player: row.player,
    games: Number(row.games),
    wins: Number(row.wins),
    winPercentage: Number(row.win_percentage),
    competitivenessPercentage: Number(row.competitiveness_percentage),
  }));
}
