import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/banned')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>YOU SHALL NOT PASS</div>
}
