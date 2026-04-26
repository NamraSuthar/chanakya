CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firstName" varchar(35),
	"lastName" varchar(35),
	"profile_image_url" text,
	"email" varchar(322),
	"email_verified" boolean DEFAULT false NOT NULL,
	"password" varchar(255),
	"salt" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
