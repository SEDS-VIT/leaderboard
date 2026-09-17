import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";
import { redirect } from '@tanstack/react-router'


export const getSession = createServerFn({ method: "GET" }).handler(async () => {
    const headers = getRequestHeaders();
    return await auth.api.getSession({ headers });
});


//TODO: Fix Type
export function requireAccess(minLevel: number) {
    return ({ context }: { context: { user:  any} }) => {
        if (context.user.accessLevel < minLevel) {
            throw redirect({ to: '/home' })
        }
    }
}
