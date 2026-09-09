"use client";

import { Fragment, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LogGameForm } from "@/components/leaderboard/log-game-form";
import { deleteGameAction } from "@/lib/actions/log-game";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import type {
  GameLogRow,
  GamesLogFilters,
  GamesLogPage,
} from "@/lib/games-log";
import type {
  LogGameLocation,
  LogGamePlayer,
} from "@/lib/log-game-options";

type Props = {
  initialPage: GamesLogPage;
  filters: GamesLogFilters;
  isAuthenticated?: boolean;
  onEditGame?: (game: GameLogRow) => void;
  onDeleteGame?: (game: GameLogRow) => void;
};

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${month}/${day}/${year}`;
}

function GameScoresList({ game }: { game: GameLogRow }) {
  return (
    <ol className="space-y-1">
      {game.scores.map((entry, index) => (
        <li
          key={`${entry.player}-${entry.score}-${index}`}
          className="flex items-center justify-between gap-2 text-xs"
        >
          <span
            className={cn(
              "min-w-0 truncate",
              entry.score === game.winningScore && game.winningScore !== null
                ? "font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            {entry.player}
          </span>
          <span className="shrink-0 tabular-nums text-foreground">
            {entry.score}
          </span>
        </li>
      ))}
    </ol>
  );
}

function GameRowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <span className="inline-flex items-center">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Edit game"
        className="text-muted-foreground"
        onClick={onEdit}
      >
        <Pencil />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Delete game"
        className="text-muted-foreground hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 />
      </Button>
    </span>
  );
}

function EaScoreButton({
  open,
  disabled,
  onClick,
}: {
  open: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  if (disabled) {
    return (
      <span className="text-[11px] leading-4 text-muted-foreground/50">
        Ea Score
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onClick}
      className="rounded-sm border border-border bg-background px-1 text-[11px] font-normal leading-4 text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      Ea Score
    </button>
  );
}

function GameLogMobileRow({
  game,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  game: GameLogRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const hasScores = game.scores.length > 0;
  const showActions = Boolean(onEdit && onDelete);

  return (
    <li className="border-t border-border/30 px-2.5 py-1.5 first:border-t-0">
      <div className="flex items-center justify-between gap-2 text-xs leading-4">
        <span className="shrink-0 text-muted-foreground">
          {game.playerCount} {game.playerCount === 1 ? "player" : "players"}
        </span>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate font-medium text-foreground">
            {game.winner}
          </span>
          <span className="shrink-0 tabular-nums text-foreground">
            {game.winningScore ?? "—"}
          </span>
          <EaScoreButton
            open={open}
            disabled={!hasScores}
            onClick={() => onOpenChange(!open)}
          />
        </div>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <div className="min-w-0 truncate text-[11px] leading-4 text-muted-foreground">
          {formatDate(game.date)}{" "}
          <span className="text-muted-foreground/50">{game.location}</span>
        </div>
        {showActions ? (
          <GameRowActions onEdit={onEdit!} onDelete={onDelete!} />
        ) : null}
      </div>
      {open && hasScores ? (
        <div className="mt-1.5">
          <GameScoresList game={game} />
        </div>
      ) : null}
    </li>
  );
}

function LoadingLabel({ children }: { children: string }) {
  return (
    <p className="px-2.5 py-1.5 text-center text-[11px] text-muted-foreground md:hidden">
      {children}
    </p>
  );
}

function mergeGames(existing: GameLogRow[], incoming: GameLogRow[]) {
  if (incoming.length === 0) {
    return existing;
  }

  const seen = new Set(existing.map((game) => game.id));
  const uniqueIncoming = incoming.filter((game) => !seen.has(game.id));

  if (uniqueIncoming.length === 0) {
    return existing;
  }

  return [...existing, ...uniqueIncoming];
}

function prependGames(existing: GameLogRow[], incoming: GameLogRow[]) {
  if (incoming.length === 0) {
    return existing;
  }

  const seen = new Set(existing.map((game) => game.id));
  const uniqueIncoming = incoming.filter((game) => !seen.has(game.id));

  if (uniqueIncoming.length === 0) {
    return existing;
  }

  return [...uniqueIncoming, ...existing];
}

export function GamesLogTable({
  initialPage,
  filters,
  isAuthenticated = false,
  onEditGame,
  onDeleteGame,
}: Props) {
  const [games, setGames] = useState(initialPage.games);
  const [hasOlder, setHasOlder] = useState(initialPage.hasOlder);
  const [hasNewer, setHasNewer] = useState(initialPage.hasNewer);
  const [detailGame, setDetailGame] = useState<GameLogRow | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadingNewer, setLoadingNewer] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const gamesRef = useRef(games);
  const hasOlderRef = useRef(hasOlder);
  const hasNewerRef = useRef(hasNewer);
  const loadingOlderRef = useRef(loadingOlder);
  const loadingNewerRef = useRef(loadingNewer);

  useEffect(() => {
    setGames(initialPage.games);
    setHasOlder(initialPage.hasOlder);
    setHasNewer(initialPage.hasNewer);
  }, [initialPage]);

  useEffect(() => {
    gamesRef.current = games;
  }, [games]);

  useEffect(() => {
    hasOlderRef.current = hasOlder;
  }, [hasOlder]);

  useEffect(() => {
    hasNewerRef.current = hasNewer;
  }, [hasNewer]);

  useEffect(() => {
    loadingOlderRef.current = loadingOlder;
  }, [loadingOlder]);

  useEffect(() => {
    loadingNewerRef.current = loadingNewer;
  }, [loadingNewer]);

  const loadPage = useCallback(
    async (direction: "older" | "newer", cursor: GameLogRow) => {
      const params = new URLSearchParams({
        direction,
        date: cursor.date,
        id: String(cursor.id),
      });

      if (filters.from) {
        params.set("from", filters.from);
      }

      if (filters.to) {
        params.set("to", filters.to);
      }

      const response = await fetch(`/api/games-log?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load games");
      }

      return (await response.json()) as GamesLogPage;
    },
    [filters.from, filters.to],
  );

  const loadOlder = useCallback(async () => {
    if (
      loadingOlderRef.current ||
      !hasOlderRef.current ||
      gamesRef.current.length === 0
    ) {
      return;
    }

    loadingOlderRef.current = true;
    setLoadingOlder(true);

    try {
      const page = await loadPage(
        "older",
        gamesRef.current[gamesRef.current.length - 1],
      );
      setGames((current) => {
        const next = mergeGames(current, page.games);
        gamesRef.current = next;
        return next;
      });
      setHasOlder(page.hasOlder);
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [loadPage]);

  const loadNewer = useCallback(async () => {
    if (
      loadingNewerRef.current ||
      !hasNewerRef.current ||
      gamesRef.current.length === 0
    ) {
      return;
    }

    loadingNewerRef.current = true;
    const container = scrollRef.current;
    const previousScrollHeight = container?.scrollHeight ?? 0;

    setLoadingNewer(true);

    try {
      const page = await loadPage("newer", gamesRef.current[0]);
      setGames((current) => {
        const next = prependGames(current, page.games);
        gamesRef.current = next;
        return next;
      });
      setHasNewer(page.hasNewer);

      requestAnimationFrame(() => {
        if (!container) {
          return;
        }

        container.scrollTop += container.scrollHeight - previousScrollHeight;
      });
    } finally {
      loadingNewerRef.current = false;
      setLoadingNewer(false);
    }
  }, [loadPage]);

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (
      distanceFromBottom < 48 &&
      hasOlderRef.current &&
      !loadingOlderRef.current
    ) {
      void loadOlder();
    }

    if (scrollTop < 48 && hasNewerRef.current && !loadingNewerRef.current) {
      void loadNewer();
    }
  }, [loadOlder, loadNewer]);

  return (
    <>
      <div className="mb-3 h-[16rem] w-full min-w-0 max-w-full overflow-hidden rounded-sm border border-border">
        <div
          ref={scrollRef}
          className="h-full overflow-auto"
          onScroll={handleScroll}
        >
          {loadingNewer ? <LoadingLabel>Loading newer games…</LoadingLabel> : null}

          <ul className="md:hidden">
            {games.map((game) => (
              <GameLogMobileRow
                key={game.id}
                game={game}
                open={detailGame?.id === game.id}
                onOpenChange={(open) => setDetailGame(open ? game : null)}
                onEdit={
                  isAuthenticated && onEditGame
                    ? () => onEditGame(game)
                    : undefined
                }
                onDelete={
                  isAuthenticated && onDeleteGame
                    ? () => onDeleteGame(game)
                    : undefined
                }
              />
            ))}
          </ul>

          <table className="hidden w-full table-fixed border-collapse text-xs md:table">
            <colgroup>
              <col className="w-24" />
              <col className="w-[14%]" />
              <col />
              <col className="w-16" />
              <col className="w-[14%]" />
              <col className="w-[6.5rem]" />
              <col className={isAuthenticated ? "w-32" : "w-20"} />
            </colgroup>
            <thead>
              <tr className="text-[11px] font-medium text-muted-foreground">
                <th className="sticky top-0 z-10 border-b border-border/40 bg-background px-2.5 py-1.5 text-left">
                  Date
                </th>
                <th className="sticky top-0 z-10 border-b border-border/40 bg-background px-2.5 py-1.5 text-left">
                  Location
                </th>
                <th className="sticky top-0 z-10 border-b border-border/40 bg-background px-2.5 py-1.5 text-left">
                  Message
                </th>
                <th className="sticky top-0 z-10 border-b border-border/40 bg-background px-2.5 py-1.5 text-right">
                  Players
                </th>
                <th className="sticky top-0 z-10 border-b border-border/40 bg-background px-2.5 py-1.5 text-left">
                  Winner
                </th>
                <th className="sticky top-0 z-10 border-b border-border/40 bg-background px-2.5 py-1.5 text-right whitespace-nowrap">
                  Winning Score
                </th>
                <th className="sticky top-0 z-10 border-b border-border/40 bg-background px-2.5 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {loadingNewer ? (
                <tr>
                  <td
                    colSpan={7}
                    className="border-t border-border/30 px-2.5 py-1.5 text-center text-[11px] text-muted-foreground"
                  >
                    Loading newer games…
                  </td>
                </tr>
              ) : null}

              {games.map((game) => {
                const open = detailGame?.id === game.id;
                const hasScores = game.scores.length > 0;

                return (
                  <Fragment key={game.id}>
                    <tr className="text-muted-foreground hover:bg-muted/25">
                      <td className="border-t border-border/30 px-2.5 py-1.5 tabular-nums text-foreground">
                        {formatDate(game.date)}
                      </td>
                      <td className="border-t border-border/30 px-2.5 py-1.5">
                        <span className="block truncate">{game.location}</span>
                      </td>
                      <td className="border-t border-border/30 px-2.5 py-1.5">
                        <span
                          className="block truncate"
                          title={game.message ?? undefined}
                        >
                          {game.message ?? "—"}
                        </span>
                      </td>
                      <td className="border-t border-border/30 px-2.5 py-1.5 text-right tabular-nums">
                        {game.playerCount}
                      </td>
                      <td className="border-t border-border/30 px-2.5 py-1.5 font-medium text-foreground">
                        <span className="block truncate">{game.winner}</span>
                      </td>
                      <td className="border-t border-border/30 px-2.5 py-1.5 text-right tabular-nums text-foreground">
                        {game.winningScore ?? "—"}
                      </td>
                      <td className="border-t border-border/30 px-2.5 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <EaScoreButton
                            open={open}
                            disabled={!hasScores}
                            onClick={() =>
                              setDetailGame(open ? null : game)
                            }
                          />
                          {isAuthenticated && onEditGame && onDeleteGame ? (
                            <GameRowActions
                              onEdit={() => onEditGame(game)}
                              onDelete={() => onDeleteGame(game)}
                            />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {open && hasScores ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="border-t border-border/30 px-2.5 py-1.5"
                        >
                          <div className="ml-auto w-44">
                            <GameScoresList game={game} />
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}

              {loadingOlder ? (
                <tr>
                  <td
                    colSpan={7}
                    className="border-t border-border/30 px-2.5 py-1.5 text-center text-[11px] text-muted-foreground"
                  >
                    Loading older games…
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          {loadingOlder ? <LoadingLabel>Loading older games…</LoadingLabel> : null}
        </div>
      </div>
    </>
  );
}

export function GamesLogSection({
  initialPage,
  filters,
  isAuthenticated,
  players,
  locations,
}: {
  initialPage: GamesLogPage;
  filters: GamesLogFilters;
  isAuthenticated: boolean;
  players: LogGamePlayer[];
  locations: LogGameLocation[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editGame, setEditGame] = useState<GameLogRow | null>(null);
  const [deleteGame, setDeleteGame] = useState<GameLogRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (initialPage.games.length === 0) {
    return null;
  }

  function handleSuccess() {
    setEditGame(null);
    router.refresh();
  }

  function handleSignOut() {
    startTransition(async () => {
      await logoutAction();
      setEditGame(null);
      setDeleteGame(null);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteGame) {
      return;
    }

    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteGameAction({ gameId: deleteGame.id });
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }

      setDeleteGame(null);
      router.refresh();
    });
  }

  return (
    <div>
      <h2 className="mb-1 text-[12px] font-medium text-neutral-800">
        Games Log
      </h2>
      <GamesLogTable
        initialPage={initialPage}
        filters={filters}
        isAuthenticated={isAuthenticated}
        onEditGame={setEditGame}
        onDeleteGame={(game) => {
          setDeleteError(null);
          setDeleteGame(game);
        }}
      />
      <LogGameForm
        open={Boolean(editGame)}
        game={editGame}
        players={players}
        locations={locations}
        onOpenChange={(open) => {
          if (!open) {
            setEditGame(null);
          }
        }}
        onSuccess={handleSuccess}
        onSignOut={handleSignOut}
      />
      <Dialog
        open={Boolean(deleteGame)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteGame(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">Delete this game?</DialogTitle>
            <DialogDescription>
              {deleteGame
                ? `${formatDate(deleteGame.date)} at ${deleteGame.location}. This cannot be undone.`
                : "This cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          {deleteError ? (
            <p className="text-xs text-destructive">{deleteError}</p>
          ) : null}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteGame(null);
                setDeleteError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={handleDelete}
            >
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
