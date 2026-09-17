import { requireAccess } from '#/lib/auth.functions'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/points')({
    beforeLoad: requireAccess(1),
    component: RouteComponent,
})

//TODO: Add/remove points
function RouteComponent() {
    return <div>Hello "/_protected/points"!</div>
}
