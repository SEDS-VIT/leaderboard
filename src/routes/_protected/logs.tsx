import { db } from '#/db'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start';
import { getSession, requireAccess } from '#/lib/auth.functions';
import { pointLog } from '#/db/schema';
import { desc, eq } from 'drizzle-orm';
import { Clock, EyeOff, Info } from 'lucide-react';
import { formatPoints } from '@/lib/roles';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type MyLogEntry = {
    id: string
    reason: string
    points: number
    details: string | null
    verified: boolean | null
}

const getLogs = createServerFn({ method: 'GET' })
    .handler(async (): Promise<MyLogEntry[]> => {
        const session = await getSession()
        if (!session) return []
        const result = await db
            .select({
                id: pointLog.id,
                reason: pointLog.reason,
                points: pointLog.points,
                details: pointLog.details,
                verified: pointLog.verified,
            })
            .from(pointLog)
            .where(eq(pointLog.toUser, session.user.id))
            .orderBy(desc(pointLog.id))
        return result
    })

export const Route = createFileRoute('/_protected/logs')({
    beforeLoad: requireAccess(0),
    component: RouteComponent
})

function StatusBadge({ verified }: { verified: boolean | null }) {
    if (verified === true) return <Badge variant="default">Approved</Badge>
    if (verified === false) return <Badge variant="destructive">Rejected</Badge>
    return <Badge variant="secondary"><Clock className="size-3" />Pending</Badge>
}

function RouteComponent() {
    const logs = useQuery({
        queryKey: ['myLogs'],
        queryFn: getLogs,
    })

    const entries = logs.data ?? []
    const approved = entries.filter((e) => e.verified === true)
    const pending = entries.filter((e) => e.verified === null)
    const total = approved.reduce((sum, e) => sum + e.points, 0)

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <h1 className="font-heading text-2xl font-semibold tracking-tight">My Points</h1>
                <p className="text-sm text-muted-foreground">
                    Your personal point history — amount, reason and approval status.
                </p>
            </div>

            <Alert>
                <EyeOff />
                <AlertTitle>Privacy</AlertTitle>
                <AlertDescription>
                    Who assigned these points is visible only to the Chair and HR.
                </AlertDescription>
            </Alert>

            <div className="grid gap-4 sm:grid-cols-3">
                <Card size="sm">
                    <CardHeader>
                        <CardDescription>Total approved points</CardDescription>
                        <CardTitle className="text-3xl tabular-nums">{total}</CardTitle>
                    </CardHeader>
                </Card>
                <Card size="sm">
                    <CardHeader>
                        <CardDescription>Pending verification</CardDescription>
                        <CardTitle className="text-3xl tabular-nums">{pending.length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card size="sm">
                    <CardHeader>
                        <CardDescription>Approved entries</CardDescription>
                        <CardTitle className="text-3xl tabular-nums">{approved.length}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Point history</CardTitle>
                    <CardDescription>Every entry credited to your profile.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {logs.isLoading ? (
                        <div className="flex flex-col gap-3 p-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-full" />
                            ))}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Details</TableHead>
                                    <TableHead className="text-right">Points</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {entries.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                            <Info className="mx-auto mb-2 size-4" />
                                            No point entries yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {entries.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="font-medium">{entry.reason}</TableCell>
                                        <TableCell className="max-w-xs truncate text-muted-foreground">
                                            {entry.details || '—'}
                                        </TableCell>
                                        <TableCell className={`text-right font-semibold tabular-nums ${entry.points < 0 ? 'text-destructive' : 'text-primary'}`}>
                                            {formatPoints(entry.points)}
                                        </TableCell>
                                        <TableCell><StatusBadge verified={entry.verified} /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
