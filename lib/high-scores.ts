import { sql } from "drizzle-orm";
import { db } from "@/db";
import { gameDateWhereClause } from "@/lib/game-date-filter";
import type { LeaderboardFilters } from "@/lib/leaderboard-filters";

export type HighScoreDetail = {
  player: string;
  date: string;
  location: string;
};

export type HighScoreEntry = {
  score: number;
  players: string;
  appearanceCount: number;
  details: HighScoreDetail[];
};

export type HighScoreGroup = {
  playerCount: number;
  entries: HighScoreEntry[];
};

type DatabaseRow = {
  player_count: number;
  score: number;
  appearance_count: number;
  players: string;
  details: HighScoreDetail[];
};

export async function getHighScores(
  filters: Pick<LeaderboardFilters, "from" | "to">,
): Promise<HighScoreGroup[]> {
  const whereClause = gameDateWhereClause(filters);

  const result = await db.execute<DatabaseRow>(sql`
    with game_sizes as (
      select
        g.id as game_id,
        g.date,
        coalesce(l.name, 'Unknown') as location_name,
        count(ps.id)::integer as player_count
      from game g
      inner join player_score ps on ps.game_id = g.id
      left join location l on l.id = g.location_id
      ${whereClause}
      group by g.id, g.date, l.name
    ),
    score_rows as (
      select
        gs.player_count,
        p.name as player_name,
        ps.score,
        gs.date,
        gs.location_name
      from player_score ps
      inner join game_sizes gs on gs.game_id = ps.game_id
      inner join player p on p.id = ps.player_id
    ),
    score_groups as (
      select
        player_count,
        score,
        count(*)::integer as appearance_count,
        string_agg(distinct player_name, ' / ' order by player_name) as players,
        json_agg(
          json_build_object(
            'player', player_name,
            'date', date,
            'location', location_name
          )
          order by date desc, player_name asc
        ) as details
      from score_rows
      group by player_count, score
    ),
    ranked as (
      select
        player_count,
        score,
        appearance_count,
        players,
        details,
        dense_rank() over (
          partition by player_count
          order by score desc
        ) as score_rank
      from score_groups
    )
    select
      player_count,
      score,
      appearance_count,
      players,
      details
    from ranked
    where score_rank <= 5
    order by player_count asc, score desc
  `);

  const groups = new Map<number, HighScoreEntry[]>();

  for (const row of result.rows) {
    const playerCount = Number(row.player_count);
    const entries = groups.get(playerCount) ?? [];
    entries.push({
      score: Number(row.score),
      players: row.players,
      appearanceCount: Number(row.appearance_count),
      details: row.details.map((detail) => ({
        player: detail.player,
        date: String(detail.date).slice(0, 10),
        location: detail.location,
      })),
    });
    groups.set(playerCount, entries);
  }

  return [...groups.entries()].map(([playerCount, entries]) => ({
    playerCount,
    entries,
  }));
}
