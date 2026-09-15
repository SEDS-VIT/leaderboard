import { drizzle } from "drizzle-orm/libsql";

if (!process.env.VITE_TURSO_DATABASE_URL) {
    throw new Error("VITE_TURSO_DATABASE_URL is missing in environment variables.");
}

export const db = drizzle({
    connection: {
        url: process.env.VITE_TURSO_DATABASE_URL,
        authToken: process.env.VITE_TURSO_AUTH_TOKEN,
    },
});
