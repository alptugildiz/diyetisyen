# Diyetisyen Sitesi — Proje Planı & İlerleme

## Genel Mimari

- **Frontend:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · GSAP · NextAuth.js
- **Backend:** Node.js · Express · MongoDB (Mongoose)
- **Auth:** NextAuth.js CredentialsProvider → Backend JWT
- **Deploy:** VPS + Docker Compose + Nginx

## Klasör Yapısı

diyet/
├── frontend/ ← Next.js uygulaması
├── backend/ ← Express API
├── nginx/ ← Reverse proxy config
└── docker-compose.yml

---

## İlerleme Takibi

### Faz 1 — Backend Kurulumu

- [x] `backend/` klasörü oluştur, `npm init`
- [x] Bağımlılıklar: express, mongoose, jsonwebtoken, bcryptjs, cors, dotenv, zod
- [x] MongoDB şemaları: `Post`, `Faq`, `Admin`
- [x] REST endpoint'leri: `/api/posts`, `/api/faqs`, `/api/auth/login`
- [x] Admin CRUD endpoint'leri (JWT korumalı)
- [x] Middleware: helmet, rate-limit, JWT doğrulama
- [x] `GET /api/health` sağlık kontrolü

### Faz 2 — Frontend Kurulumu

- [x] `create-next-app` ile Next.js 14 kurulumu (TypeScript, ESLint, Tailwind)
- [x] GSAP + `@gsap/react` kurulumu
- [x] `useIsomorphicLayoutEffect` hook'u (SSR uyumluluğu)
- [x] GSAP ScrollTrigger global kayıt

### Faz 3 — Sayfalar

- [x] `app/page.tsx` — Anasayfa (Hero GSAP animasyonu, Hizmetler, Hakkımda, İletişim)
- [x] `app/blog/page.tsx` — Blog listesi (ISR, 60s revalidate)
- [x] `app/blog/[slug]/page.tsx` — Blog detay (generateStaticParams)
- [x] `app/sss/page.tsx` — SSS accordion (GSAP açılma animasyonu)

### Faz 4 — Admin Paneli

- [x] NextAuth.js kurulumu + CredentialsProvider
- [x] `middleware.ts` ile `/admin/*` rota koruması
- [x] `app/admin/login/page.tsx`
- [x] `app/admin/blog/page.tsx` — Blog listesi & yeni yazı
- [x] `app/admin/blog/[id]/page.tsx` — Düzenleme (Tiptap editör)
- [x] `app/admin/sss/page.tsx` — FAQ yönetimi

### Faz 5 — Deploy

- [x] `backend/.env` ve `frontend/.env.local` ayarları
- [x] `Dockerfile` — backend & frontend
- [x] `docker-compose.yml` — backend, frontend, mongo servisleri
- [x] `nginx/` reverse proxy konfigürasyonu
- [ ] SSL (Certbot / Let's Encrypt) — VPS'e kurulumda yapılacak
- [ ] VPS'e deploy & smoke test

---

## Ortam Değişkenleri

### backend/.env

MONGO_URI=
JWT_SECRET=
PORT=5000

### frontend/.env.local

NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:5000

---

## Önemli Kararlar

- CMS: Özel admin paneli (3. parti bağımlılık yok)
- Router: App Router (SEO için statik blog sayfaları)
- Editör: Tiptap (TypeScript-native, modern)
- Resim yükleme: Multer (VPS) → gerekirse Cloudinary'e geçiş
