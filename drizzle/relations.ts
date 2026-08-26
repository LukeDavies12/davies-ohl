import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
	game: {
		location: r.one.location({
			from: r.game.locationId,
			to: r.location.id,
		}),
		players: r.many.player({
			from: r.game.id.through(r.playerScore.gameId),
			to: r.player.id.through(r.playerScore.playerId),
		}),
	},
	location: {
		games: r.many.game(),
	},
	player: {
		games: r.many.game(),
	},
	user: {
		authTokens: r.many.authToken(),
	},
	authToken: {
		user: r.one.user({
			from: r.authToken.userId,
			to: r.user.id,
		}),
	},
}));
