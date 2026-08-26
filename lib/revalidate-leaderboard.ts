"use server";

import { refresh, revalidatePath, updateTag } from "next/cache";
import { LEADERBOARD_DATA_TAG } from "@/lib/leaderboard-page-data";

export async function revalidateLeaderboardData() {
  updateTag(LEADERBOARD_DATA_TAG);
  revalidatePath("/");
  refresh();
}
