import { db } from '#/db';
import { reason, user } from '#/db/schema';
import { getSession, requireAccess } from '#/lib/auth.functions'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start';
import { asc, eq } from 'drizzle-orm';
import { useState } from 'react';
import { toast } from 'sonner';
import { Ban, ChevronsUp, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { initials, roleLabel, ROLE_OPTIONS } from '@/lib/roles';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type AdminUser = {
    id: string
    name: string
    fullName: string | null
    email: string
    image: string | null
    registrationNumber: string | null
    accessLevel: number | null
    points: number | null
    isBanned: boolean | null
}

export type UpdateUserDataInput = {
    id: string;
    fullName?: string | null;
    registrationNumber?: string | null;
    accessLevel?: number;
    isBanned?: boolean;
};

export type AdminReason = { id: string; reason: string; points: number }

type MutResult = { ok: true } | { ok: false; error: string }

export type PromoteResult = { ok: true; promoted: number } | { ok: false; error: string }

const getUserData = createServerFn({ method: 'GET' })
    .handler(async (): Promise<AdminUser[]> => {
        const session = await getSession()
        if ((session?.user.accessLevel ?? 0) < 3) return []
        return await db
            .select({
                id: user.id,
                name: user.name,
                fullName: user.fullName,
                email: user.email,
                image: user.image,
                registrationNumber: user.registrationNumber,
                accessLevel: user.accessLevel,
                points: user.points,
                isBanned: user.isBanned,
            })
            .from(user)
            .orderBy(asc(user.accessLevel), asc(user.fullName))
    })

const updateUserData = createServerFn({ method: 'POST' })
    .validator((data: UpdateUserDataInput) => data)
    .handler(async ({ data }): Promise<MutResult> => {
        try {
            const session = await getSession()
            if ((session?.user.accessLevel ?? 0) < 3) return { ok: false, error: 'Not authorized.' }

            const { id, ...rawUpdates } = data;
            const updates = Object.fromEntries(
                Object.entries(rawUpdates).filter(([, value]) => value !== undefined)
            );

            if (Object.keys(updates).length === 0) {
                return { ok: false, error: 'At least one field to update must be provided.' }
            }
            if (id === session?.user.id && 'accessLevel' in updates && updates.accessLevel !== session.user.accessLevel) {
                return { ok: false, error: 'You cannot change your own role.' }
            }

            await db.update(user).set({ ...updates, updatedAt: new Date() }).where(eq(user.id, id))
            return { ok: true }
        } catch {
            return { ok: false, error: 'Failed to update the user.' }
        }
    })

const promoteJuniorCore = createServerFn({ method: 'POST' })
    .handler(async (): Promise<PromoteResult> => {
        try {
            const session = await getSession()
            if ((session?.user.accessLevel ?? 0) < 3) return { ok: false, error: 'Not authorized.' }

            // Only JC -> SC is automated; SC -> Board, HR and Chair stay manual.
            const jcToSc = await db
                .update(user)
                .set({ accessLevel: 1, updatedAt: new Date() })
                .where(eq(user.accessLevel, 0))
                .returning({ id: user.id })

            return { ok: true, promoted: jcToSc.length }
        } catch {
            return { ok: false, error: 'Failed to promote members.' }
        }
    })

const getAdminReasons = createServerFn({ method: 'GET' })
    .handler(async (): Promise<AdminReason[]> => {
        const session = await getSession()
        if ((session?.user.accessLevel ?? 0) < 3) return []
        return await db.select({ id: reason.id, reason: reason.reason, points: reason.points }).from(reason).orderBy(asc(reason.reason))
    })

const createReason = createServerFn({ method: 'POST' })
    .validator((data: { reason: string; points: number }) => data)
    .handler(async ({ data }): Promise<MutResult> => {
        try {
            const session = await getSession()
            if ((session?.user.accessLevel ?? 0) < 3) return { ok: false, error: 'Not authorized.' }
            if (!data.reason.trim()) return { ok: false, error: 'Reason text is required.' }
            await db.insert(reason).values({ reason: data.reason.trim(), points: data.points })
            return { ok: true }
        } catch {
            return { ok: false, error: 'Failed to create the reason.' }
        }
    })

const updateReason = createServerFn({ method: 'POST' })
    .validator((data: { id: string; reason: string; points: number }) => data)
    .handler(async ({ data }): Promise<MutResult> => {
        try {
            const session = await getSession()
            if ((session?.user.accessLevel ?? 0) < 3) return { ok: false, error: 'Not authorized.' }
            await db.update(reason).set({ reason: data.reason.trim(), points: data.points }).where(eq(reason.id, data.id))
            return { ok: true }
        } catch {
            return { ok: false, error: 'Failed to update the reason.' }
        }
    })

const deleteReason = createServerFn({ method: 'POST' })
    .validator((data: { id: string }) => data)
    .handler(async ({ data }): Promise<MutResult> => {
        try {
            const session = await getSession()
            if ((session?.user.accessLevel ?? 0) < 3) return { ok: false, error: 'Not authorized.' }
            await db.delete(reason).where(eq(reason.id, data.id))
            return { ok: true }
        } catch {
            return { ok: false, error: 'Failed to delete the reason.' }
        }
    })

export const Route = createFileRoute('/_protected/hrDashboard')({
    beforeLoad: requireAccess(3),
    component: RouteComponent,
})

function EditUserDialog({
    target,
    open,
    onOpenChange,
}: {
    target: AdminUser | null
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const queryClient = useQueryClient()
    const [fullName, setFullName] = useState('')
    const [registrationNumber, setRegistrationNumber] = useState('')
    const [accessLevel, setAccessLevel] = useState<string>('0')
    const [banned, setBanned] = useState(false)
    const [loadedId, setLoadedId] = useState<string | null>(null)

    // Sync form when a new target is opened
    if (target && open && loadedId !== target.id) {
        setLoadedId(target.id)
        setFullName(target.fullName ?? '')
        setRegistrationNumber(target.registrationNumber ?? '')
        setAccessLevel(String(target.accessLevel ?? 0))
        setBanned(target.isBanned ?? false)
    }
    if (!open && loadedId !== null) {
        setLoadedId(null)
    }

    const save = useMutation({
        mutationFn: updateUserData,
        onSuccess: (result) => {
            if (!result.ok) {
                toast.error(result.error)
                return
            }
            toast.success('User updated')
            onOpenChange(false)
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
            queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
            queryClient.invalidateQueries({ queryKey: ['grantMembers'] })
        },
        onError: () => toast.error('Failed to update the user.'),
    })

    if (!target) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        save.mutate({
            data: {
                id: target.id,
                fullName: fullName.trim() || null,
                registrationNumber: registrationNumber.trim() || null,
                accessLevel: Number(accessLevel),
                isBanned: banned,
            },
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit member</DialogTitle>
                    <DialogDescription>{target.email}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="edit-name">Full name</Label>
                        <Input id="edit-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="edit-reg">Registration number</Label>
                        <Input id="edit-reg" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label>Role</Label>
                        <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as string)}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ROLE_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={String(opt.value)}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                        <div className="flex items-center gap-2 text-sm">
                            <Ban className="size-4 text-destructive" />
                            <div>
                                <p className="font-medium">Banned</p>
                                <p className="text-xs text-muted-foreground">Blocks sign-in access</p>
                            </div>
                        </div>
                        <Switch checked={banned} onCheckedChange={setBanned} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={save.isPending}>
                            {save.isPending ? 'Saving…' : 'Save changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function UsersTab() {
    const queryClient = useQueryClient()
    const users = useQuery({ queryKey: ['adminUsers'], queryFn: getUserData })
    const [search, setSearch] = useState('')
    const [editing, setEditing] = useState<AdminUser | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [promoteOpen, setPromoteOpen] = useState(false)

    const promote = useMutation({
        mutationFn: () => promoteJuniorCore(),
        onSuccess: (result) => {
            if (!result.ok) return toast.error(result.error)
            toast.success(`Promoted ${result.promoted} Junior Core member${result.promoted === 1 ? '' : 's'} to Senior Core`, {
                description: 'SC → Board and higher roles are still assigned individually.',
            })
            setPromoteOpen(false)
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
            queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
            queryClient.invalidateQueries({ queryKey: ['grantMembers'] })
        },
        onError: () => toast.error('Failed to promote members.'),
    })

    const q = search.trim().toLowerCase()
    const filtered = (users.data ?? []).filter(
        (u) =>
            q.length === 0 ||
            (u.fullName ?? u.name).toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            (u.registrationNumber ?? '').toLowerCase().includes(q),
    )

    return (
        <>
            <div className="flex items-center gap-2">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search members…"
                        className="pl-8"
                    />
                </div>
                <Button variant="outline" className="ml-auto shrink-0" onClick={() => setPromoteOpen(true)}>
                    <ChevronsUp />
                    Promote juniors
                </Button>
            </div>

            {users.isLoading ? (
                <div className="flex flex-col gap-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                    ))}
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Member</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Points</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map((u) => {
                            const displayName = u.fullName ?? u.name
                            return (
                                <TableRow key={u.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2.5">
                                            <Avatar size="sm">
                                                <AvatarImage src={u.image ?? undefined} alt={displayName} />
                                                <AvatarFallback>{initials(displayName)}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">{displayName}</p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {u.registrationNumber ?? '—'}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={(u.accessLevel ?? 0) >= 2 ? 'default' : (u.accessLevel ?? 0) === 1 ? 'secondary' : 'outline'}>
                                            {roleLabel(u.accessLevel)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">{u.points ?? 0}</TableCell>
                                    <TableCell>
                                        {u.isBanned ? (
                                            <Badge variant="destructive">Banned</Badge>
                                        ) : (
                                            <Badge variant="outline">Active</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="xs"
                                            variant="outline"
                                            onClick={() => {
                                                setEditing(u)
                                                setDialogOpen(true)
                                            }}
                                        >
                                            <Pencil className="size-3" />
                                            Edit
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                        {filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No members match your search.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            )}

            <EditUserDialog target={editing} open={dialogOpen} onOpenChange={setDialogOpen} />

            <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Promote all Junior Core members?</DialogTitle>
                        <DialogDescription>
                            Every Junior Core member becomes Senior Core. Senior Core → Board,
                            HR and Chair must still be assigned individually.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setPromoteOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="button" disabled={promote.isPending} onClick={() => promote.mutate()}>
                            {promote.isPending ? 'Promoting…' : <><ChevronsUp />Promote Junior Core</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

function ReasonsTab() {
    const queryClient = useQueryClient()
    const reasons = useQuery({ queryKey: ['adminReasons'], queryFn: getAdminReasons })
    const [newReason, setNewReason] = useState('')
    const [newPoints, setNewPoints] = useState('')
    const [editing, setEditing] = useState<AdminReason | null>(null)
    const [editOpen, setEditOpen] = useState(false)

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['adminReasons'] })
        queryClient.invalidateQueries({ queryKey: ['reasons'] })
    }

    const createMut = useMutation({
        mutationFn: createReason,
        onSuccess: (result) => {
            if (!result.ok) return toast.error(result.error)
            toast.success('Reason added')
            setNewReason('')
            setNewPoints('')
            invalidate()
        },
        onError: () => toast.error('Failed to add the reason.'),
    })

    const updateMut = useMutation({
        mutationFn: updateReason,
        onSuccess: (result) => {
            if (!result.ok) return toast.error(result.error)
            toast.success('Reason updated')
            setEditOpen(false)
            invalidate()
        },
        onError: () => toast.error('Failed to update the reason.'),
    })

    const deleteMut = useMutation({
        mutationFn: deleteReason,
        onSuccess: (result) => {
            if (!result.ok) return toast.error(result.error)
            toast.success('Reason removed')
            invalidate()
        },
        onError: () => toast.error('Failed to delete the reason.'),
    })

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault()
        const pts = Number(newPoints)
        if (!newReason.trim() || !Number.isFinite(pts)) {
            toast.error('Enter a reason and a point value.')
            return
        }
        createMut.mutate({ data: { reason: newReason, points: pts } })
    }

    return (
        <>
            <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-2">
                    <Label htmlFor="new-reason">New reason</Label>
                    <Input
                        id="new-reason"
                        value={newReason}
                        onChange={(e) => setNewReason(e.target.value)}
                        placeholder="e.g. Workshop delivery"
                    />
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-32">
                    <Label htmlFor="new-points">Points</Label>
                    <Input
                        id="new-points"
                        type="number"
                        value={newPoints}
                        onChange={(e) => setNewPoints(e.target.value)}
                        placeholder="10"
                    />
                </div>
                <Button type="submit" disabled={createMut.isPending} className="sm:w-auto">
                    <Plus />
                    Add reason
                </Button>
            </form>

            {reasons.isLoading ? (
                <div className="flex flex-col gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                    ))}
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Reason</TableHead>
                            <TableHead className="text-right">Points</TableHead>
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(reasons.data ?? []).map((r) => (
                            <TableRow key={r.id}>
                                <TableCell className="font-medium">{r.reason}</TableCell>
                                <TableCell className="text-right tabular-nums">{r.points}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1.5">
                                        <Button
                                            size="xs"
                                            variant="outline"
                                            onClick={() => {
                                                setEditing(r)
                                                setEditOpen(true)
                                            }}
                                        >
                                            <Pencil className="size-3" />
                                            Edit
                                        </Button>
                                        <Button
                                            size="xs"
                                            variant="destructive"
                                            disabled={deleteMut.isPending}
                                            onClick={() => deleteMut.mutate({ data: { id: r.id } })}
                                        >
                                            <Trash2 className="size-3" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {(reasons.data ?? []).length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                    No reasons defined yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            )}

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit reason</DialogTitle>
                        <DialogDescription>Changes affect future point assignments.</DialogDescription>
                    </DialogHeader>
                    <form
                        className="flex flex-col gap-4"
                        onSubmit={(e) => {
                            e.preventDefault()
                            if (!editing) return
                            updateMut.mutate({ data: editing })
                        }}
                    >
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="edit-reason">Reason</Label>
                            <Input
                                id="edit-reason"
                                value={editing?.reason ?? ''}
                                onChange={(e) => setEditing((prev) => (prev ? { ...prev, reason: e.target.value } : prev))}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="edit-points">Points</Label>
                            <Input
                                id="edit-points"
                                type="number"
                                value={editing?.points ?? 0}
                                onChange={(e) =>
                                    setEditing((prev) => (prev ? { ...prev, points: Number(e.target.value) } : prev))
                                }
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateMut.isPending}>
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}

function RouteComponent() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <h1 className="font-heading text-2xl font-semibold tracking-tight">Manage</h1>
                <p className="text-sm text-muted-foreground">
                    User roles, bans, and the default list of point reasons.
                </p>
            </div>

            <Tabs defaultValue="users">
                <TabsList>
                    <TabsTrigger value="users">
                        <Users />
                        Users
                    </TabsTrigger>
                    <TabsTrigger value="reasons">
                        <Plus />
                        Reasons
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="users">
                    <Card>
                        <CardHeader>
                            <CardTitle>Members</CardTitle>
                            <CardDescription>
                                Assign chapter roles (JC, SC, Board, HR, Chair) and manage bans.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <UsersTab />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="reasons">
                    <Card>
                        <CardHeader>
                            <CardTitle>Point reasons</CardTitle>
                            <CardDescription>
                                The predefined dropdown used when assigning or docking points.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <ReasonsTab />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
