import type { ReactNode } from "react"
import { Link, useRouter } from "@tanstack/react-router"
import {
  BookOpen,
  CirclePlus,
  Crown,
  LogOut,
  Rocket,
  ScrollText,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { initials, roleLabel, type SessionUser } from "@/lib/roles"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const NAV_ITEMS = [
  { to: "/home", label: "Leaderboard", icon: Trophy, minLevel: 0 },
  { to: "/logs", label: "My Points", icon: ScrollText, minLevel: 0 },
  { to: "/points", label: "Grant Points", icon: CirclePlus, minLevel: 1 },
  { to: "/pointVerify", label: "Verification Queue", icon: ShieldCheck, minLevel: 2 },
  { to: "/trueLogs", label: "Full Ledger", icon: BookOpen, minLevel: 3 },
  { to: "/hrDashboard", label: "Manage", icon: Users, minLevel: 3 },
  { to: "/sudo", label: "Chair Console", icon: Crown, minLevel: 4 },
] as const

const navBaseClass =
  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
const navActiveClass =
  "bg-sidebar-accent font-medium text-sidebar-accent-foreground"

function Brand() {
  return (
    <Link to="/home" className="flex items-center gap-2.5 px-2.5 py-1.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-chart-2 text-primary-foreground shadow-[0_0_18px_oklch(0.68_0.16_293/0.45)]">
        <Rocket className="size-4" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-heading text-sm font-semibold tracking-wide">SEDS VIT</span>
        <span className="text-xs text-muted-foreground">Mission Leaderboard</span>
      </span>
    </Link>
  )
}

function NavLinks({ user, onNavigate }: { user: SessionUser; onNavigate?: () => void }) {
  const level = user.accessLevel ?? 0
  return (
    <>
      {NAV_ITEMS.filter((item) => level >= item.minLevel).map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          activeProps={{ className: navActiveClass }}
          className={navBaseClass}
        >
          <item.icon className="size-4 shrink-0" />
          {item.label}
        </Link>
      ))}
    </>
  )
}

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const router = useRouter()
  const level = user.accessLevel ?? 0
  const displayName = user.fullName ?? user.name

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.navigate({ to: "/" })
        },
      },
    })
  }

  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/70 backdrop-blur-xl md:flex">
        <div className="border-b border-sidebar-border px-3 py-3">
          <Brand />
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          <p className="px-2.5 pb-1 pt-2 text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Mission Menu
          </p>
          <NavLinks user={user} />
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 rounded-lg bg-sidebar-accent/60 p-2.5">
            <Avatar>
              <AvatarImage src={user.image ?? undefined} alt={displayName} />
              <AvatarFallback>{initials(displayName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{roleLabel(level)}</p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={handleLogout} title="Sign out">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b bg-background/70 px-4 backdrop-blur-xl md:hidden">
          <Brand />
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" />
                }
              >
                Menu
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <NavLinks user={user} />
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-sm" />
                }
                aria-label="Account"
              >
                <Avatar size="sm">
                  <AvatarImage src={user.image ?? undefined} alt={displayName} />
                  <AvatarFallback>{initials(displayName)}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <span className="block truncate text-sm text-foreground">{displayName}</span>
                  <span className="block truncate text-xs">{user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link to="/profile" />}>Profile</DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
