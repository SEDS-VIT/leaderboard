export type SessionUser = {
  id: string
  name: string
  email: string
  image?: string | null
  fullName?: string | null
  registrationNumber?: string | null
  accessLevel?: number | null
  points?: number | null
  isBanned?: boolean | null
}

export const ROLE_LABELS: Record<number, string> = {
  [-1]: "Alumni",
  0: "Junior Core",
  1: "Senior Core",
  2: "Board",
  3: "HR",
  4: "Chair",
}

export const ROLE_OPTIONS = [
  { value: -1, label: "Alumni (hidden)" },
  { value: 0, label: "Junior Core" },
  { value: 1, label: "Senior Core" },
  { value: 2, label: "Board" },
  { value: 3, label: "HR" },
  { value: 4, label: "Chair" },
] as const

export function roleLabel(level: number | null | undefined): string {
  return ROLE_LABELS[level ?? 0] ?? `Level ${level}`
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export function formatPoints(points: number): string {
  return points > 0 ? `+${points}` : `${points}`
}
