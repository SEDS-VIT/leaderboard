import { createFileRoute } from '@tanstack/react-router'
import { } from '@tanstack/react-query'


export const Route = createFileRoute('/_protected/logs')({
    component: RouteComponent
})

//TODO: show user point log
function RouteComponent() {
    return <div>Hello "/_protected/logs"!</div>
}
