import { requireAccess } from '#/lib/auth.functions'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/sudo')({
    beforeLoad: requireAccess(4),
    component: RouteComponent,
})

//TODO: Chair person access to literally everything
function RouteComponent() {
    return <div>Hello "/_protected/sudo"!</div>
}
