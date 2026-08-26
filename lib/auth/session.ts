import { cookies } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { authToken, user } from "@/drizzle/schema";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_DAYS } from "@/lib/auth/constants";
import { createSessionToken, hashSessionToken } from "@/lib/auth/token";

export type Session = {
  userId: number;
  username: string;
};

function sessionExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_MAX_AGE_DAYS);
  return expiresAt;
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const [row] = await db
    .select({
      userId: authToken.userId,
      username: user.username,
    })
    .from(authToken)
    .innerJoin(user, eq(user.id, authToken.userId))
    .where(
      and(
        eq(authToken.tokenHash, tokenHash),
        isNull(authToken.revokedAt),
        gt(authToken.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  return { userId: row.userId, username: row.username };
}

export async function createSession(userId: number) {
  const rawToken = createSessionToken();
  const expiresAt = sessionExpiryDate();

  await db.insert(authToken).values({
    userId,
    tokenHash: hashSessionToken(rawToken),
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const tokenHash = hashSessionToken(token);
    await db
      .update(authToken)
      .set({ revokedAt: new Date() })
      .where(eq(authToken.tokenHash, tokenHash));
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}
