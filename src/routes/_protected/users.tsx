import { requireAccess } from '#/lib/auth.functions'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/users')({
    beforeLoad: requireAccess(3),
    component: RouteComponent,
})

//TODO: Edit any details of each user
function RouteComponent() {
    return <div>Hello "/_protected/users"!</div>
}
