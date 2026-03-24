
## [21collective](https://21collective.co/) tarafından sevgi ile yapıldı ❤️

**21collective**, Istanbul ve Londra merkezli bir premium dijital ajans.

> *"Good design speaks. Our design flirts."*

Markaları geleceğe taşımak için modern teknoloji ve uzman bir ekiple dijital çözümler üretiyorlar:

- **Web Geliştirme** — Next.js ve React ile hızlı, ölçeklenebilir uygulamalar
- **Mobil Uygulama** — iOS ve Android için native geliştirme
- **Görsel Tasarım** — Marka kimliğine uygun, işlevsel tasarımlar
- **Yapay Zeka Çözümleri** — İş süreçlerini otomatikleştiren AI entegrasyonları

50+ tamamlanan proje · 30+ memnun müşteri · 8+ yıl deneyim

[21collective.co →](https://21collective.co/)

---
# Trakya Diyetisyen

Bir diyetisyen kliniği için geliştirilen modern, tam yığın web uygulaması. Blog yazıları, SSS yönetimi, admin paneli ve vücut analiz araçları içerir.

---

## Özellikler

- **Blog** — Admin panelinden yönetilebilen dinamik blog yazıları
- **SSS** — Sık sorulan soruları yönetmek için admin arayüzü
- **Admin Paneli** — JWT korumalı içerik yönetim sistemi
- **Hesaplama Araçları** — Kalori, antropometrik ölçüm ve vücut analizi hesaplayıcıları
- **SEO** — Yerel arama için optimize edilmiş (Trakya Diyetisyen)
- **Türkçe Arayüz** — Tamamen Türkçe kullanıcı deneyimi

---

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, GSAP |
| Auth | NextAuth v5 |
| Backend | Express.js, Mongoose, Zod |
| Veritabanı | MongoDB |
| Deploy | Docker Compose, Caddy |

---

## Başlarken

### Gereksinimler

- Docker & Docker Compose

### Kurulum

```bash
# Projeyi klonla
git clone <repo-url>
cd diyet

# Servisleri başlat
docker compose up -d --build

# İlk kez admin kullanıcısı oluştur
docker compose exec backend node src/scripts/seed-admin.js
# Varsayılan: admin@diyet.com / Admin1234!
```

Uygulama `http://localhost` adresinde çalışır.

### Manuel Geliştirme (Docker olmadan)

```bash
# Backend
cd backend && npm run dev    # :5000 portunda başlar

# Frontend
cd frontend && npm run dev   # :3000 portunda başlar
```

---

## Proje Yapısı

```
diyet/
├── frontend/          # Next.js uygulaması
│   └── src/
│       ├── app/       # Sayfa ve route'lar (App Router)
│       ├── components/
│       ├── lib/api.ts # Tüm API çağrıları burada
│       └── types/
├── backend/           # Express API
│   └── src/
│       ├── models/    # Mongoose şemaları
│       ├── routes/    # Public ve admin route'lar
│       └── middleware/
├── Caddyfile          # Reverse proxy yapılandırması
└── docker-compose.yml
```

---

## API Yapısı

- `GET /api/<kaynak>` — Herkese açık endpoint'ler
- `POST/PUT/DELETE /api/admin/<kaynak>` — JWT korumalı admin endpoint'ler


