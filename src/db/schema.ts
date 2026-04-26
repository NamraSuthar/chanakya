import { uuid, pgTable, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core"
import { createDeflate } from "node:zlib";


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
    updatedAt: timestamp("updated_at").$onUpdate (()=> new Date()),
});