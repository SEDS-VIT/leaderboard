import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start';
import { db } from '#/db';
import { getSession, requireAccess } from '#/lib/auth.functions';
import { pointLog } from '#/db/schema';
import { eq } from 'drizzle-orm';

const getLogs = createServerFn({ method: 'GET' })
    .handler(async () => {
        const session = await getSession()
        const result = await db.select({ reason: pointLog.reason, points: pointLog.points, details: pointLog.details, verfied: pointLog.verified }).from(pointLog).where(eq(pointLog.toUser, session?.user.id ?? ""));
        return result;
    })

export const Route = createFileRoute('/_protected/logs')({
    beforeLoad: requireAccess(0),
    component: RouteComponent
})

//TODO: show user point log
function RouteComponent() {
    const logs = useQuery({
        queryKey: ['logs'],
        queryFn: getLogs
    })
    return <div>
        {JSON.stringify(logs.data)}
    </div>
}
