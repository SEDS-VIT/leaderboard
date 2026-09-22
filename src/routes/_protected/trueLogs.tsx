import { db } from '#/db';
import { pointLog, user } from '#/db/schema';
import { getSession, requireAccess } from '#/lib/auth.functions'
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start';
import { desc, eq, gt } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { useState } from 'react';
import { Clock, Eye, Search } from 'lucide-react';
import { formatPoints, initials } from '@/lib/roles';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type AuditEntry = {
    id: string
    reason: string
    details: string | null
    points: number
    verified: boolean | null
    recipient: string | null
    recipientRegNo: string | null
    initiator: string | null
}

const getTrueLogs = createServerFn({ method: 'GET' })
    .handler(async (): Promise<AuditEntry[]> => {
        const session = await getSession();
        if ((session?.user.accessLevel ?? 0) < 3) return []

        const initiator = alias(user, 'initiator')
        const recipient = alias(user, 'recipient')

        const result = await db
            .select({
                id: pointLog.id,
                reason: pointLog.reason,
                details: pointLog.details,
                points: pointLog.points,
                verified: pointLog.verified,
                recipient: recipient.fullName,
                recipientRegNo: recipient.registrationNumber,
                initiator: initiator.fullName,
            })
            .from(pointLog)
            .leftJoin(recipient, eq(recipient.id, pointLog.toUser))
            .leftJoin(initiator, eq(initiator.id, pointLog.fromUser))
            .where(gt(recipient.accessLevel, -1))
            .orderBy(desc(pointLog.id))
        return result
    })

export const Route = createFileRoute('/_protected/trueLogs')({
    beforeLoad: requireAccess(3),
    component: RouteComponent,
})

function StatusBadge({ verified }: { verified: boolean | null }) {
    if (verified === true) return <Badge variant="default">Approved</Badge>
    if (verified === false) return <Badge variant="destructive">Rejected</Badge>
    return <Badge variant="secondary"><Clock className="size-3" />Pending</Badge>
}

function RouteComponent() {
    const logs = useQuery({
        queryKey: ['auditLogs'],
        queryFn: getTrueLogs,
    })
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
    const [search, setSearch] = useState('')

    const entries = logs.data ?? []
    const filtered = entries.filter((entry) => {
        const statusOk =
            filter === 'all' ||
            (filter === 'pending' && entry.verified === null) ||
            (filter === 'approved' && entry.verified === true) ||
            (filter === 'rejected' && entry.verified === false)
        const q = search.trim().toLowerCase()
        const searchOk =
            q.length === 0 ||
            (entry.recipient ?? '').toLowerCase().includes(q) ||
            (entry.initiator ?? '').toLowerCase().includes(q) ||
            entry.reason.toLowerCase().includes(q)
        return statusOk && searchOk
    })

    const counts = {
        all: entries.length,
        pending: entries.filter((e) => e.verified === null).length,
        approved: entries.filter((e) => e.verified === true).length,
        rejected: entries.filter((e) => e.verified === false).length,
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <h1 className="font-heading text-2xl font-semibold tracking-tight">Full Ledger</h1>
                <p className="text-sm text-muted-foreground">
                    Complete audit trail — who received points, who initiated them, and the outcome.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Eye className="size-5 text-primary" />
                        Point ledger
                    </CardTitle>
                    <CardDescription>
                        Restricted to Chair and HR. {counts.all} total entries.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                            <TabsList>
                                <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
                                <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
                                <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
                                <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <div className="relative sm:w-64">
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search name or reason…"
                                className="pl-8"
                            />
                        </div>
                    </div>

                    {logs.isLoading ? (
                        <div className="flex flex-col gap-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-full" />
                            ))}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Recipient</TableHead>
                                    <TableHead>Initiated by</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Details</TableHead>
                                    <TableHead className="text-right">Points</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            No ledger entries match this filter.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {filtered.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Avatar size="sm">
                                                    <AvatarFallback>{initials(entry.recipient)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{entry.recipient ?? 'Unknown'}</p>
                                                    <p className="text-xs text-muted-foreground">{entry.recipientRegNo ?? ''}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{entry.initiator ?? 'Unknown'}</TableCell>
                                        <TableCell className="font-medium">{entry.reason}</TableCell>
                                        <TableCell className="max-w-48 truncate text-muted-foreground">
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
