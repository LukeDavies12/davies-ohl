"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CalendarIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { logGameAction, updateGameAction } from "@/lib/actions/log-game";
import type { GameLogRow } from "@/lib/games-log";
import type {
  LogGameLocation,
  LogGamePlayer,
} from "@/lib/log-game-options";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: LogGamePlayer[];
  locations: LogGameLocation[];
  onSuccess: () => void;
  onSignOut?: () => void;
  game?: GameLogRow | null;
};

type ScoreEntry = {
  playerId?: number;
  playerName: string;
  score: number;
  isNew?: boolean;
};

function getPlayersCursorContext(input: string, cursor: number) {
  const before = input.slice(0, cursor);
  const after = input.slice(cursor);
  const tokenStart = before.lastIndexOf(" ") + 1;
  const trailingMatch = after.match(/^\S*/);
  const tokenEnd = cursor + (trailingMatch?.[0]?.length ?? 0);
  const currentToken = input.slice(tokenStart, tokenEnd);
  const tokensBefore = before.slice(0, tokenStart).trim()
    ? before.slice(0, tokenStart).trim().split(/\s+/).length
    : 0;

  return {
    currentToken,
    tokenStart,
    tokenEnd,
    isNameToken: tokensBefore % 2 === 0,
  };
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
}

function parsePlayerScores(
  input: string,
  players: LogGamePlayer[],
  allowPending = false,
):
  | { ok: true; scores: ScoreEntry[]; pendingName?: string }
  | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter at least one player and score" };
  }

  const tokens = trimmed.split(/\s+/);
  const playerByName = new Map(
    players.map((player) => [player.name.toLowerCase(), player]),
  );
  const usedKeys = new Set<string>();
  const scores: ScoreEntry[] = [];

  for (let index = 0; index < tokens.length; ) {
    const name = tokens[index];
    const scoreToken = tokens[index + 1];

    if (scoreToken === undefined) {
      if (allowPending) {
        return { ok: true, scores, pendingName: name };
      }

      return { ok: false, error: `Expected a score after "${name}"` };
    }

    if (!/^-?\d+$/.test(scoreToken)) {
      return { ok: false, error: `Expected a score after "${name}"` };
    }

    const normalizedName = name.toLowerCase();
    const existing = playerByName.get(normalizedName);

    if (usedKeys.has(normalizedName)) {
      return {
        ok: false,
        error: `"${existing?.name ?? name}" appears more than once`,
      };
    }

    usedKeys.add(normalizedName);

    if (existing) {
      scores.push({
        playerId: existing.id,
        playerName: existing.name,
        score: Number(scoreToken),
      });
    } else {
      scores.push({
        playerName: name,
        score: Number(scoreToken),
        isNew: true,
      });
    }

    index += 2;
  }

  return { ok: true, scores };
}

