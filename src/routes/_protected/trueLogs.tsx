import { db } from '#/db';
import { pointLog, user } from '#/db/schema';
import { getSession, requireAccess } from '#/lib/auth.functions'
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start';
import { eq, gt } from 'drizzle-orm';

const getTrueLogs = createServerFn({ method: 'GET' })
    .handler(async () => {
        const session = await getSession();
        if ((session?.user.accessLevel ?? 0) < 3) {
            throw redirect({ to: '/home' })
        }
        const result = await db
            .select({ reason: pointLog.reason, points: pointLog.points, details: pointLog.details, verfied: pointLog.verified })
            .from(pointLog).leftJoin(user, eq(user.id, pointLog.toUser))
            .where(gt(user.accessLevel, -1));
        return result;
    })


export const Route = createFileRoute('/_protected/trueLogs')({
    beforeLoad: requireAccess(3),
    component: RouteComponent,
})

//TODO: See who all put points and edit each entry
function RouteComponent() {
    const logs = useQuery({
        queryKey: ['logs'],
        queryFn: getTrueLogs,
    })
    return <div>
        {JSON.stringify(logs.data)}
    </div>
}
