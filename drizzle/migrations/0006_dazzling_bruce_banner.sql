ALTER TABLE "decks" ADD COLUMN "share_token" text;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_share_token_unique" UNIQUE("share_token");