function SearchList({
  items,
  highlightIndex,
  onHighlight,
  onSelect,
  emptyLabel,
}: {
  items: Array<{ key: string; label: string; hint?: string }>;
  highlightIndex: number;
  onHighlight: (index: number) => void;
  onSelect: (index: number) => void;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return (
      <p className="px-2 py-1.5 text-xs text-muted-foreground">{emptyLabel}</p>
    );
  }

  return (
    <ul className="max-h-40 overflow-auto py-1">
      {items.map((item, index) => (
        <li key={item.key}>
          <button
            type="button"
            className={cn(
              "flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-xs hover:bg-muted",
              index === highlightIndex && "bg-muted",
            )}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => onHighlight(index)}
            onClick={() => onSelect(index)}
          >
            <span className="truncate">{item.label}</span>
            {item.hint ? (
              <span className="shrink-0 text-muted-foreground">{item.hint}</span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

function AutocompletePanel({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="absolute top-full left-0 z-50 mt-1 w-full overflow-hidden rounded-lg bg-popover shadow-md ring-1 ring-foreground/10">
      {children}
    </div>
  );
}

export function LogGameForm({
  open,
  onOpenChange,
  players,
  locations,
  onSuccess,
  onSignOut,
  game = null,
}: Props) {
  const today = useMemo(() => toIsoDate(new Date()), []);
  const [date, setDate] = useState(today);
  const [dateOpen, setDateOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationHighlight, setLocationHighlight] = useState(0);
  const [message, setMessage] = useState("");
  const [playersInput, setPlayersInput] = useState("");
  const [playersCursor, setPlayersCursor] = useState(0);
  const [playerAutocompleteOpen, setPlayerAutocompleteOpen] = useState(false);
  const [playerHighlight, setPlayerHighlight] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const playersTextareaRef = useRef<HTMLTextAreaElement>(null);
  const dateFieldRef = useRef<HTMLDivElement>(null);
  const skipPlayersKeyUpRef = useRef(false);
  const isEditing = Boolean(game);

  const parsedPreview = useMemo(() => {
    if (!playersInput.trim()) {
      return null;
    }

    return parsePlayerScores(playersInput, players, true);
  }, [playersInput, players]);

  const playersCursorContext = useMemo(
    () => getPlayersCursorContext(playersInput, playersCursor),
    [playersInput, playersCursor],
  );

  const playerAutocompleteItems = useMemo(() => {
    const query = playersCursorContext.currentToken.trim().toLowerCase();
    if (!playersCursorContext.isNameToken || !query) {
      return [];
    }

    const matches = players
      .filter((entry) => entry.name.toLowerCase().includes(query))
      .sort((left, right) => {
        const leftName = left.name.toLowerCase();
        const rightName = right.name.toLowerCase();
        const leftExact = leftName === query;
        const rightExact = rightName === query;
        if (leftExact !== rightExact) {
          return leftExact ? -1 : 1;
        }

        const leftPrefix = leftName.startsWith(query);
        const rightPrefix = rightName.startsWith(query);
        if (leftPrefix !== rightPrefix) {
          return leftPrefix ? -1 : 1;
        }

        return leftName.localeCompare(rightName);
      });

    const items: Array<{ key: string; label: string; hint?: string }> =
      matches.map((entry) => ({
        key: String(entry.id),
        label: entry.name,
      }));

    const exactMatch = players.some(
      (entry) => entry.name.toLowerCase() === query,
    );

    if (!exactMatch) {
      items.push({
        key: `create:${playersCursorContext.currentToken.trim()}`,
        label: `Add "${playersCursorContext.currentToken.trim()}"`,
        hint: "new",
      });
    }

    return items;
  }, [players, playersCursorContext]);

  const showPlayerAutocomplete =
    playerAutocompleteOpen &&
    playersCursorContext.isNameToken &&
    playersCursorContext.currentToken.trim().length > 0 &&
    playerAutocompleteItems.length > 0;

  const locationItems = useMemo(() => {
    const query = locationQuery.trim().toLowerCase();
    const matches = locations.filter((entry) =>
      entry.name.toLowerCase().includes(query),
    );

    const items: Array<{ key: string; label: string; hint?: string }> =
      matches.map((entry) => ({
        key: String(entry.id),
        label: entry.name,
      }));

    const exactMatch = locations.some(
      (entry) => entry.name.toLowerCase() === query,
    );

    if (query && !exactMatch) {
      items.unshift({
        key: `create:${locationQuery.trim()}`,
        label: `Add "${locationQuery.trim()}"`,
        hint: "new",
      });
    }

    return items;
  }, [locationQuery, locations]);

  function resetForm() {
    setDate(today);
    setLocationQuery("");
    setMessage("");
    setPlayersInput("");
    setPlayersCursor(0);
    setPlayerAutocompleteOpen(false);
    setPlayerHighlight(0);
    setError(null);
    setLocationHighlight(0);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!game) {
      resetForm();
      return;
    }

    setDate(game.date.slice(0, 10));
    setLocationQuery(game.location);
    setMessage(game.message ?? "");
    setPlayersInput(
      game.scores.map((entry) => `${entry.player} ${entry.score}`).join(" "),
    );
    setPlayersCursor(0);
    setPlayerAutocompleteOpen(false);
    setPlayerHighlight(0);
    setError(null);
    setLocationHighlight(0);
  }, [game, open, today]);

  useEffect(() => {
    if (!dateOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        dateFieldRef.current &&
        !dateFieldRef.current.contains(event.target as Node)
      ) {
        setDateOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [dateOpen]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetForm();
    }

    onOpenChange(nextOpen);
  }

  function selectLocation(index: number) {
    const item = locationItems[index];
    if (!item) {
      return;
    }

    if (item.key.startsWith("create:")) {
      setLocationQuery(item.label.replace(/^Add "(.*)"$/, "$1"));
    } else {
      setLocationQuery(item.label);
    }

    setLocationOpen(false);
    setLocationHighlight(0);
  }

  function updatePlayersInput(
    nextValue: string,
    nextCursor: number,
    openAutocomplete = true,
  ) {
    setPlayersInput(nextValue);
    setPlayersCursor(nextCursor);
    setError(null);

    const context = getPlayersCursorContext(nextValue, nextCursor);
    setPlayerAutocompleteOpen(
      openAutocomplete &&
        context.isNameToken &&
        context.currentToken.trim().length > 0,
    );
    setPlayerHighlight(0);
  }

  function selectPlayerSuggestion(index: number) {
    const item = playerAutocompleteItems[index];
    if (!item) {
      return;
    }

    const { tokenStart, tokenEnd } = playersCursorContext;
    const replacement = item.key.startsWith("create:")
      ? playersCursorContext.currentToken.trim()
      : item.label;
    const remainder = playersInput.slice(tokenEnd);
    const suffix = remainder.startsWith(" ") ? remainder : ` ${remainder}`;
    const nextValue = playersInput.slice(0, tokenStart) + replacement + suffix;
    const nextCursor = tokenStart + replacement.length + 1;

    updatePlayersInput(nextValue, nextCursor, false);
    skipPlayersKeyUpRef.current = true;
    requestAnimationFrame(() => {
      const textarea = playersTextareaRef.current;
      if (!textarea) {
        return;
      }

      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = parsePlayerScores(playersInput, players);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    startTransition(async () => {
      const payload = {
        date,
        locationName: locationQuery,
        message: message.trim() ? message : null,
        scores: parsed.scores.map((entry) => ({
          playerId: entry.playerId,
          playerName: entry.playerName,
          score: entry.score,
        })),
      };

      const result = game
        ? await updateGameAction({ gameId: game.id, ...payload })
        : await logGameAction(payload);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      handleOpenChange(false);
      onSuccess();
    });
  }

  const canSubmit =
    parsedPreview?.ok === true &&
    parsedPreview.scores.length > 0 &&
    !parsedPreview.pendingName &&
    locationQuery.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-8! flex max-h-[min(100dvh-2rem,640px)] translate-y-0! flex-col gap-0 overflow-hidden rounded-sm p-0 sm:max-w-lg"
      >
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <DialogHeader className="shrink-0 border-b px-2.5 py-2">
            <div className="flex items-center justify-end gap-2">
              <DialogTitle className="sr-only">
                {isEditing ? "Update game" : "Log game"}
              </DialogTitle>
              <div className="flex shrink-0 items-center gap-0.5">
                {onSignOut ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="h-auto px-1 text-[11px] text-muted-foreground"
                    onClick={onSignOut}
                  >
                    Sign out
                  </Button>
                ) : null}
                <DialogClose
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                    />
                  }
                >
                  <XIcon className="size-3.5" />
                  <span className="sr-only">Close</span>
                </DialogClose>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2.5 py-2 text-[12px]">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="game-date" className="text-[12px]">
                  Date
                </Label>
                <div className="relative" ref={dateFieldRef}>
                  <Button
                    id="game-date"
                    type="button"
                    variant="outline"
                    aria-expanded={dateOpen}
                    className="h-7 w-full justify-start px-2 text-[12px] font-normal"
                    onClick={() => setDateOpen((current) => !current)}
                  >
                    <CalendarIcon className="size-3.5 shrink-0" />
                    <span className="tabular-nums">{formatDisplayDate(date)}</span>
                  </Button>
                  {dateOpen ? (
                    <div className="absolute top-full left-0 z-50 mt-1 rounded-lg bg-popover p-0 shadow-md ring-1 ring-foreground/10">
                      <Calendar
                        mode="single"
                        selected={date ? new Date(`${date}T12:00:00`) : undefined}
                        onSelect={(nextDate) => {
                          if (!nextDate) {
                            return;
                          }

                          setDate(toIsoDate(nextDate));
                          setDateOpen(false);
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="game-location" className="text-[12px]">
                  Location
                </Label>
                <div className="relative">
                  <Input
                    id="game-location"
                    value={locationQuery}
                    onChange={(event) => {
                      setLocationQuery(event.target.value);
                      setLocationOpen(true);
                      setLocationHighlight(0);
                    }}
                    onFocus={() => setLocationOpen(true)}
                    onBlur={() => setLocationOpen(false)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setLocationOpen(true);
                        setLocationHighlight((current) =>
                          Math.min(current + 1, locationItems.length - 1),
                        );
                      }

                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        setLocationHighlight((current) =>
                          Math.max(current - 1, 0),
                        );
                      }

                      if (event.key === "Enter" && locationOpen) {
                        event.preventDefault();
                        selectLocation(locationHighlight);
                      }

                      if (event.key === "Escape" && locationOpen) {
                        event.preventDefault();
                        event.stopPropagation();
                        setLocationOpen(false);
                      }
                    }}
                    placeholder="Location"
                    className="h-7 px-2 text-[12px]"
                    autoComplete="off"
                  />
                  <AutocompletePanel open={locationOpen}>
                    <SearchList
                      items={locationItems}
                      highlightIndex={locationHighlight}
                      onHighlight={setLocationHighlight}
                      onSelect={selectLocation}
                      emptyLabel="No locations found"
                    />
                  </AutocompletePanel>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="game-message" className="text-[12px]">
                Message (optional)
              </Label>
              <Textarea
                id="game-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-12 py-1.5 text-[12px] field-sizing-fixed"
                style={{ fieldSizing: "fixed" }}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="game-players" className="text-[12px]">
                Players
              </Label>
              <div className="relative">
                <Textarea
                  ref={playersTextareaRef}
                  id="game-players"
                  value={playersInput}
                  onChange={(event) => {
                    updatePlayersInput(
                      event.target.value,
                      event.target.selectionStart ?? event.target.value.length,
                    );
                  }}
                  onClick={(event) => {
                    const target = event.currentTarget;
                    updatePlayersInput(
                      target.value,
                      target.selectionStart ?? target.value.length,
                    );
                  }}
                  onBlur={() => setPlayerAutocompleteOpen(false)}
                  onKeyUp={(event) => {
                    if (skipPlayersKeyUpRef.current) {
                      skipPlayersKeyUpRef.current = false;
                      return;
                    }

                    const target = event.currentTarget;
                    updatePlayersInput(
                      target.value,
                      target.selectionStart ?? target.value.length,
                    );
                  }}
                  onKeyDown={(event) => {
                    if (!showPlayerAutocomplete) {
                      return;
                    }

                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setPlayerHighlight((current) =>
                        Math.min(
                          current + 1,
                          playerAutocompleteItems.length - 1,
                        ),
                      );
                      return;
                    }

                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setPlayerHighlight((current) =>
                        Math.max(current - 1, 0),
                      );
                      return;
                    }

                    if (
                      event.key === "Enter" ||
                      event.key === "Tab" ||
                      event.key === " "
                    ) {
                      event.preventDefault();
                      event.stopPropagation();
                      selectPlayerSuggestion(playerHighlight);
                      return;
                    }

                    if (event.key === "Escape") {
                      event.preventDefault();
                      event.stopPropagation();
                      setPlayerAutocompleteOpen(false);
                    }
                  }}
                  placeholder="Trent 143 Luke 182 Jake 124"
                  className="min-h-24 py-1.5 font-mono text-[12px] leading-5 field-sizing-fixed"
                  style={{ fieldSizing: "fixed" }}
                  autoCapitalize="words"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <AutocompletePanel open={showPlayerAutocomplete}>
                  <SearchList
                    items={playerAutocompleteItems}
                    highlightIndex={playerHighlight}
                    onHighlight={setPlayerHighlight}
                    onSelect={selectPlayerSuggestion}
                    emptyLabel="No players found"
                  />
                </AutocompletePanel>
              </div>
            </div>

            {parsedPreview?.ok && parsedPreview.scores.length > 0 ? (
              <ul className="divide-y rounded-sm border border-border text-[12px]">
                {parsedPreview.scores.map((entry) => (
                  <li
                    key={`${entry.playerId ?? "new"}-${entry.playerName}`}
                    className="flex items-center justify-between gap-2 px-2 py-1"
                  >
                    <span className="font-medium text-foreground">
                      {entry.playerName}
                      {entry.isNew ? (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          (new)
                        </span>
                      ) : null}
                    </span>
                    <span className="tabular-nums text-foreground">
                      {entry.score}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {error || (parsedPreview && !parsedPreview.ok && playersInput.trim()) ? (
              <p className="text-[12px] text-destructive">
                {error ?? (parsedPreview && !parsedPreview.ok ? parsedPreview.error : null)}
              </p>
            ) : null}
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 gap-0 border-t bg-muted/50 px-2.5 py-2">
            <Button
              type="submit"
              size="sm"
              className="text-xs"
              disabled={isPending || !canSubmit}
            >
              {isPending ? "Saving…" : isEditing ? "Update Game" : "Save Game"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
