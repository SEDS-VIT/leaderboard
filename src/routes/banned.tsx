import { createFileRoute, Link } from '@tanstack/react-router'
import { Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/banned')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="glass-panel w-full max-w-md border-border/60 text-center">
        <CardHeader className="items-center">
          <span className="mb-2 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Ban className="size-6" />
          </span>
          <CardTitle className="text-xl">You shall not pass</CardTitle>
          <CardDescription>
            Your account has been banned from the SEDS VIT Leaderboard. Contact the chapter
            leadership if you believe this is a mistake.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link to="/" />} variant="outline" className="w-full">
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
