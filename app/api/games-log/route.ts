import { NextResponse } from "next/server";
import {
  GAMES_LOG_PAGE_SIZE,
  getGamesLogPage,
  type GamesLogDirection,
  type GamesLogFilters,
} from "@/lib/games-log";

function parseDirection(value: string | null): GamesLogDirection | null {
  if (value === "older" || value === "newer") {
    return value;
  }

  return null;
}

function parseDateFilter(value: string | null) {
  if (!value) {
    return null;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const direction = parseDirection(searchParams.get("direction"));
  const date = searchParams.get("date");
  const id = searchParams.get("id");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : GAMES_LOG_PAGE_SIZE;

  const filters: GamesLogFilters = {
    from: parseDateFilter(searchParams.get("from")),
    to: parseDateFilter(searchParams.get("to")),
  };

  if (!Number.isFinite(limit) || limit < 1 || limit > 50) {
    return NextResponse.json({ error: "Invalid limit" }, { status: 400 });
  }

  if (!direction) {
    return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
  }

  if (!date || !id) {
    return NextResponse.json({ error: "Missing cursor" }, { status: 400 });
  }

  const cursorId = Number(id);
  if (!Number.isFinite(cursorId)) {
    return NextResponse.json({ error: "Invalid cursor id" }, { status: 400 });
  }

  const page = await getGamesLogPage({
    filters,
    limit,
    direction,
    cursor: { date, id: cursorId },
  });

  return NextResponse.json(page);
}
