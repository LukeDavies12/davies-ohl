import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { location, player } from "@/drizzle/schema";

export type LogGamePlayer = {
  id: number;
  name: string;
};

export type LogGameLocation = {
  id: number;
  name: string;
};

export async function getLogGameOptions() {
  const [players, locations] = await Promise.all([
    db
      .select({ id: player.id, name: player.name })
      .from(player)
      .where(eq(player.isActive, true))
      .orderBy(asc(player.name)),
    db
      .select({ id: location.id, name: location.name })
      .from(location)
      .orderBy(asc(location.name)),
  ]);

  return { players, locations };
}
