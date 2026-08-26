import { sql, type SQL } from "drizzle-orm";
import type { LeaderboardFilters } from "@/lib/leaderboard-filters";

export function gameDateWhereClause(
  filters: Pick<LeaderboardFilters, "from" | "to">,
  gameAlias = "g",
): SQL {
  const conditions: SQL[] = [];

  if (filters.from) {
    conditions.push(
      sql`${sql.raw(`${gameAlias}.date`)} >= ${filters.from}::date`,
    );
  }

  if (filters.to) {
    conditions.push(
      sql`${sql.raw(`${gameAlias}.date`)} <= ${filters.to}::date`,
    );
  }

  return conditions.length > 0
    ? sql`where ${sql.join(conditions, sql` and `)}`
    : sql.empty();
}
