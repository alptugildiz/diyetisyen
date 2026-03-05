# CLAUDE.md — Project Instructions for Claude Code

## Project Overview

Dietitian website with Next.js frontend + Express backend + MongoDB. Turkish language UI.

## Architecture

- **Frontend:** `frontend/` — Next.js 14 (App Router), TypeScript, Tailwind CSS, GSAP animations, NextAuth v5
- **Backend:** `backend/` — Express, Mongoose, JWT auth, Zod validation
- **Deploy:** Docker Compose with 4 services: mongo, backend, frontend, nginx

## Key Conventions

### Backend (Express)

- Models go in `backend/src/models/` (Mongoose schemas, PascalCase filenames)
- Public routes: `backend/src/routes/` (e.g., `posts.js`, `faqs.js`)
- Admin routes: `backend/src/routes/admin/` (JWT-protected via `protect` middleware)
- Register all routes in `backend/src/app.js`
- Auth middleware: `backend/src/middleware/auth.js` — use `protect` for admin routes
- Validation: use Zod schemas
- API pattern: `GET /api/<resource>` (public), `POST/PUT/DELETE /api/admin/<resource>` (protected)

### Frontend (Next.js)

- All API calls go through `frontend/src/lib/api.ts` — use the `apiFetch` helper
- Types defined in `frontend/src/types/index.ts`
- Auth config: `frontend/src/auth.ts` (NextAuth v5 CredentialsProvider)
- Route protection: `frontend/src/proxy.ts` (protects `/admin/*`)
- Admin pages use route group: `app/admin/(panel)/` with shared sidebar layout
- Admin login is OUTSIDE the panel group: `app/admin/login/page.tsx`
- GSAP animations: use `useIsomorphicLayoutEffect` hook from `frontend/src/hooks/`
- Components: `frontend/src/components/`
- Providers: `frontend/src/providers/` (GsapProvider, NextAuthProvider)

### API URL Resolution

- SSR (server components): `http://backend:5000` (Docker internal network)
- Browser (client components): relative URLs like `/api/...` (nginx proxies to backend)
- Never use `NEXT_PUBLIC_API_URL` — it's deprecated in this project

### Styling

- Tailwind CSS only — no CSS modules or styled-components
- Color scheme: emerald green primary (`emerald-600`, `emerald-700`)
- UI language: Turkish

## Common Commands

```bash
# Development (Docker)
docker compose up -d --build
docker compose logs -f frontend
docker compose logs -f backend
docker compose down

# Seed admin user (first time only)
docker compose exec backend node src/scripts/seed-admin.js
# Default: admin@diyet.com / Admin1234!

# Development (manual, without Docker)
cd backend && npm run dev    # starts on :5000
cd frontend && npm run dev   # starts on :3000

# Health check
curl http://localhost:5000/api/health
```

## Adding a New Feature (checklist)

1. Create Mongoose model in `backend/src/models/`
2. Create public route in `backend/src/routes/`
3. Create admin CRUD route in `backend/src/routes/admin/` (use `protect` middleware)
4. Register routes in `backend/src/app.js`
5. Add TypeScript type in `frontend/src/types/index.ts`
6. Add API functions in `frontend/src/lib/api.ts`
7. Create frontend page/component

## Known Hardcoded Sections

These sections have static data in components instead of being fetched from the backend:
- `Services.tsx` — services list
- `About.tsx` — about text
- `Footer.tsx` — contact info (phone, email, address)
- `Navbar.tsx` — logo is text, not an image

## Important Notes

- Blog and FAQ are already fully dynamic (MongoDB + admin panel)
- Tools page (`/araclar/`) has 3 client-side calculators — formulas documented in `docs/hesaplama-yontemleri.md`
- Docker internal hostname for MongoDB: `mongo` (not `localhost`)
- Docker internal hostname for backend: `backend` (not `localhost`)
- `nginx/nginx.conf` routes: `/api/auth/*` → Next.js, `/api/*` → backend, everything else → frontend
