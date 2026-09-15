import { APIError } from "better-auth/api";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "@/db"; // Ensure this points to your drizzle client
import * as schema from "@/db/schema";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "sqlite",
        schema,
    }),
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!
            // hd: "vitstudent.ac.in"
        },
    },
    user: {
        // ✅ Intercept the user login/registration to enforce your custom logic
        validateUserInfo: ({ user, source }) => {
            source
            const allowedDomain = "@vitstudent.ac.in";
            const adminEmail = "iamsurjog@gmail.com"; // Add your specific admin email here
            
            // Validate the email domain OR check if it's the exact admin email
            if (!user.email?.endsWith(allowedDomain) && user.email !== adminEmail) {
                // Reject unauthorized users
                throw new APIError("FORBIDDEN", {
                    message: "Only university accounts and authorized admins are allowed to sign in.",
                });
            }
        }
    },
    plugins: [tanstackStartCookies()],
});
