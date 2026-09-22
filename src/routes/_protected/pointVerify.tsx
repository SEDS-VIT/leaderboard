import { db } from '#/db';
import { pointLog } from '#/db/schema';
import { getSession, requireAccess } from '#/lib/auth.functions'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start';
import { isNull } from 'drizzle-orm';

const updatePoints = createServerFn()
    .handler(async () => {
        return 1
    })

const getUnverifiedPoints = createServerFn({ method: 'GET' })
    .handler(async () => {
        //TODO: Check if the user access level is 0 or 1
        const result = db.select().from(pointLog).where(isNull(pointLog.verified));
        return result;
    })

export const Route = createFileRoute('/_protected/pointVerify')({
    beforeLoad: requireAccess(2),
    component: RouteComponent,
})

//TODO: Accept/Reject point additions/removal frontend
function RouteComponent() {
    const queryClient = useQueryClient();
    const unverifiedPoints = useQuery({
        queryKey: ['points'],
        queryFn: getUnverifiedPoints
    })
    const points = useMutation({
        mutationFn: updatePoints,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['points'] })
        }
    })
    return <div>
        {JSON.stringify(unverifiedPoints.data)}
    </div>
}
