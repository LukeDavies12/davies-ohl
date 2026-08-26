import { pgTable, serial, varchar, timestamp, integer, date, boolean, index, unique, foreignKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const location = pgTable("location", {
	id: serial().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
}, (table) => [
	unique("location_name_key").on(table.name),
]);

export const player = pgTable("player", {
	id: serial().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
	isActive: boolean("is_active").default(true),
}, (table) => [
	index("idx_player_is_active").using("btree", table.isActive.asc().nullsLast()),
]);

export const game = pgTable("game", {
	id: serial().primaryKey(),
	createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
	date: date().notNull(),
	message: varchar({ length: 1000 }),
	locationId: integer("location_id"),
}, (table) => [
	index("idx_game_date").using("btree", table.date.asc().nullsLast()),
	foreignKey({
		columns: [table.locationId],
		foreignColumns: [location.id],
		name: "fk_game_location",
	}),
]);

export const playerScore = pgTable("player_score", {
	id: serial().primaryKey(),
	playerId: integer("player_id").notNull(),
	gameId: integer("game_id").notNull(),
	score: integer().notNull(),
}, (table) => [
	index("idx_player_score_game_id").using("btree", table.gameId.asc().nullsLast()),
	index("idx_player_score_game_score").using("btree", table.gameId.asc().nullsLast(), table.score.desc().nullsFirst()),
	index("idx_player_score_player_game").using("btree", table.playerId.asc().nullsLast(), table.gameId.asc().nullsLast()),
	unique("player_score_player_id_game_id_key").on(table.playerId, table.gameId),
	foreignKey({
		columns: [table.playerId],
		foreignColumns: [player.id],
		name: "player_score_player_id_fkey",
	}),
	foreignKey({
		columns: [table.gameId],
		foreignColumns: [game.id],
		name: "player_score_game_id_fkey",
	}),
]);

export const user = pgTable("user", {
	id: serial().primaryKey(),
	username: varchar({ length: 255 }).notNull(),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("user_username_key").on(table.username),
	index("idx_user_username").using("btree", table.username.asc().nullsLast()),
]);

export const authToken = pgTable("auth_token", {
	id: serial().primaryKey(),
	userId: integer("user_id").notNull(),
	tokenHash: varchar("token_hash", { length: 255 }).notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
	revokedAt: timestamp("revoked_at"),
}, (table) => [
	unique("auth_token_token_hash_key").on(table.tokenHash),
	index("idx_auth_token_user_id").using("btree", table.userId.asc().nullsLast()),
	index("idx_auth_token_expires_at").using("btree", table.expiresAt.asc().nullsLast()),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [user.id],
		name: "auth_token_user_id_fkey",
	}),
]);
