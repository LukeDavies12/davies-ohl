"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  min: number;
  max: number;
  suffix: string;
  debounceMs?: number;
  onChange: (value: number) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function NumberStepper({
  value,
  min,
  max,
  suffix,
  debounceMs = 500,
  onChange,
}: Props) {
  const inputId = useId();
  const [draft, setDraft] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayValue = isFocused ? draft : String(value);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  function clearDebounce() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }

  function commit(next: number) {
    clearDebounce();
    const clamped = clamp(next, min, max);
    setDraft(String(clamped));
    onChange(clamped);
  }

  function scheduleCommit(next: number) {
    clearDebounce();
    debounceRef.current = setTimeout(() => {
      onChange(clamp(next, min, max));
      debounceRef.current = null;
    }, debounceMs);
  }

  function currentNumber() {
    if (isFocused) {
      const parsed = Number.parseInt(draft, 10);
      return Number.isNaN(parsed) ? value : clamp(parsed, min, max);
    }

    return value;
  }

  function handleFocus() {
    setDraft(String(value));
    setIsFocused(true);
  }

  function handleChange(raw: string) {
    const cleaned = raw.replace(/\D/g, "");
    setDraft(cleaned);

    if (cleaned === "") {
      clearDebounce();
      return;
    }

    const next = Number.parseInt(cleaned, 10);
    if (Number.isNaN(next)) {
      return;
    }

    scheduleCommit(next);
  }

  function handleBlur() {
    setIsFocused(false);
    clearDebounce();

    if (draft === "") {
      setDraft(String(value));
      return;
    }

    const next = Number.parseInt(draft, 10);
    if (Number.isNaN(next)) {
      setDraft(String(value));
      return;
    }

    commit(next);
  }

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn(
          "flex h-7 items-stretch overflow-hidden rounded-md border border-input bg-background focus-within:border-ring focus-within:ring-1 focus-within:ring-ring",
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Decrease"
          disabled={currentNumber() <= min}
          onClick={() => commit(currentNumber() - 1)}
          className="rounded-none"
        >
          −
        </Button>

        <label
          htmlFor={inputId}
          className="flex shrink-0 items-center border-x border-input"
        >
          <Input
            id={inputId}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={displayValue}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={(event) => handleChange(event.target.value)}
            className="h-7 w-6 rounded-none border-0 bg-transparent px-1 text-right text-xs shadow-none focus-visible:ring-0"
          />
        </label>

        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Increase"
          disabled={currentNumber() >= max}
          onClick={() => commit(currentNumber() + 1)}
          className="rounded-none"
        >
          +
        </Button>
      </div>

      <span className="text-xs whitespace-nowrap text-muted-foreground">
        {suffix}
      </span>
    </div>
  );
}
