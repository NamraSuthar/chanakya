CREATE TABLE "authorizetion_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"client_pk" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"redirect_uri" text NOT NULL,
	"scope" text,
	"nonce" text,
	"code_challenge" text,
	"code_challenge_method" varchar(20),
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "authorizetion_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "authorizetion_codes" ADD CONSTRAINT "authorizetion_codes_client_pk_client_id_fk" FOREIGN KEY ("client_pk") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authorizetion_codes" ADD CONSTRAINT "authorizetion_codes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;