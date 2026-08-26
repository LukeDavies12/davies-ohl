import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { user } from "../drizzle/schema";
import { hashPassword } from "../lib/auth/password";

const USERNAME = "davies";

async function main() {
  const password = process.env.SHARED_USER_PASSWORD;

  if (!password) {
    throw new Error("SHARED_USER_PASSWORD is not set");
  }

  const passwordHash = await hashPassword(password);
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.username, USERNAME))
    .limit(1);

  if (existing) {
    await db
      .update(user)
      .set({ passwordHash })
      .where(eq(user.id, existing.id));
    console.log(`Updated password for user "${USERNAME}"`);
    return;
  }

  await db.insert(user).values({
    username: USERNAME,
    passwordHash,
  });
  console.log(`Created user "${USERNAME}"`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
