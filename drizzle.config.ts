import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts", // Path to your schema
  out: "./drizzle", // Where migrations will be generated
  dialect: "turso", // <-- This is the missing property
  dbCredentials: {
    url: import.meta.env.VITE_TURSO_DATABASE_URL!,
    authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN,
  },
});
