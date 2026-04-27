CREATE TABLE "access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"client_pk" uuid NOT NULL,
	"user_pk" uuid NOT NULL,
	"scope" text,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "access_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"client_pk" uuid NOT NULL,
	"user_pk" uuid NOT NULL,
	"scope" text,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"rotated_from_token_pk" uuid,
	"reuse_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "access_tokens" ADD CONSTRAINT "access_tokens_client_pk_client_id_fk" FOREIGN KEY ("client_pk") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_tokens" ADD CONSTRAINT "access_tokens_user_pk_user_id_fk" FOREIGN KEY ("user_pk") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_client_pk_client_id_fk" FOREIGN KEY ("client_pk") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_pk_user_id_fk" FOREIGN KEY ("user_pk") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_rotated_from_token_pk_refresh_tokens_id_fk" FOREIGN KEY ("rotated_from_token_pk") REFERENCES "public"."refresh_tokens"("id") ON DELETE set null ON UPDATE no action;