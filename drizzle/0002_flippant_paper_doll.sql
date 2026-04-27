CREATE TABLE "client_redirect_uris" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_pk" uuid NOT NULL,
	"redired_uri" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_redirect_uris" ADD CONSTRAINT "client_redirect_uris_client_pk_client_id_fk" FOREIGN KEY ("client_pk") REFERENCES "public"."client"("id") ON DELETE cascade ON UPDATE no action;