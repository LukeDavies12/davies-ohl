"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/drizzle/schema";
import { DEFAULT_USERNAME } from "@/lib/auth/constants";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";

export type AuthActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function loginAction(
  username: string,
  password: string,
): Promise<AuthActionResult> {
  const normalizedUsername = username.trim().toLowerCase();

  if (normalizedUsername !== DEFAULT_USERNAME) {
    return { ok: false, error: "Invalid username or password" };
  }

  if (!password) {
    return { ok: false, error: "Password is required" };
  }

  const [record] = await db
    .select({
      id: user.id,
      passwordHash: user.passwordHash,
    })
    .from(user)
    .where(eq(user.username, DEFAULT_USERNAME))
    .limit(1);

  if (!record) {
    return { ok: false, error: "Invalid username or password" };
  }

  const valid = await verifyPassword(password, record.passwordHash);
  if (!valid) {
    return { ok: false, error: "Invalid username or password" };
  }

  await createSession(record.id);
  return { ok: true };
}

export async function logoutAction(): Promise<AuthActionResult> {
  await destroySession();
  return { ok: true };
}
