import { uuid, pgTable, varchar, text, boolean, timestamp, integer } from "drizzle-orm/pg-core"



export const usertable = pgTable('user', {
    id: uuid('id').primaryKey().defaultRandom(),

    firstName: varchar('firstName', { length: 35 }),
    lastName: varchar('lastName', { length: 35 }),

    profileImageURL: text("profile_image_url"),

    email: varchar("email", { length: 322 }),
    emailVerified: boolean("email_verified").default(false).notNull(),

    password: varchar("password", { length: 255 }),
    salt: text("salt"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});


export const clienttable = pgTable('client', {
    id: uuid('id').primaryKey().defaultRandom(),

    name: varchar('name', { length: 122 }).notNull(),

    clientId: varchar("client_id", { length: 100 }).notNull().unique(),
    clientSecret: text("client_secret"),
    clientType: varchar("client_type", { length: 20 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),


    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});


export const clientRedirectUrisTable = pgTable("client_redirect_uris", {


    id: uuid("id").primaryKey().defaultRandom(),

    clientPk: uuid("client_pk").notNull().references(() => clienttable.id, {
        onDelete: "cascade"
    }),

    redirectUri: text("redired_uri").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const authorizationCodesTable = pgTable("authorizetion_codes", {
    id: uuid("id").primaryKey().defaultRandom(),

    code: text("code").notNull().unique(),

    clientPk: uuid("client_pk").notNull().references(() => clienttable.id, { onDelete: "cascade" }),
    userPk: uuid("user_id").notNull().references(() => usertable.id, { onDelete: "cascade" }),

    redirecturi: text("redirect_uri").notNull(),
    scope: text("scope"),
    nonce: text("nonce"),
    codeChallenge: text("code_challenge"),
    codeChallengeMethod: varchar("code_challenge_method", { length: 20 }),


    expiresAt: timestamp("expires_at").notNull(),
    consumedAt: timestamp("consumed_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),


});

export const accessTokensTable = pgTable("access_tokens", {
    id: uuid("id").primaryKey().defaultRandom(),

    token: text("token").notNull().unique(),
    clientPk: uuid("client_pk")
        .notNull()
        .references(() => clienttable.id, { onDelete: "cascade" }),
    userPk: uuid("user_pk")
        .notNull()
        .references(() => usertable.id, { onDelete: "cascade" }),

    scope: text("scope"),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const refreshTokensTable = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),

  token: text("token").notNull().unique(),
  clientPk: uuid("client_pk")
    .notNull()
    .references(() => clienttable.id, { onDelete: "cascade" }),
  userPk: uuid("user_pk")
    .notNull()
    .references(() => usertable.id, { onDelete: "cascade" }),

  scope: text("scope"),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  rotatedFromTokenPk: uuid("rotated_from_token_pk").references(
    () => refreshTokensTable.id,
    { onDelete: "set null" },
  ),
  reuseCount: integer("reuse_count").default(0).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
