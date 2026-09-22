# 🚀 SEDS VIT Leaderboard

The internal gamified point platform for the **SEDS VIT** chapter. Members earn (or lose)
points for their contributions, and a strict role hierarchy governs who can award, verify,
audit and override them — all wrapped in a dark, space-themed UI.

Built with **TanStack Start + React 19**, **Tailwind CSS v4 + shadcn/ui**, **better-auth**
(Google OAuth), **Drizzle ORM** and a **Turso (libSQL)** database.

---

## ✨ Features

- **Google sign-in**, restricted to `@vitstudent.ac.in` accounts
- **Leaderboard** with All / Senior Core / Junior Core views and rank medals
- **Point assignment & docking** with a predefined (but editable) reason list
- **Approval pipeline**: Senior Core proposals wait in a Board verification queue
- **Full audit ledger** for HR & Chair (who gave what to whom, and who approved it)
- **Member management**: roles, bans, and bulk JC → SC promotions
- **Chair console** with direct point overrides
- Dark, space-themed design: nebula palette, animated starfield, glassy panels

## 👥 Roles

| Level | Role        | Capabilities |
| ----- | ----------- | ------------ |
| `-1`  | Alumni      | Hidden from the platform |
| `0`   | Junior Core | View own points & breakdown; on the leaderboard |
| `1`   | Senior Core | Propose points for JC members (needs Board verification) |
| `2`   | Board       | Verify/approve the queue; award points to JC & SC immediately; exempt from the leaderboard |
| `3`   | HR          | Everything above + full ledger, member/role/ban management, reason management, bulk promotions |
| `4`   | Chair       | Everything above + direct point overrides from the Chair console |

Privacy rule: SC & JC members see **only their own** totals and breakdown — never who
assigned their points. HR & Chair see the complete ledger.

## 🔄 Point workflow

1. An SC (or higher) picks a member, a reason and a point value.
   Reasons from the dropdown are **suggestions** — the value is always editable, and
   "Other (custom)" allows a free-text reason.
2. If the actor is SC (`level 1`), the entry is stored as **Pending Verification**.
3. A Board member reviews the queue and approves or rejects it.
4. On approval the points are applied to the recipient and the ledger records
   `initiator → recipient → verifier` for the HR/Chair transparency view.
   Board/HR/Chair actions apply immediately.

## 🧰 Getting started

### Prerequisites

- Node.js 20+
- A [Turso](https://turso.tech) database
- A Google OAuth client (authorized redirect: `http://localhost:3000/api/auth/callback/google`)

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .exampleenv .env
```

| Variable                  | Purpose |
| ------------------------- | ------- |
| `VITE_TURSO_DATABASE_URL` | Turso database URL (`libsql://…`) |
| `VITE_TURSO_AUTH_TOKEN`   | Turso auth token |
| `BETTER_AUTH_SECRET`      | Session secret (use `npx auth secret`, 32+ chars) |
| `BETTER_AUTH_URL`         | App URL, e.g. `http://localhost:3000` |
| `GOOGLE_CLIENT_ID`        | Google OAuth client id |
| `GOOGLE_CLIENT_SECRET`    | Google OAuth client secret |

### 3. Create the schema

```bash
npx drizzle-kit push
```

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>. The **first Chair must be set manually** in the database
(`UPDATE user SET accessLevel = 4 WHERE email = '…'`); the Chair then assigns every
other role from **Manage → Users**.

## 📜 Scripts

| Command                 | Description |
| ----------------------- | ----------- |
| `npm run dev`           | Dev server on port 3000 |
| `npm run build`         | Production build (Nitro output in `.output/`) |
| `npm run preview`       | Preview the production build |
| `npm run generate-routes` | Regenerate the TanStack Router route tree |
| `npx drizzle-kit push`  | Sync the Drizzle schema to Turso |

## 🗂 Project structure

```
src/
├── components/
│   ├── app-shell.tsx        # Sidebar / mobile nav, role-gated links
│   ├── starfield.tsx        # Fixed nebula + star layers behind every page
│   └── ui/                  # shadcn/ui components (Base UI primitives)
├── db/
│   ├── index.ts             # Drizzle + Turso client
│   └── schema.ts            # user, point_log, reason, attendance + auth tables
├── lib/
│   ├── auth.ts              # better-auth server config (Google, domain check, hooks)
│   ├── auth-client.ts       # better-auth browser client
│   ├── auth.functions.ts    # getSession + requireAccess(minLevel) route guard
│   └── roles.ts             # Role levels, labels, helpers
└── routes/
    ├── __root.tsx           # HTML shell, dark mode, starfield, toaster
    ├── index.tsx            # Sign-in landing page
    ├── profile.tsx          # Own profile
    ├── banned.tsx           # Ban notice
    ├── api/auth/$.ts        # better-auth HTTP handler
    ├── _protected.tsx       # Auth guard + app shell layout
    └── _protected/
        ├── home.tsx         # Leaderboard
        ├── logs.tsx         # My points history
        ├── points.tsx       # Grant / dock points (SC+)
        ├── pointVerify.tsx  # Verification queue (Board+)
        ├── trueLogs.tsx     # Full audit ledger (HR+)
        ├── hrDashboard.tsx  # Members, roles, bans, reasons, JC→SC bulk promote (HR+)
        └── sudo.tsx         # Chair console (Chair)
```

## 🛠 Development notes

- **Server functions** (`createServerFn`) are the API layer — pages import them directly
  and call them through TanStack Query. Every function re-checks the session and
  `accessLevel` server-side; never trust the client.
- **Route guards**: `requireAccess(n)` in each route's `beforeLoad`, plus the
  `_protected` layout guard (session + ban check).
- **Theme**: all colors are CSS variables in `src/styles.css` (Tailwind v4, CSS-first).
  The app is dark-only (`class="dark"` on `<html>`); the starfield lives in
  `src/components/starfield.tsx`.
- **point_log.verified** is tri-state: `null` = pending, `true` = approved,
  `false` = rejected.
- **shadcn/ui**: add components with `npx shadcn@latest add <component>`
  (style `base-vega`, Base UI primitives — use `render={<X/>}` instead of `asChild`).

## 🚢 Production

```bash
npm run build
node .output/server/index.mjs
```

The build is a self-contained Nitro Node server — deploy `.output/` to any
Node-compatible host (Render, Fly.io, a VPS, …). See <https://v3.nitro.build/deploy>
for host-specific presets. Remember to set all environment variables (and a strong
`BETTER_AUTH_SECRET`) on the host.
