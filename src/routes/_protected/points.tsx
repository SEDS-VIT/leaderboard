import { db } from '#/db'
import { pointLog, reason, user } from '#/db/schema'
import { requireAccess, getSession } from '#/lib/auth.functions'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { and, ne, lt, eq, sql, asc } from 'drizzle-orm'
import { useState } from 'react'
import { toast } from 'sonner'
import { CircleCheck, Info, Send } from 'lucide-react'
import { initials, roleLabel } from '@/lib/roles'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type ChangePointsResult =
    | { ok: true; pending: boolean }
    | { ok: false; error: string }

const changePoints = createServerFn({ method: 'POST' })
    .validator((data: { userId: string, reason: string, description: string, points: number }) => data)
    .handler(async ({ data }): Promise<ChangePointsResult> => {
        try {
            const session = await getSession()
            if (!session) return { ok: false, error: 'Not signed in.' }
            const actorLevel = session.user.accessLevel ?? 0
            if (actorLevel < 1) return { ok: false, error: 'You are not allowed to assign points.' }
            if (data.userId === session.user.id) return { ok: false, error: 'You cannot change your own points.' }
            if (!Number.isFinite(data.points) || data.points === 0) return { ok: false, error: 'Points must be a non-zero number.' }

            const [target] = await db.select({ level: user.accessLevel }).from(user).where(eq(user.id, data.userId))
            if (!target) return { ok: false, error: 'Member not found.' }
            if ((target.level ?? 5) >= actorLevel) return { ok: false, error: 'You cannot modify a member at or above your level.' }

            // Board, HR and Chair actions apply immediately; SC proposals await Board verification.
            const immediate = actorLevel >= 2
            await db.insert(pointLog).values({
                fromUser: session.user.id,
                toUser: data.userId,
                reason: data.reason,
                details: data.description,
                points: data.points,
                verified: immediate ? true : null,
            })
            if (immediate) {
                await db.update(user)
                    .set({ points: sql`${user.points} + ${data.points}` })
                    .where(eq(user.id, data.userId))
            }
            return { ok: true, pending: !immediate }
        } catch {
            return { ok: false, error: 'Something went wrong. Please try again.' }
        }
    })

const getReason = createServerFn({ method: 'GET' })
    .handler(async () => {
        const result = await db.select({ reason: reason.reason, points: reason.points }).from(reason).orderBy(asc(reason.reason));
        return result;
    })

const getMembers = createServerFn({ method: 'GET' })
    .handler(async () => {
        const session = await getSession();
        const level = session?.user.accessLevel ?? 0
        const maxLevel = level >= 2 ? 2 : 1
        const result = await db
            .select({
                id: user.id,
                name: user.fullName,
                regNo: user.registrationNumber,
                image: user.image,
                points: user.points,
                level: user.accessLevel,
            })
            .from(user)
            .where(and(lt(user.accessLevel, maxLevel), ne(user.accessLevel, -1), ne(user.id, session?.user.id ?? '')))
            .orderBy(asc(user.fullName))
        return result
    })

export const Route = createFileRoute('/_protected/points')({
    beforeLoad: requireAccess(1),
    component: RouteComponent,
})

const OTHER = 'Other'

