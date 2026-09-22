import { db } from '#/db';
import { pointLog, user } from '#/db/schema';
import { getSession, requireAccess } from '#/lib/auth.functions'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start';
import { desc, eq, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { toast } from 'sonner';
import { Check, Inbox, ShieldCheck, X } from 'lucide-react';
import { formatPoints, initials } from '@/lib/roles';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

export type PendingEntry = {
    id: string
    reason: string
    details: string | null
    points: number
    initiator: string | null
    recipient: string | null
    recipientRegNo: string | null
}

export type VerifyResult = { ok: true } | { ok: false; error: string }

const getUnverifiedPoints = createServerFn({ method: 'GET' })
    .handler(async (): Promise<PendingEntry[]> => {
        const session = await getSession()
        if (!session || (session.user.accessLevel ?? 0) < 2) return []

        const initiator = alias(user, 'initiator')
        const recipient = alias(user, 'recipient')

        const result = await db
            .select({
                id: pointLog.id,
                reason: pointLog.reason,
                details: pointLog.details,
                points: pointLog.points,
                initiator: initiator.fullName,
                recipient: recipient.fullName,
                recipientRegNo: recipient.registrationNumber,
            })
            .from(pointLog)
            .leftJoin(initiator, eq(initiator.id, pointLog.fromUser))
            .leftJoin(recipient, eq(recipient.id, pointLog.toUser))
            .where(isNull(pointLog.verified))
            .orderBy(desc(pointLog.id))
        return result
    })

const updatePoints = createServerFn({ method: 'POST' })
    .validator((data: { id: string; approve: boolean }) => data)
    .handler(async ({ data }): Promise<VerifyResult> => {
        try {
            const session = await getSession()
            if (!session || (session.user.accessLevel ?? 0) < 2) {
                return { ok: false, error: 'Only Board members and above can verify points.' }
            }
            const [entry] = await db.select().from(pointLog).where(eq(pointLog.id, data.id))
            if (!entry) return { ok: false, error: 'Entry not found.' }
            if (entry.verified !== null) return { ok: false, error: 'This request has already been processed.' }

            await db.update(pointLog).set({ verified: data.approve }).where(eq(pointLog.id, data.id))
            if (data.approve && entry.toUser) {
                await db.update(user)
                    .set({ points: sql`${user.points} + ${entry.points}` })
                    .where(eq(user.id, entry.toUser))
            }
            return { ok: true }
        } catch {
            return { ok: false, error: 'Something went wrong. Please try again.' }
        }
    })

export const Route = createFileRoute('/_protected/pointVerify')({
    beforeLoad: requireAccess(2),
    component: RouteComponent,
})

function RouteComponent() {
    const queryClient = useQueryClient();

    const pending = useQuery({
        queryKey: ['verifyQueue'],
        queryFn: getUnverifiedPoints,
    })

    const decide = useMutation({
        mutationFn: updatePoints,
        onSuccess: (result) => {
            if (!result.ok) {
                toast.error(result.error)
                return
            }
            queryClient.invalidateQueries({ queryKey: ['verifyQueue'] })
            queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
            queryClient.invalidateQueries({ queryKey: ['myLogs'] })
            queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
        },
        onError: () => toast.error('Something went wrong. Please try again.'),
    })

    const entries = pending.data ?? []

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <h1 className="font-heading text-2xl font-semibold tracking-tight">Verification Queue</h1>
                <p className="text-sm text-muted-foreground">
                    Review point proposals from Senior Core members before they hit the leaderboard.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="size-5 text-primary" />
                        Pending verification
                    </CardTitle>
                    <CardDescription>
                        {entries.length} request{entries.length === 1 ? '' : 's'} awaiting a decision.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    {pending.isLoading && (
                        <>
                            <Skeleton className="h-32 w-full" />
                            <Skeleton className="h-32 w-full" />
                        </>
                    )}

                    {!pending.isLoading && entries.length === 0 && (
                        <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                            <Inbox className="size-8" />
                            <p className="font-medium">All caught up</p>
                            <p className="text-sm">There are no point changes waiting for approval.</p>
                        </div>
                    )}

                    {entries.map((entry) => (
                        <div key={entry.id} className="rounded-xl border p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarFallback>{initials(entry.recipient)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{entry.recipient ?? 'Unknown member'}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {entry.recipientRegNo ?? ''}
                                        </p>
                                    </div>
                                </div>
                                <span
                                    className={`text-lg font-semibold tabular-nums ${entry.points < 0 ? 'text-destructive' : 'text-primary'}`}
                                >
                                    {formatPoints(entry.points)}
                                </span>
                            </div>

                            <Separator className="my-3" />

                            <div className="grid gap-2 text-sm sm:grid-cols-2">
                                <div>
                                    <p className="text-muted-foreground">Reason</p>
                                    <p className="font-medium">{entry.reason}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Initiated by</p>
                                    <p className="font-medium">{entry.initiator ?? 'Unknown'}</p>
                                </div>
                                {entry.details && (
                                    <div className="sm:col-span-2">
                                        <p className="text-muted-foreground">Context</p>
                                        <p>{entry.details}</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 flex justify-end gap-2">
                                <Button
                                    variant="destructive"
                                    disabled={decide.isPending}
                                    onClick={() => decide.mutate({ data: { id: entry.id, approve: false } })}
                                >
                                    <X />
                                    Reject
                                </Button>
                                <Button
                                    disabled={decide.isPending}
                                    onClick={() => decide.mutate({ data: { id: entry.id, approve: true } })}
                                >
                                    <Check />
                                    Approve
                                </Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}
