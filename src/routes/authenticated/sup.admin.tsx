import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/authenticated/sup/admin')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/authenticated/sup/admin"!</div>
}
