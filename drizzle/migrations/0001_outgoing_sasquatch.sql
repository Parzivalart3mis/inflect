CREATE TYPE "public"."coach_mode" AS ENUM('conversation', 'coach');--> statement-breakpoint
CREATE TYPE "public"."deck_kind" AS ENUM('grammar', 'vocab');--> statement-breakpoint
ALTER TABLE "coach_sessions" ADD COLUMN "mode" "coach_mode" DEFAULT 'coach' NOT NULL;--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "kind" "deck_kind" DEFAULT 'grammar' NOT NULL;