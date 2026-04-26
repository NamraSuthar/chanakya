CREATE TABLE "client" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(122) NOT NULL,
	"client_id" varchar(100) NOT NULL,
	"client_secret" text,
	"client_type" varchar(20) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "client_client_id_unique" UNIQUE("client_id")
);
