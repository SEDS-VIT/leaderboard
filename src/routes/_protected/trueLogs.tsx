import { requireAccess } from '#/lib/auth.functions'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/trueLogs')({
    beforeLoad: requireAccess(3),
    component: RouteComponent,
})

//TODO: See who all put points and edit each entry
function RouteComponent() {
    return <div>Hello "/_protected/trueLogs"!</div>
}