function RouteComponent() {
    const { user: me } = Route.useRouteContext()
    const queryClient = useQueryClient()
    const actorLevel = me.accessLevel ?? 1

    const reasons = useQuery({ queryKey: ['reasons'], queryFn: getReason })
    const members = useQuery({ queryKey: ['grantMembers'], queryFn: getMembers })

    const [action, setAction] = useState<'add' | 'dock'>('add')
    const [memberId, setMemberId] = useState<string | null>(null)
    const [reasonValue, setReasonValue] = useState<string | null>(null)
    const [customReason, setCustomReason] = useState('')
    const [pointsInput, setPointsInput] = useState('')
    const [details, setDetails] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const submit = useMutation({
        mutationFn: changePoints,
        onSuccess: (result) => {
            if (!result.ok) {
                toast.error(result.error)
                return
            }
            if (result.pending) {
                toast.success('Submitted for Board verification', {
                    description: 'The points will apply once a Board member approves them.',
                })
            } else {
                toast.success('Points applied immediately')
            }
            setMemberId(null)
            setReasonValue(null)
            setCustomReason('')
            setPointsInput('')
            setDetails('')
            setAction('add')
            queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
            queryClient.invalidateQueries({ queryKey: ['grantMembers'] })
            queryClient.invalidateQueries({ queryKey: ['myLogs'] })
            queryClient.invalidateQueries({ queryKey: ['verifyQueue'] })
        },
        onError: () => toast.error('Something went wrong. Please try again.'),
    })

    const reasonList = reasons.data ?? []
    const isOther = reasonValue === OTHER
    const selectedReason = reasonList.find((r) => r.reason === reasonValue)
    const magnitude = Number(pointsInput)
    const signedPoints = action === 'add' ? magnitude : -magnitude

    const canSubmit =
        !!memberId && !!reasonValue && pointsInput.trim() !== '' &&
        Number.isFinite(magnitude) && magnitude !== 0 &&
        (!isOther || customReason.trim().length > 0)

    const handleReasonChange = (value: string | null) => {
        setReasonValue(value)
        if (!value) return
        if (value === OTHER) {
            setPointsInput('')
        } else {
            const suggested = reasonList.find((r) => r.reason === value)?.points ?? 0
            setPointsInput(String(Math.abs(suggested)))
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSubmit || !memberId || !reasonValue) return
        setSubmitting(true)
        submit.mutate(
            {
                data: {
                    userId: memberId,
                    reason: isOther ? `Other: ${customReason.trim()}` : reasonValue,
                    description: details.trim() || (isOther ? customReason.trim() : ''),
                    points: signedPoints,
                },
            },
            { onSettled: () => setSubmitting(false) },
        )
    }

    const selectedMember = members.data?.find((m) => m.id === memberId)

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <h1 className="font-heading text-2xl font-semibold tracking-tight">Grant Points</h1>
                <p className="text-sm text-muted-foreground">
                    Reward or dock points. Predefined reasons are suggestions — the value is always editable.
                </p>
            </div>

            <Alert>
                <Info />
                <AlertTitle>
                    {actorLevel >= 2 ? 'Applied immediately' : 'Requires Board verification'}
                </AlertTitle>
                <AlertDescription>
                    {actorLevel >= 2
                        ? 'As Board/HR/Chair your changes take effect right away and are recorded in the ledger.'
                        : 'Your requests are queued as Pending Verification and only apply after a Board member approves them.'}
                </AlertDescription>
            </Alert>

            <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle>Assign points</CardTitle>
                        <CardDescription>Pick a member and a reason, then adjust the points if needed.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <Label>Action</Label>
                                <Tabs value={action} onValueChange={(v) => setAction(v as 'add' | 'dock')}>
                                    <TabsList className="w-full">
                                        <TabsTrigger value="add" className="flex-1">Add points</TabsTrigger>
                                        <TabsTrigger value="dock" className="flex-1">Dock points</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label htmlFor="member">Member</Label>
                                <Select value={memberId} onValueChange={(v) => setMemberId(v as string | null)}>
                                    <SelectTrigger className="w-full" id="member">
                                        <SelectValue placeholder="Select a member" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {members.isLoading && <SelectItem value="__loading" disabled>Loading…</SelectItem>}
                                        {(members.data ?? []).map((m) => (
                                            <SelectItem key={m.id} value={m.id}>
                                                {m.name ?? 'Unnamed'} · {roleLabel(m.level)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label htmlFor="reason">Reason</Label>
                                <Select value={reasonValue} onValueChange={(v) => handleReasonChange(v as string | null)}>
                                    <SelectTrigger className="w-full" id="reason">
                                        <SelectValue placeholder="Select a reason" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {reasons.isLoading && <SelectItem value="__loading" disabled>Loading…</SelectItem>}
                                        {(reasons.data ?? []).map((r) => (
                                            <SelectItem key={r.reason} value={r.reason}>
                                                {r.reason} ({r.points > 0 ? '+' : ''}{r.points})
                                            </SelectItem>
                                        ))}
                                        <SelectItem value={OTHER}>Other (custom)</SelectItem>
                                    </SelectContent>
                                </Select>
                                {selectedReason && (
                                    <p className="text-xs text-muted-foreground">
                                        The suggested value is prefilled below — feel free to adjust it.
                                    </p>
                                )}
                            </div>

                            {isOther && (
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="custom-reason">Custom reason *</Label>
                                    <Input
                                        id="custom-reason"
                                        value={customReason}
                                        onChange={(e) => setCustomReason(e.target.value)}
                                        placeholder="Describe the context"
                                        required
                                    />
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                <Label htmlFor="points">Points *</Label>
                                <Input
                                    id="points"
                                    type="number"
                                    min={1}
                                    value={pointsInput}
                                    onChange={(e) => setPointsInput(e.target.value)}
                                    placeholder="e.g. 10"
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label htmlFor="details">Details (optional)</Label>
                                <Textarea
                                    id="details"
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    placeholder="Any extra context for the verifier…"
                                    rows={3}
                                />
                            </div>

                            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5 text-sm">
                                <span className="text-muted-foreground">This will {action}</span>
                                <span className={`font-semibold tabular-nums ${signedPoints < 0 ? 'text-destructive' : 'text-primary'}`}>
                                    {signedPoints > 0 ? '+' : ''}{Number.isFinite(signedPoints) ? signedPoints : 0} pts
                                </span>
                            </div>

                            <Button type="submit" disabled={!canSubmit || submitting}>
                                {submitting ? 'Submitting…' : <><Send />{actorLevel >= 2 ? 'Apply now' : 'Submit for verification'}</>}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Eligible members</CardTitle>
                        <CardDescription>
                            {actorLevel >= 2
                                ? 'Junior Core and Senior Core members you can incentivize.'
                                : 'Junior Core members you can propose points for.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {members.isLoading ? (
                            <div className="flex flex-col gap-3 p-4">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} className="h-10 w-full" />
                                ))}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Member</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead className="text-right">Points</TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(members.data ?? []).map((m) => (
                                        <TableRow key={m.id} className={m.id === memberId ? 'bg-primary/5' : undefined}>
                                            <TableCell>
                                                <div className="flex items-center gap-2.5">
                                                    <Avatar size="sm">
                                                        <AvatarImage src={m.image ?? undefined} alt={m.name ?? ''} />
                                                        <AvatarFallback>{initials(m.name)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium">{m.name ?? 'Unnamed'}</p>
                                                        <p className="truncate text-xs text-muted-foreground">{m.regNo ?? ''}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={(m.level ?? 0) >= 1 ? 'secondary' : 'outline'}>
                                                    {roleLabel(m.level)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">{m.points ?? 0}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="xs"
                                                    variant={m.id === memberId ? 'default' : 'outline'}
                                                    onClick={() => setMemberId(m.id)}
                                                >
                                                    {m.id === memberId ? <><CircleCheck className="size-3" />Selected</> : 'Select'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(members.data ?? []).length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                No eligible members.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {selectedMember && (
                <p className="text-sm text-muted-foreground">
                    Selected: <span className="font-medium text-foreground">{selectedMember.name}</span>
                    {' · '}{selectedMember.regNo}
                </p>
            )}
        </div>
    )
}
