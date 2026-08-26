import { drizzle } from "drizzle-orm/neon-http";
import { relations } from "@/drizzle/relations";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

export const db = drizzle(databaseUrl, { relations });
