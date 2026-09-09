"use client";

import { CircleHelp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const HELP_TEXT =
  "Competitiveness % = on average, what percentage of the players in your games do you finish ahead of?";

export function CompPercentageHelp() {
  return (
    <Tooltip>
      <TooltipTrigger
        delay={0}
        closeOnClick={false}
        aria-label="What is Competitiveness %?"
        className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
      >
        <CircleHelp className="size-3" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[16.5rem]">
        {HELP_TEXT}
      </TooltipContent>
    </Tooltip>
  );
}
