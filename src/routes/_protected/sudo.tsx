import { db } from '#/db';
import { pointLog, user } from '#/db/schema';
import { getSession, requireAccess } from '#/lib/auth.functions'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start';
import { and, asc, eq, lt, ne, sql } from 'drizzle-orm';
import { useState } from 'react';
import { toast } from 'sonner';
import { BookOpen, Crown, ShieldCheck, SlidersHorizontal, Users } from 'lucide-react';
import { initials, roleLabel } from '@/lib/roles';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type OverrideResult = { ok: true } | { ok: false; error: string }

const getSudoMembers = createServerFn({ method: 'GET' })
    .handler(async () => {
        const session = await getSession()
        if (!session || (session.user.accessLevel ?? 0) < 4) return []
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
            .where(and(lt(user.accessLevel, 4), ne(user.accessLevel, -1), ne(user.id, session.user.id)))
            .orderBy(asc(user.accessLevel), asc(user.fullName))
    })

const overridePoints = createServerFn({ method: 'POST' })
    .validator((data: { userId: string; points: number; reason: string; details: string }) => data)
    .handler(async ({ data }): Promise<OverrideResult> => {
        try {
            const session = await getSession()
            if (!session || (session.user.accessLevel ?? 0) < 4) return { ok: false, error: 'Chair access required.' }
            if (!Number.isFinite(data.points) || data.points === 0) return { ok: false, error: 'Points must be a non-zero number.' }
            if (!data.reason.trim()) return { ok: false, error: 'A reason is required for the audit trail.' }

            const [target] = await db.select({ level: user.accessLevel }).from(user).where(eq(user.id, data.userId))
            if (!target) return { ok: false, error: 'Member not found.' }
            if ((target.level ?? -2) >= 4) return { ok: false, error: 'Cannot override another Chair.' }

            await db.insert(pointLog).values({
                fromUser: session.user.id,
                toUser: data.userId,
                reason: `Chair override: ${data.reason.trim()}`,
                details: data.details.trim(),
                points: data.points,
                verified: true,
            })
            await db.update(user)
                .set({ points: sql`${user.points} + ${data.points}` })
                .where(eq(user.id, data.userId))
            return { ok: true }
        } catch {
            return { ok: false, error: 'Something went wrong. Please try again.' }
        }
    })

export const Route = createFileRoute('/_protected/sudo')({
    beforeLoad: requireAccess(4),
    component: RouteComponent,
})

function RouteComponent() {
    const queryClient = useQueryClient()
    const members = useQuery({ queryKey: ['sudoMembers'], queryFn: getSudoMembers })

    const [action, setAction] = useState<'add' | 'dock'>('add')
    const [memberId, setMemberId] = useState<string | null>(null)
    const [points, setPoints] = useState('')
    const [reasonText, setReasonText] = useState('')
    const [details, setDetails] = useState('')

    const override = useMutation({
        mutationFn: overridePoints,
        onSuccess: (result) => {
            if (!result.ok) {
                toast.error(result.error)
                return
            }
            toast.success('Override applied', {
                description: 'The ledger has been updated immediately.',
            })
            setMemberId(null)
            setPoints('')
            setReasonText('')
            setDetails('')
            setAction('add')
            queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
            queryClient.invalidateQueries({ queryKey: ['sudoMembers'] })
            queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
        },
        onError: () => toast.error('Something went wrong. Please try again.'),
    })

    const magnitude = Number(points)
    const signed = action === 'add' ? magnitude : -magnitude
    const canSubmit = !!memberId && Number.isFinite(signed) && signed !== 0 && reasonText.trim().length > 0

    const selected = members.data?.find((m) => m.id === memberId)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSubmit || !memberId) return
        override.mutate({
            data: {
                userId: memberId,
                points: signed,
                reason: reasonText.trim(),
                details: details.trim(),
            },
        })
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <h1 className="font-heading text-2xl font-semibold tracking-tight">Chair Console</h1>
                <p className="text-sm text-muted-foreground">
                    Full authority — correct discrepancies and override leaderboard positions.
                </p>
            </div>

            <Alert>
                <Crown />
                <AlertTitle>Immediate effect</AlertTitle>
                <AlertDescription>
                    Overrides skip the verification pipeline and are recorded as approved entries
                    initiated by you.
                </AlertDescription>
            </Alert>

            <div className="grid gap-4 sm:grid-cols-3">
                <Link to="/hrDashboard" className="rounded-xl transition-colors hover:bg-muted/50">
                    <Card size="sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Users className="size-4 text-primary" />
                                Manage users & roles
                            </CardTitle>
                            <CardDescription>Assign Board members, ban users, edit reasons.</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
                <Link to="/trueLogs" className="rounded-xl transition-colors hover:bg-muted/50">
                    <Card size="sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <BookOpen className="size-4 text-primary" />
                                Full ledger
                            </CardTitle>
                            <CardDescription>Every point change with initiator and status.</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
                <Link to="/pointVerify" className="rounded-xl transition-colors hover:bg-muted/50">
                    <Card size="sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <ShieldCheck className="size-4 text-primary" />
                                Verification queue
                            </CardTitle>
                            <CardDescription>Review pending SC proposals.</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
            </div>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <SlidersHorizontal className="size-5 text-primary" />
                        Direct point override
                    </CardTitle>
                    <CardDescription>
                        Add or dock points for any Junior Core or Senior Core member.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant={action === 'add' ? 'default' : 'outline'}
                                onClick={() => setAction('add')}
                                className="flex-1"
                            >
                                Add
                            </Button>
                            <Button
                                type="button"
                                variant={action === 'dock' ? 'destructive' : 'outline'}
                                onClick={() => setAction('dock')}
                                className="flex-1"
                            >
                                Dock
                            </Button>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label>Member</Label>
                            <Select value={memberId} onValueChange={(v) => setMemberId(v as string | null)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a member" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(members.data ?? []).map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.name ?? 'Unnamed'} · {roleLabel(m.level)} · {m.points ?? 0} pts
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selected && (
                                <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                                    <Avatar size="sm">
                                        <AvatarImage src={selected.image ?? undefined} alt={selected.name ?? ''} />
                                        <AvatarFallback>{initials(selected.name)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{selected.name}</span>
                                    <Badge variant={(selected.level ?? 0) >= 1 ? 'secondary' : 'outline'} className="ml-auto">
                                        {roleLabel(selected.level)}
                                    </Badge>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="override-points">Points (magnitude)</Label>
                            <Input
                                id="override-points"
                                type="number"
                                min={1}
                                value={points}
                                onChange={(e) => setPoints(e.target.value)}
                                placeholder="e.g. 15"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="override-reason">Reason *</Label>
                            <Input
                                id="override-reason"
                                value={reasonText}
                                onChange={(e) => setReasonText(e.target.value)}
                                placeholder="e.g. Correcting missed entry from last week"
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="override-details">Notes (optional)</Label>
                            <Textarea
                                id="override-details"
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                rows={3}
                                placeholder="Additional context for the audit trail…"
                            />
                        </div>

                        <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5 text-sm">
                            <span className="text-muted-foreground">This will {action}</span>
                            <span className={`font-semibold tabular-nums ${signed < 0 ? 'text-destructive' : 'text-primary'}`}>
                                {signed > 0 ? '+' : ''}{Number.isFinite(signed) ? signed : 0} pts
                            </span>
                        </div>

                        <Button type="submit" disabled={!canSubmit || override.isPending}>
                            {override.isPending ? 'Applying…' : 'Apply override'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
