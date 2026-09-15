import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import {v7 as uuidv7} from "uuid"

export const reason = sqliteTable("reason", {
    id: text("id").primaryKey().$defaultFn(() => uuidv7()),
    reason: text("reason").default("").notNull(),
    points: integer("points").default(0).notNull()
})

export const attendance = sqliteTable("attendance", {
    id: text("id").primaryKey().$defaultFn(() => uuidv7()),
    userId: text("user_id").references(() => user.id),
    revoked: integer("revoked", {mode: "boolean"}).default(false),
    date: integer("date", { mode: 'timestamp' }).notNull()
})

export const pointLog = sqliteTable("point_log", {
    id: text("id").primaryKey().$defaultFn(() => uuidv7()),
    fromUser: text("from_user").references(() => user.id),
    toUser: text("to_user").references(() => user.id),
    reason: text("reason").notNull().default("adjustment"),
    details: text("details").default(""),
    verified: integer("verified", {mode: "boolean"}).default(false),
    points: integer("points").default(0).notNull()
})

export const user = sqliteTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
    image: text("image"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    fullName: text("full_name"),
    registrationNumber: text("registration_number"),
    year: integer("year"),
    accessLevel: integer("access_level").default(0),
    points: integer("points").default(0),
    isBanned: integer("is_banned", {mode: "boolean"}).default(false)
});

export const session = sqliteTable("session", {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }),
    updatedAt: integer("updated_at", { mode: "timestamp" }),
});
