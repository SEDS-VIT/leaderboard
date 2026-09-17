import { drizzle } from "drizzle-orm/libsql";

if (!import.meta.env.VITE_TURSO_DATABASE_URL) {
    throw new Error("VITE_TURSO_DATABASE_URL is missing in environment variables.");
}

export const db = drizzle({
    connection: {
        url: import.meta.env.VITE_TURSO_DATABASE_URL,
        authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN,
    },
});
