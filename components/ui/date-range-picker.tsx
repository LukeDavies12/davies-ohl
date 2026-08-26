"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Props = {
  from: string | null;
  to: string | null;
  onChange: (range: { from: string | null; to: string | null }) => void;
};

type RangeValue = { from: string | null; to: string | null };

function toDate(value: string | null) {
  return value ? new Date(`${value}T00:00:00Z`) : undefined;
}

function toValue(date: Date | undefined) {
  if (!date) {
    return null;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = toDate(value);
  if (!date) {
    return false;
  }

  return toValue(date) === value;
}

function formatDisplay(value: string | null) {
  if (!value) {
    return "";
  }

  const date = toDate(value);
  if (!date) {
    return "";
  }

  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${month}/${day}/${year}`;
}

function parseDateInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (isValidIsoDate(trimmed)) {
    return trimmed;
  }

  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (slashMatch) {
    const month = Number(slashMatch[1]);
    const day = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    const iso = toValue(new Date(Date.UTC(year, month - 1, day)));
    return iso && isValidIsoDate(iso) ? iso : null;
  }

  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const iso = toValue(parsed);
  return iso && isValidIsoDate(iso) ? iso : null;
}

function normalizeRange(from: string | null, to: string | null): RangeValue {
  if (from && to && from > to) {
    return { from: to, to: from };
  }

  return { from, to };
}

function label(from: string | null, to: string | null) {
  if (!from && !to) {
    return "All time";
  }

  const fromLabel = from ? formatDisplay(from) : "Earliest";
  const toLabel = to ? formatDisplay(to) : "Today";
  return `${fromLabel} – ${toLabel}`;
}

function toDateRange(range: RangeValue): DateRange | undefined {
  if (!range.from && !range.to) {
    return undefined;
  }

  return { from: toDate(range.from), to: toDate(range.to) };
}

function fromDateRange(range: DateRange | undefined): RangeValue {
  return normalizeRange(toValue(range?.from), toValue(range?.to));
}

function inputValue(value: string | null) {
  return formatDisplay(value);
}

type DateFieldProps = {
  label: string;
  value: string | null;
  onCommit: (value: string | null) => void;
};

function DateField({ label, value, onCommit }: DateFieldProps) {
  const [draft, setDraft] = useState(inputValue(value));
  const [focused, setFocused] = useState(false);
  const display = focused ? draft : inputValue(value);

  function handleFocus() {
    setDraft(inputValue(value));
    setFocused(true);
  }

  function handleBlur() {
    setFocused(false);

    if (draft.trim() === "") {
      onCommit(null);
      setDraft("");
      return;
    }

    const parsed = parseDateInput(draft);
    if (parsed) {
      onCommit(parsed);
      setDraft(formatDisplay(parsed));
      return;
    }

    setDraft(inputValue(value));
  }

  return (
    <label className="flex min-w-0 flex-1 items-center gap-1 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <Input
        type="text"
        inputMode="numeric"
        placeholder="MM/DD/YYYY"
        value={display}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={(event) => setDraft(event.target.value)}
        className="h-7 w-[7.25rem] shrink-0 rounded-sm px-2 text-xs tabular-nums"
      />
    </label>
  );
}

export function DateRangePicker({ from, to, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<RangeValue>({ from, to });
  const isFiltered = Boolean(from || to);
  const displayLabel = label(from, to);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDraft({ from, to });
    }

    setOpen(nextOpen);
  }

  function updateDraft(next: RangeValue) {
    setDraft(normalizeRange(next.from, next.to));
  }

  function applyDraft(next: RangeValue) {
    onChange(normalizeRange(next.from, next.to));
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-7 w-full max-w-52 shrink-0 justify-start px-3 text-xs font-normal sm:w-52",
              isFiltered &&
                "border-primary bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          />
        }
      >
        <CalendarIcon className="size-3.5 shrink-0" />
        <span className="min-w-0 truncate tabular-nums">{displayLabel}</span>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={4}
        positionMethod="fixed"
        className="w-auto max-w-[calc(100vw-2rem)] p-0"
      >
        <div className="flex items-center gap-2 border-b px-2 py-1.5">
          <DateField
            label="From"
            value={draft.from}
            onCommit={(fromValue) =>
              updateDraft({ ...draft, from: fromValue })
            }
          />
          <DateField
            label="To"
            value={draft.to}
            onCommit={(toValue) => updateDraft({ ...draft, to: toValue })}
          />
        </div>

        <Calendar
          mode="range"
          numberOfMonths={1}
          defaultMonth={toDate(draft.from) ?? toDate(draft.to)}
          selected={toDateRange(draft)}
          onSelect={(range) => updateDraft(fromDateRange(range))}
        />

        <div className="flex justify-end gap-2 border-t px-2 py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => applyDraft({ from: null, to: null })}
          >
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => applyDraft(draft)}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
