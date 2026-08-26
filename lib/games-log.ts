import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import type { LeaderboardFilters } from "@/lib/leaderboard-filters";

export const GAMES_LOG_PAGE_SIZE = 20;

export type GameLogPlayerScore = {
  player: string;
  score: number;
};

export type GameLogRow = {
  id: number;
  date: string;
  location: string;
  message: string | null;
  playerCount: number;
  winner: string;
  winningScore: number | null;
  scores: GameLogPlayerScore[];
};

export type GamesLogPage = {
  games: GameLogRow[];
  hasOlder: boolean;
  hasNewer: boolean;
};

export type GamesLogCursor = {
  date: string;
  id: number;
};

export type GamesLogDirection = "initial" | "older" | "newer";

export type GamesLogFilters = Pick<LeaderboardFilters, "from" | "to">;

type DatabaseRow = {
  id: number;
  date: string;
  message: string | null;
  location: string;
  player_count: number;
  winner: string;
  winning_score: number | null;
  scores: GameLogPlayerScore[] | null;
};

function mapRow(row: DatabaseRow): GameLogRow {
  return {
    id: Number(row.id),
    date: String(row.date).slice(0, 10),
    location: row.location,
    message: row.message,
    playerCount: Number(row.player_count),
    winner: row.winner,
    winningScore:
      row.winning_score === null ? null : Number(row.winning_score),
    scores: (row.scores ?? []).map((entry) => ({
      player: entry.player,
      score: Number(entry.score),
    })),
  };
}

function whereClause(
  filters: GamesLogFilters,
  direction: GamesLogDirection,
  cursor: GamesLogCursor | undefined,
): SQL {
  const conditions: SQL[] = [];

  if (filters.from) {
    conditions.push(sql`g.date >= ${filters.from}::date`);
  }

  if (filters.to) {
    conditions.push(sql`g.date <= ${filters.to}::date`);
  }

  if (cursor && direction === "older") {
    conditions.push(
      sql`(g.date, g.id) < (${cursor.date}::date, ${cursor.id})`,
    );
  }

  if (cursor && direction === "newer") {
    conditions.push(
      sql`(g.date, g.id) > (${cursor.date}::date, ${cursor.id})`,
    );
  }

  return conditions.length > 0
    ? sql`where ${sql.join(conditions, sql` and `)}`
    : sql.empty();
}

function orderClause(direction: GamesLogDirection): SQL {
  if (direction === "newer") {
    return sql`order by g.date asc, g.id asc`;
  }

  return sql`order by g.date desc, g.id desc`;
}

export async function getGamesLogPage(options: {
  filters: GamesLogFilters;
  limit?: number;
  direction?: GamesLogDirection;
  cursor?: GamesLogCursor;
}): Promise<GamesLogPage> {
  const limit = options.limit ?? GAMES_LOG_PAGE_SIZE;
  const direction = options.direction ?? "initial";
  const fetchLimit = limit + 1;

  const result = await db.execute<DatabaseRow>(sql`
    with paginated_games as (
      select
        g.id,
        g.date,
        g.message,
        coalesce(l.name, 'Unknown') as location
      from game g
      left join location l on l.id = g.location_id
      ${whereClause(options.filters, direction, options.cursor)}
      ${orderClause(direction)}
      limit ${fetchLimit}
    )
    select
      pg.id,
      pg.date,
      pg.message,
      pg.location,
      count(ps.id)::integer as player_count,
      max(ps.score)::integer as winning_score,
      coalesce(
        string_agg(distinct p.name, ' / ' order by p.name)
          filter (
            where ps.score = (
              select max(ps2.score)
              from player_score ps2
              where ps2.game_id = pg.id
            )
          ),
        '—'
      ) as winner,
      coalesce(
        json_agg(
          json_build_object('player', p.name, 'score', ps.score)
          order by ps.score desc, p.name asc
        ) filter (where p.id is not null),
        '[]'::json
      ) as scores
    from paginated_games pg
    left join player_score ps on ps.game_id = pg.id
    left join player p on p.id = ps.player_id
    group by pg.id, pg.date, pg.message, pg.location
    order by pg.date desc, pg.id desc
  `);

  let rows = result.rows.map(mapRow);
  let hasOlder = false;
  let hasNewer = false;

  if (direction === "newer") {
    if (rows.length > limit) {
      hasNewer = true;
      rows = rows.slice(1, limit + 1);
    }
  } else if (rows.length > limit) {
    hasOlder = true;
    rows = rows.slice(0, limit);
  }

  return { games: rows, hasOlder, hasNewer };
}

export async function getInitialGamesLog(
  filters: GamesLogFilters,
): Promise<GamesLogPage> {
  return getGamesLogPage({ filters, direction: "initial" });
}
