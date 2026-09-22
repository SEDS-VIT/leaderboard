import { db } from '#/db'
import { user } from '#/db/schema'
import { createFileRoute } from "@tanstack/react-router";
import { getSession, requireAccess } from '#/lib/auth.functions'
import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, gt, lt } from 'drizzle-orm';
import { useQuery } from '@tanstack/react-query';
import { Award, Crown, Medal, Trophy } from 'lucide-react';
import { initials, roleLabel } from '@/lib/roles';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type LeaderboardEntry = {
    id: string
    name: string | null
    regNo: string | null
    image: string | null
    points: number | null
    level: number | null
}

const getLeaderboard = createServerFn({ method: 'GET' })
    .handler(async (): Promise<LeaderboardEntry[]> => {
        const session = await getSession()
        if (!session) return []
        const myLevel = session.user.accessLevel ?? 0
        // Junior Core (accessLevel 0) only sees the Junior Core leaderboard.
        // Senior Core, Board, HR and Chair (accessLevel > 0) see both SC and JC.
        // Board, HR and Chair are exempt from the point system (accessLevel >= 2),
        // and hidden accounts (accessLevel -1) never appear.
        return await db
            .select({
                id: user.id,
                name: user.fullName,
                regNo: user.registrationNumber,
                image: user.image,
                points: user.points,
                level: user.accessLevel,
            })
            .from(user)
            .where(
                myLevel > 0
                    ? and(gt(user.accessLevel, -1), lt(user.accessLevel, 2))
                    : eq(user.accessLevel, 0),
            )
            .orderBy(desc(user.points), asc(user.fullName))
    })

export const Route = createFileRoute('/_protected/home')({
    beforeLoad: requireAccess(0),
    component: RouteComponent,
})

function RankCell({ rank }: { rank: number }) {
    if (rank === 1) return <span className="flex items-center gap-1.5 font-semibold text-amber-300"><Trophy className="size-4" />1</span>
    if (rank === 2) return <span className="flex items-center gap-1.5 font-semibold text-slate-300"><Medal className="size-4" />2</span>
    if (rank === 3) return <span className="flex items-center gap-1.5 font-semibold text-orange-400"><Award className="size-4" />3</span>
    return <span className="text-muted-foreground">{rank}</span>
}

function RouteComponent() {
    const { user: me } = Route.useRouteContext();

    const leaderboard = useQuery({
        queryKey: ['leaderboard'],
        queryFn: getLeaderboard,
    })

    const rows = leaderboard.data ?? []
    const myLevel = me.accessLevel ?? 0
    const canSeeBoth = myLevel > 0

    const sc = rows.filter((r) => (r.level ?? 0) >= 1)
    const jc = rows.filter((r) => (r.level ?? 0) < 1)

    // Rank is computed within my own group only.
    const myGroup = myLevel >= 1 ? sc : jc
    const myIndex = myGroup.findIndex((r) => r.id === me.id)
    const myRank = myIndex >= 0 ? myIndex + 1 : null
    const myPoints = myGroup[myIndex]?.points ?? me.points ?? 0

    const renderTable = (entries: LeaderboardEntry[], offset = 0) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {entries.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            No members yet.
                        </TableCell>
                    </TableRow>
                )}
                {entries.map((entry, i) => {
                    const rank = i + 1 + offset
                    const isMe = entry.id === me.id
                    return (
                        <TableRow key={entry.id} className={isMe ? 'bg-primary/5' : undefined}>
                            <TableCell><RankCell rank={rank} /></TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2.5">
                                    <Avatar size="sm">
                                        <AvatarImage src={entry.image ?? undefined} alt={entry.name ?? ''} />
                                        <AvatarFallback>{initials(entry.name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className={`truncate font-medium ${isMe ? 'text-primary' : ''}`}>
                                            {entry.name ?? 'Unnamed'}
                                            {isMe && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">{entry.regNo ?? ''}</p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={(entry.level ?? 0) >= 1 ? 'secondary' : 'outline'}>
                                    {roleLabel(entry.level)}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                                {entry.points ?? 0}
                            </TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>
    )

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <h1 className="font-heading text-2xl font-semibold tracking-tight">Leaderboard</h1>
                <p className="text-sm text-muted-foreground">
                    {canSeeBoth
                        ? 'Points for Junior and Senior Core members. Board, HR and Chair are exempt from tracking.'
                        : 'Points for Junior Core members.'}
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <Card size="sm">
                    <CardHeader>
                        <CardDescription>My points</CardDescription>
                        <CardTitle className="text-3xl tabular-nums">{myPoints}</CardTitle>
                    </CardHeader>
                </Card>
                <Card size="sm">
                    <CardHeader>
                        <CardDescription>My rank</CardDescription>
                        <CardTitle className="text-3xl tabular-nums">
                            {leaderboard.isLoading ? '—' : (myRank ?? '—')}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card size="sm">
                    <CardHeader>
                        <CardDescription>My role</CardDescription>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            {(me.accessLevel ?? 0) >= 2 ? <Crown className="size-5 text-primary" /> : <Trophy className="size-5 text-primary" />}
                            {roleLabel(me.accessLevel)}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Tabs defaultValue={canSeeBoth ? 'sc' : 'jc'}>
                {canSeeBoth && (
                    <TabsList>
                        <TabsTrigger value="sc">Senior Core</TabsTrigger>
                        <TabsTrigger value="jc">Junior Core</TabsTrigger>
                    </TabsList>
                )}
                <Card className={canSeeBoth ? 'mt-3' : undefined}>
                    <CardContent className="p-0">
                        {leaderboard.isLoading ? (
                            <div className="flex flex-col gap-3 p-4">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} className="h-12 w-full" />
                                ))}
                            </div>
                        ) : leaderboard.isError ? (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                Failed to load the leaderboard. Please refresh.
                            </div>
                        ) : (
                            <>
                                <TabsContent value="sc" className="m-0">
                                    {renderTable(sc)}
                                </TabsContent>
                                <TabsContent value="jc" className="m-0">
                                    {renderTable(jc)}
                                </TabsContent>
                            </>
                        )}
                    </CardContent>
                </Card>
            </Tabs>
        </div>
    )
}
