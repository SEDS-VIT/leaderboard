import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";
import { redirect } from '@tanstack/react-router'

// Short-lived memo keyed by the session token cookie so that a single SSR
// request (route beforeLoad + every server fn handler that re-checks auth)
// resolves the session at most once. Entries are per-token, so different
// users never share cached sessions. This is a best-effort layer on top of
// better-auth's cookieCache; it mainly saves the duplicate DB lookup on the
// rare request where the cookie cache has expired.
type SessionResult = Awaited<ReturnType<typeof auth.api.getSession>>

const SESSION_MEMO_TTL_MS = 30_000
const SESSION_MEMO_MAX_ENTRIES = 500
const sessionMemo = new Map<string, { expires: number; session: SessionResult }>()

function getSessionToken(headers: Headers): string | null {
    const cookie = headers.get("cookie")
    if (!cookie) return null
    const match = cookie.match(/(?:__Secure-)?better-auth\.session_token=([^;]+)/)
    return match ? match[1] : null
}

async function resolveSession(): Promise<SessionResult> {
    const headers = getRequestHeaders();
    const token = getSessionToken(headers)
    const now = Date.now()

    if (token) {
        const hit = sessionMemo.get(token)
        if (hit && hit.expires > now) {
            return hit.session
        }
    }

    const session = await auth.api.getSession({ headers })

    if (token && session) {
        if (sessionMemo.size >= SESSION_MEMO_MAX_ENTRIES) {
            // Map preserves insertion order; drop the oldest entry.
            const oldest = sessionMemo.keys().next().value
            if (oldest !== undefined) sessionMemo.delete(oldest)
        }
        sessionMemo.set(token, { expires: now + SESSION_MEMO_TTL_MS, session })
    }

    return session
}

export const getSession = createServerFn({ method: "GET" }).handler(resolveSession);


//TODO: Fix Type
export function requireAccess(minLevel: number) {
    return ({ context }: { context: { user:  any} }) => {
        if (context.user.accessLevel < minLevel) {
            throw redirect({ to: '/home' })
        }
    }
}
