import { requireAccess } from '#/lib/auth.functions'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/pointVerify')({
    beforeLoad: async () => {
        requireAccess(2);
        return 
    },
    loader: async () => {
        
    },
    component: RouteComponent,
})

//TODO: Accept/Reject point additions/removal
function RouteComponent() {
    return <div>Hello "/_protected/pointVerify"!</div>
}
