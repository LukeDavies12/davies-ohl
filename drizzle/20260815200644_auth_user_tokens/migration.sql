CREATE TABLE "auth_token" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"token_hash" varchar(255) NOT NULL CONSTRAINT "auth_token_token_hash_key" UNIQUE,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" serial PRIMARY KEY,
	"username" varchar(255) NOT NULL CONSTRAINT "user_username_key" UNIQUE,
	"password_hash" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX "idx_auth_token_user_id" ON "auth_token" ("user_id");--> statement-breakpoint
CREATE INDEX "idx_auth_token_expires_at" ON "auth_token" ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_user_username" ON "user" ("username");--> statement-breakpoint
ALTER TABLE "auth_token" ADD CONSTRAINT "auth_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");