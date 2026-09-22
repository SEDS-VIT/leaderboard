import { db } from '#/db'
import { pointLog, reason, user } from '#/db/schema'
import { requireAccess, getSession } from '#/lib/auth.functions'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { and, ne, lt, eq } from 'drizzle-orm'

const changePoints = createServerFn({ method: 'POST' })
    .validator((data: { userId: string, reason: string, description: string, points: number }) => data)
    .handler(async ({ data }) => {
        const session = await getSession()
        const [targetLevel] = await db.select({ level: user.accessLevel }).from(user).where(eq(user.id, data.userId))
        if ((targetLevel?.level ?? 5) < (session?.user.accessLevel ?? 0)) {
            db.insert(pointLog).values({ fromUser: session?.user.id, toUser: data.userId, reason: data.reason, details: data.description, points: data.points, verified: null })
        }
    })

const getReason = createServerFn({ method: 'GET' })
    .handler(async () => {
        const result = await db.select({ reason: reason.reason, points: reason.points }).from(reason);
        return result;
    })



const getPoints = createServerFn({ method: 'GET' })
    .handler(async () => {
        const session = await getSession();
        if (session?.user.accessLevel ?? 0 >= 2) {
            const result = await db.select({ name: user.fullName, regNo: user.registrationNumber, points: user.points, level: user.accessLevel }).from(user).where(and(lt(user.accessLevel, 2), ne(user.accessLevel, -1)));
            return result
        } else {
            const result = await db.select({ name: user.fullName, regNo: user.registrationNumber, points: user.points, level: user.accessLevel }).from(user).where(and(lt(user.accessLevel, 1), ne(user.accessLevel, -1)));
            return result
        }
    })

export const Route = createFileRoute('/_protected/points')({
    beforeLoad: requireAccess(1),
    component: RouteComponent,
})

//TODO: Add/remove points frontend
function RouteComponent() {
    const queryClient = useQueryClient()
    const reasons = useQuery({
        queryKey: ['reasons'],
        queryFn: getReason,
    })
    const updatePoints = useMutation({
        mutationFn: changePoints,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['points'] })
        }
    })
    const points = useQuery({
        queryKey: ['points'],
        queryFn: getPoints
    })
    return <div>
        <div>

            {JSON.stringify(points.data)}
        </div>
        <div>
            {JSON.stringify(reasons)}
        </div>
    </div>
}
