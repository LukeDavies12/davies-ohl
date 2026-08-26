"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { game, location, player, playerScore } from "@/drizzle/schema";
import { getSession } from "@/lib/auth/session";
import { revalidateLeaderboardData } from "@/lib/revalidate-leaderboard";

export type LogGameScoreInput = {
  playerId?: number;
  playerName: string;
  score: number;
};

export type LogGameInput = {
  date: string;
  locationName: string;
  message: string | null;
  scores: LogGameScoreInput[];
};

export type LogGameActionResult =
  | { ok: true; gameId: number }
  | { ok: false; error: string };

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime());
}

async function resolveLocationId(name: string) {
  const trimmed = name.trim();
  const [existing] = await db
    .select({ id: location.id })
    .from(location)
    .where(eq(location.name, trimmed))
    .limit(1);

  if (existing) {
    return existing.id;
  }

  const [created] = await db
    .insert(location)
    .values({ name: trimmed })
    .returning({ id: location.id });

  return created.id;
}

async function resolvePlayerId(name: string) {
  const trimmed = name.trim();
  const [existing] = await db
    .select({ id: player.id })
    .from(player)
    .where(sql`lower(${player.name}) = lower(${trimmed})`)
    .limit(1);

  if (existing) {
    return existing.id;
  }

  const [created] = await db
    .insert(player)
    .values({ name: trimmed })
    .returning({ id: player.id });

  return created.id;
}

function validateGameInput(input: LogGameInput): LogGameActionResult | null {
  if (!isValidIsoDate(input.date)) {
    return { ok: false, error: "Enter a valid game date" };
  }

  if (!input.locationName.trim()) {
    return { ok: false, error: "Location is required" };
  }

  if (input.scores.length === 0) {
    return { ok: false, error: "Add at least one player score" };
  }

  const playerKeys = new Set<string>();
  for (const entry of input.scores) {
    const playerName = entry.playerName.trim();
    if (!playerName) {
      return { ok: false, error: "Player name is required" };
    }

    if (playerName.length > 255) {
      return { ok: false, error: "Player name is too long" };
    }

    if (!Number.isInteger(entry.score)) {
      return { ok: false, error: "Scores must be whole numbers" };
    }

    const playerKey = playerName.toLowerCase();
    if (playerKeys.has(playerKey)) {
      return { ok: false, error: "Each player can only appear once" };
    }

    playerKeys.add(playerKey);
  }

  return null;
}

async function requireSession(error = "Sign in to continue") {
  const session = await getSession();
  if (!session) {
    return { ok: false, error } as const;
  }

  return { ok: true, session } as const;
}

async function resolveScores(gameId: number, scores: LogGameScoreInput[]) {
  return Promise.all(
    scores.map(async (entry) => ({
      playerId:
        entry.playerId && entry.playerId > 0
          ? entry.playerId
          : await resolvePlayerId(entry.playerName),
      gameId,
      score: entry.score,
    })),
  );
}

export async function logGameAction(
  input: LogGameInput,
): Promise<LogGameActionResult> {
  const auth = await requireSession("Sign in to log a game");
  if (!auth.ok) {
    return auth;
  }

  const invalid = validateGameInput(input);
  if (invalid) {
    return invalid;
  }

  const message = input.message?.trim() ? input.message.trim() : null;

  try {
    const locationId = await resolveLocationId(input.locationName);

    const [createdGame] = await db
      .insert(game)
      .values({
        date: input.date,
        message,
        locationId,
      })
      .returning({ id: game.id });

    await db
      .insert(playerScore)
      .values(await resolveScores(createdGame.id, input.scores));
    await revalidateLeaderboardData();

    return { ok: true, gameId: createdGame.id };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Could not save the game. Try again." };
  }
}

export async function updateGameAction(
  input: LogGameInput & { gameId: number },
): Promise<LogGameActionResult> {
  const auth = await requireSession("Sign in to update a game");
  if (!auth.ok) {
    return auth;
  }

  if (!Number.isInteger(input.gameId) || input.gameId <= 0) {
    return { ok: false, error: "Game not found" };
  }

  const invalid = validateGameInput(input);
  if (invalid) {
    return invalid;
  }

  const message = input.message?.trim() ? input.message.trim() : null;

  try {
    const [existing] = await db
      .select({ id: game.id })
      .from(game)
      .where(eq(game.id, input.gameId))
      .limit(1);

    if (!existing) {
      return { ok: false, error: "Game not found" };
    }

    const locationId = await resolveLocationId(input.locationName);

    await db
      .update(game)
      .set({
        date: input.date,
        message,
        locationId,
      })
      .where(eq(game.id, input.gameId));

    await db.delete(playerScore).where(eq(playerScore.gameId, input.gameId));
    await db
      .insert(playerScore)
      .values(await resolveScores(input.gameId, input.scores));
    await revalidateLeaderboardData();

    return { ok: true, gameId: input.gameId };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Could not update the game. Try again." };
  }
}

export async function deleteGameAction(input: {
  gameId: number;
}): Promise<LogGameActionResult> {
  const auth = await requireSession("Sign in to delete a game");
  if (!auth.ok) {
    return auth;
  }

  if (!Number.isInteger(input.gameId) || input.gameId <= 0) {
    return { ok: false, error: "Game not found" };
  }

  try {
    const [existing] = await db
      .select({ id: game.id })
      .from(game)
      .where(eq(game.id, input.gameId))
      .limit(1);

    if (!existing) {
      return { ok: false, error: "Game not found" };
    }

    await db.delete(playerScore).where(eq(playerScore.gameId, input.gameId));
    await db.delete(game).where(eq(game.id, input.gameId));
    await revalidateLeaderboardData();

    return { ok: true, gameId: input.gameId };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Could not delete the game. Try again." };
  }
}
