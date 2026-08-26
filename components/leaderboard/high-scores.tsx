"use client";

import type { HighScoreDetail, HighScoreGroup } from "@/lib/high-scores";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  groups: HighScoreGroup[];
};

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${month}/${day}/${year}`;
}

const metaLineClass =
  "flex min-h-4 w-full min-w-0 items-center text-left text-[11px] leading-4 text-muted-foreground";

const gamesTriggerClass =
  "shrink-0 cursor-default underline decoration-muted-foreground/35 decoration-dotted underline-offset-[3px] hover:text-foreground";

function DateLocation({
  date,
  location,
  locationClassName,
}: {
  date: string;
  location: string;
  locationClassName?: string;
}) {
  return (
    <>
      <span>{formatDate(date)}</span>{" "}
      <span className={cn("text-muted-foreground/50", locationClassName)}>
        {location}
      </span>
    </>
  );
}

function TooltipDetail({ detail }: { detail: HighScoreDetail }) {
  return (
    <div className="w-full text-left">
      <span>{detail.player} </span>
      <DateLocation
        date={detail.date}
        location={detail.location}
        locationClassName="text-background/60"
      />
    </div>
  );
}

function ScoreMeta({
  appearanceCount,
  details,
}: {
  appearanceCount: number;
  details: HighScoreDetail[];
}) {
  if (appearanceCount === 1) {
    const detail = details[0];
    return (
      <div className={metaLineClass}>
        <span className="min-w-0 truncate">
          <DateLocation date={detail.date} location={detail.location} />
        </span>
      </div>
    );
  }

  return (
    <div className={metaLineClass}>
      <Tooltip>
        <TooltipTrigger render={<span className={gamesTriggerClass} />}>
          {appearanceCount} games
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" sideOffset={6} className="max-w-xs">
          <div className="w-full space-y-1 text-left">
            {details.map((entry) => (
              <TooltipDetail
                key={`${entry.player}-${entry.date}-${entry.location}`}
                detail={entry}
              />
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function HighScores({ groups }: Props) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="mb-3">
      <h2 className="mb-1 text-[12px] font-medium text-neutral-800">
        High Scores by # of Players
      </h2>
      <div className="h-[16rem] min-w-0 overflow-y-auto overflow-x-clip overscroll-contain md:h-auto md:overflow-visible">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {groups.map((group) => (
            <section key={group.playerCount}>
              <h2 className="mb-1 text-[11px] font-medium text-muted-foreground">
                {group.playerCount} players
              </h2>
              <ol className="space-y-1.5">
                {group.entries.map((entry) => (
                  <li
                    key={`${group.playerCount}-${entry.score}-${entry.players}`}
                    className="space-y-0.5"
                  >
                    <div className="flex items-start justify-between gap-2 text-xs leading-4">
                      <span className="min-w-0 truncate text-foreground">
                        {entry.players}
                      </span>
                      <span className="shrink-0 tabular-nums text-foreground">
                        {entry.score}
                      </span>
                    </div>
                    <ScoreMeta
                      appearanceCount={entry.appearanceCount}
                      details={entry.details}
                    />
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
