# Diyetisyen Sitesi — Yapılanlar & Rehber

Bu belge projeyi ilk kez gören biri (veya ilerleyen haftalarda siz) için:
neyin nerede olduğunu, nasıl çalıştığını ve production'a taşımak için ne yapmanız gerektiğini anlatır.

---

## 1. Proje Yapısı — Tek Bakışta

```
diyet/
├── backend/                  ← Node.js API sunucusu
│   ├── src/
│   │   ├── server.js         ← Uygulamayı başlatan dosya
│   │   ├── app.js            ← Express kurulumu, route bağlantıları
│   │   ├── config/db.js      ← MongoDB bağlantısı
│   │   ├── models/
│   │   │   ├── Post.js       ← Blog yazısı şeması
│   │   │   ├── Faq.js        ← SSS şeması
│   │   │   └── Admin.js      ← Admin kullanıcı şeması (şifreli)
│   │   ├── middleware/
│   │   │   └── auth.js       ← JWT token doğrulama
│   │   ├── routes/
│   │   │   ├── posts.js      ← Herkese açık blog endpoint'leri
│   │   │   ├── faqs.js       ← Herkese açık SSS endpoint'i
│   │   │   ├── auth.js       ← Admin giriş endpoint'i
│   │   │   └── admin/
│   │   │       ├── posts.js  ← Admin: blog CRUD (korumalı)
│   │   │       └── faqs.js   ← Admin: SSS CRUD (korumalı)
│   │   └── scripts/
│   │       └── seed-admin.js ← İlk admin kullanıcısını oluşturur
│   ├── .env.example          ← Kopyalayıp .env yapın
│   └── Dockerfile
│
├── frontend/                 ← Next.js 16 uygulaması
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              ← Anasayfa
│   │   │   ├── blog/page.tsx         ← Blog listesi
│   │   │   ├── blog/[slug]/page.tsx  ← Blog detay
│   │   │   ├── sss/page.tsx          ← SSS sayfası
│   │   │   └── admin/
│   │   │       ├── login/page.tsx    ← Admin giriş formu (layout DIŞINDA)
│   │   │       └── (panel)/          ← Route group: sidebar layout + JWT koruması
│   │   │           ├── layout.tsx    ← Admin sidebar + session koruması
│   │   │           ├── page.tsx      ← Admin dashboard
│   │   │           ├── blog/page.tsx ← Blog listesi (yönetim)
│   │   │           ├── blog/[id]/page.tsx ← Blog editörü (Tiptap)
│   │   │           └── sss/page.tsx  ← SSS yönetimi
│   │   ├── components/
│   │   │   ├── Hero.tsx        ← GSAP giriş animasyonu
│   │   │   ├── Services.tsx    ← Hizmetler (ScrollTrigger animasyonu)
│   │   │   ├── About.tsx       ← Hakkımda bölümü
│   │   │   ├── Navbar.tsx      ← Sabit üst menü (mobil dahil)
│   │   │   ├── Footer.tsx      ← İletişim + linkler
│   │   │   └── FaqAccordion.tsx← SSS accordion
│   │   ├── hooks/
│   │   │   └── useIsomorphicLayoutEffect.ts  ← SSR uyumlu GSAP hook
│   │   ├── providers/
│   │   │   ├── GsapProvider.tsx       ← ScrollTrigger kayıt
│   │   │   └── NextAuthProvider.tsx   ← Session context
│   │   ├── lib/api.ts          ← Tüm backend çağrıları tek dosyada
│   │   ├── types/index.ts      ← TypeScript tipleri (Post, Faq)
│   │   ├── auth.ts             ← NextAuth v5 konfigürasyonu
│   │   └── proxy.ts            ← /admin/* rota koruması (Next.js 16: proxy.ts)
│   └── Dockerfile
│
├── nginx/nginx.conf          ← Reverse proxy (domain → Next.js / API)
├── docker-compose.yml        ← Tüm servisleri tek komutla ayağa kaldırır
├── PLAN.md                   ← İlerleme takibi
└── done.md                   ← Bu belge
```

---

## 2. Nasıl Çalışır? — Veri Akışı

```
Ziyaretçi tarayıcısı
        │
        ▼
   Next.js (frontend:3000)
   ├── /              → page.tsx  → Statik render (GSAP animasyonlu)
   ├── /blog          → blog/page.tsx  → Backend'den yazıları çeker (ISR)
   ├── /blog/[slug]   → Backend'den tek yazı (ISR)
   └── /sss           → Backend'den FAQ listesi (ISR)
        │
        │  fetch("http://localhost:5000/api/...")
        ▼
   Express API (backend:5000)
   ├── GET  /api/posts         → MongoDB'den yayınlanmış yazıları döner
   ├── GET  /api/posts/:slug   → Tek yazı
   ├── GET  /api/faqs          → SSS listesi
   ├── POST /api/auth/login    → Admin girişi → JWT token döner
   └── /api/admin/*            → JWT doğrulama → CRUD işlemleri
        │
        ▼
   MongoDB (mongo:27017)
   ├── posts collection
   ├── faqs collection
   └── admins collection
```

**Admin paneli akışı:**

1. Admin `/admin/login`'e gider → email/şifre girer
2. NextAuth, backend `/api/auth/login`'i çağırır
3. Backend şifreyi kontrol eder → JWT token döner
4. NextAuth bu token'ı session'a kaydeder
5. Admin artık `/admin/*` sayfalarına erişebilir
6. Her API çağrısında token `Authorization: Bearer <token>` header'ıyla gönderilir

---

## 3. Yerel Ortamda Çalıştırma

İki yöntem var: **Docker (önerilen)** ve **Manuel (npm)**. İkisi de aynı sonucu verir; fark sadece kurulum karmaşıklığındadır.

---

### Yöntem A — Docker Compose (Önerilen)

Tüm servisleri (MongoDB, backend, frontend, nginx) tek komutla ayağa kaldırır.

#### Ön Koşul

[Docker Desktop](https://www.docker.com/products/docker-desktop/) kurulu ve çalışıyor olmalı (Windows'ta WSL 2 gerekir).

WSL 2 kurmak için PowerShell'i **Yönetici olarak** açıp:

```powershell
wsl --install
# Bilgisayarı yeniden başlatın
```

#### Adım 1 — .env Dosyalarını Oluşturun

**`backend/.env`** (kopyalayıp doldurun):

```bash
# Windows
copy backend\.env.example backend\.env

# Mac/Linux
cp backend/.env.example backend/.env
```

Dosya içeriği:

```dotenv
MONGO_URI=mongodb://mongo:27017/diyet
JWT_SECRET=BURAYA_ASAGIDAKI_KOMUTLA_URETTIGINIZ_STRINGI_YAPISTIRIN
PORT=5000
NODE_ENV=development
UPLOAD_DIR=uploads
```

**`.env`** (proje kökünde, `docker-compose.yml` ile aynı dizin):

```bash
# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

Dosya içeriği:

```dotenv
NEXTAUTH_URL=http://localhost
NEXTAUTH_SECRET=BURAYA_ASAGIDAKI_KOMUTLA_URETTIGINIZ_STRINGI_YAPISTIRIN
```

Güvenli random string üretmek için (Node.js kurulu olmalı):

```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('NEXTAUTH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠️ `MONGO_URI`'de `localhost` değil `mongo` yazın. Docker iç ağında MongoDB container'ının adı `mongo`'dur.

#### Adım 2 — Build Edip Başlatın

```bash
cd diyet
docker compose up -d --build
```

İlk çalıştırmada Docker image'ları indirir ve build eder — **~3-5 dakika** sürebilir.
Sonraki başlatmalar cache kullandığı için **~10 saniye** sürer.

Build biterken terminalde şunları görmelisiniz:

```
✔ Container diyet_mongo     Running
✔ Container diyet_backend   Started
✔ Container diyet_frontend  Started
✔ Container diyet_nginx     Started
```

#### Adım 3 — Admin Kullanıcısını Oluşturun (Sadece İlk Kez)

```bash
docker compose exec backend node src/scripts/seed-admin.js
# Çıktı: Admin created: admin@diyet.com / Admin1234!
```

> Bu komutu `docker compose exec backend` ile çalıştırmanız gerekir — direkt `node` değil. Çünkü MongoDB Docker ağında çalışıyor.

#### Adım 4 — Erişin

| Sayfa           | URL                          |
| --------------- | ---------------------------- |
| Anasayfa        | http://localhost             |
| Admin girişi    | http://localhost/admin/login |
| Backend API     | http://localhost/api/health  |
| MongoDB Compass | mongodb://localhost:27017    |

> ⚠️ http://localhost (port 80, nginx üzerinden) kullanın. Port 3000'e doğrudan gitmek de çalışır ama NextAuth cookie'leri `localhost` domain'ine set edildiği için http://localhost üzerinden giriş yapın.

#### Faydalı Komutlar

```bash
# Tüm container'ların durumunu gör
docker compose ps

# Tüm logları canlı izle
docker compose logs -f

# Sadece bir servisin logları
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx

# Servisleri durdur (veri kaybolmaz)
docker compose down

# Servisleri durdur + MongoDB verisini de sil (dikkat!)
docker compose down -v

# Sadece bir servisi yeniden build et ve başlat
docker compose up -d --build frontend
docker compose up -d --build backend

# Hepsini yeniden başlat (build etmeden)
docker compose restart

# Çalışan bir container'da komut çalıştır
docker compose exec backend node src/scripts/seed-admin.js
docker compose exec backend sh   # shell aç
```

---

### Yöntem B — Manuel (npm, Docker olmadan)

Geliştirme sırasında sadece bir servisi değiştiriyorsanız veya Docker kurmak istemiyorsanız bu yöntemi kullanın.

#### Ön Koşullar

- [Node.js 20+](https://nodejs.org/)
- MongoDB: [MongoDB Community](https://www.mongodb.com/try/download/community) **veya** ücretsiz [MongoDB Atlas](https://cloud.mongodb.com)

#### Adım 1 — MongoDB'yi Başlatın

**Lokal kurulum varsa:**

```bash
# Windows (servis olarak kurulduysa)
net start MongoDB

# Mac (Homebrew)
brew services start mongodb-community
```

**Atlas (bulut) kullanıyorsanız:**

1. [cloud.mongodb.com](https://cloud.mongodb.com) → M0 cluster oluşturun
2. Connect → Drivers → connection string'i kopyalayın
3. Aşağıdaki `backend/.env` içine yapıştırın

#### Adım 2 — `backend/.env` Oluşturun

```bash
copy backend\.env.example backend\.env
```

Dosya içeriği (lokal MongoDB için):

```dotenv
MONGO_URI=mongodb://localhost:27017/diyet
JWT_SECRET=BURAYA_RANDOM_STRING
PORT=5000
NODE_ENV=development
UPLOAD_DIR=uploads
```

#### Adım 3 — Backend'i Başlatın

```bash
cd backend
npm install
npm run dev
# → http://localhost:5000 üzerinde çalışır
# → "MongoDB connected: localhost" görmelisiniz
```

İlk kez başlatıyorsanız admin kullanıcısını oluşturun:

```bash
# backend/ klasöründeyken
node src/scripts/seed-admin.js
# Çıktı: Admin created: admin@diyet.com / Admin1234!
```

#### Adım 4 — `frontend/.env.local` Oluşturun

```bash
# Proje kök dizininde değil, frontend/ içinde oluşturun
```

`frontend/.env.local` içeriği:

```dotenv
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=BURAYA_RANDOM_STRING
```

> ⚠️ Manuel modda `api.ts` dosyasındaki API_URL SSR sırasında `http://backend:5000` kullanır. Bu Docker dışında çalışmaz. `frontend/src/lib/api.ts` ve `frontend/src/auth.ts` dosyalarında `http://backend:5000` yerine `http://localhost:5000` yazmanız gerekir.

#### Adım 5 — Frontend'i Başlatın

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000 üzerinde çalışır
```

#### Adım 6 — Erişin

| Sayfa        | URL                               |
| ------------ | --------------------------------- |
| Anasayfa     | http://localhost:3000             |
| Admin girişi | http://localhost:3000/admin/login |
| Backend API  | http://localhost:5000/api/health  |

> Bu yöntemde nginx yoktur. Frontend ve backend ayrı terminallerde çalışır.

---

## 4. Mock Data'yı Gerçek Veriyle Değiştirme

Şu an frontend'deki bazı içerikler **doğrudan kod içinde** yazılmış (hardcoded). Bunları admin panel üzerinden yönetilir hale getirmek için aşağıdaki adımları izleyin.

### 4.1 Blog Yazıları ✅ (zaten dinamik)

Blog yazıları tamamen MongoDB'den geliyor. Yapmanız gereken:

1. Admin paneline gidin → `/admin/blog` → "Yeni Yazı"
2. Başlık, özet, içerik (Tiptap editör) girin
3. Durumu "Yayınla" yapın
4. `/blog` sayfasında otomatik görünür

### 4.2 SSS ✅ (zaten dinamik)

SSS soruları MongoDB'den geliyor:

1. Admin paneli → `/admin/sss` → "Yeni Soru"
2. Soru ve cevabı girin, sıralama numarası verin
3. `/sss` sayfasında otomatik görünür

### 4.3 Hizmetler Bölümü ⚠️ (hardcoded)

`frontend/src/components/Services.tsx` içinde `services` dizisi var:

```tsx
const services = [
  { emoji: "🥗", title: "Kişisel Beslenme Programı", desc: "..." },
  // ...
];
```

**Dinamik yapmak için:**

1. Backend'de yeni bir `Service` modeli oluşturun (`backend/src/models/Service.js`):

```js
const serviceSchema = new mongoose.Schema({
  emoji: String,
  title: { type: String, required: true },
  desc: String,
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
});
```

2. `GET /api/services` public route'u ekleyin
3. Admin CRUD route'larını ekleyin
4. `Services.tsx`'i `async` server component yapıp `getServices()` çağırın

### 4.4 Hakkımda Bölümü ⚠️ (hardcoded)

`frontend/src/components/About.tsx` içindeki metin ve emoji düz yazılmış.

**Dinamik yapmak için:**

1. Backend'de `Settings` modeli oluşturun (tek bir doküman):

```js
const settingsSchema = new mongoose.Schema({
  aboutTitle: String,
  aboutText: String,
  aboutSubtext: String,
  phone: String,
  email: String,
  address: String,
  instagramUrl: String,
  youtubeUrl: String,
});
```

2. `GET /api/settings` → herkese açık
3. `PUT /api/admin/settings` → admin günceller
4. `About.tsx` ve `Footer.tsx`'i bu veriden besleyin

### 4.5 Footer İletişim Bilgileri ⚠️ (hardcoded)

`footer/Footer.tsx` içindeki telefon, email, adres bilgileri düz metin. Yukarıdaki `Settings` modeli ile aynı anda çözülür.

### 4.6 Navbar Logosu ⚠️ (metin)

"Diyetisyen" yazısı. Gerçek logo eklemek için:

1. Logonuzu `frontend/public/logo.svg` olarak kaydedin
2. `Navbar.tsx` içinde `<Link>` içine `<Image>` bileşeni ekleyin:

```tsx
import Image from "next/image";
<Image src="/logo.svg" alt="Logo" width={120} height={40} />;
```

---

## 5. Production-Ready Olmak İçin Yapılacaklar

### 5.1 Ortam Değişkenleri (KRİTİK)

**`backend/.env`**

```
MONGO_URI=mongodb+srv://kullanici:sifre@cluster.mongodb.net/diyet
JWT_SECRET=en_az_64_karakter_rastgele_string_buraya
PORT=5000
NODE_ENV=production
```

**`.env`** (proje kökünde, docker-compose okur)

```
NEXTAUTH_URL=https://sitenizin-domaini.com
NEXTAUTH_SECRET=en_az_32_karakter_rastgele_string
```

Güvenli random string üretmek için:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

> `NEXT_PUBLIC_API_URL` artık kullanılmıyor. API çağrıları:
>
> - **SSR (server component):** `http://backend:5000` — Docker iç ağı
> - **Tarayıcı:** Relative URL (`/api/...`) — nginx `/api/*` → backend'e yönlendirir

### 5.2 Admin Şifresi (KRİTİK)

Seed script varsayılan şifre `Admin1234!` kullanıyor. Production'a geçmeden önce:

1. Admin paneline giriş yapın
2. **Veya** MongoDB'de doğrudan güncelleyin (şifre `bcrypt` ile hash'leniyor):

```bash
# Backend klasöründe çalıştırın
node -e "
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./src/models/Admin');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  await Admin.findOneAndUpdate(
    { email: 'admin@diyet.com' },
    { passwordHash: 'YeniGüçlüŞifreniz123!' }  // pre-save hook hash'ler
  );
  console.log('Şifre güncellendi');
  process.exit(0);
});
"
```

### 5.3 MongoDB — Atlas (Ücretsiz Bulut)

Lokal MongoDB yerine ücretsiz bulut kullanmak için:

1. [cloud.mongodb.com](https://cloud.mongodb.com) → ücretsiz M0 cluster oluşturun
2. "Connect" → "Drivers" → connection string'i kopyalayın
3. `backend/.env` → `MONGO_URI=mongodb+srv://...` olarak güncelleyin
4. Atlas dashboard'da **Network Access** → `0.0.0.0/0` ya da sunucu IP'nizi ekleyin

### 5.4 Resim Yükleme

Şu an blog kapak görseli için URL giriliyor (ör. bir CDN linki). Doğrudan dosya yüklemek için:

**Seçenek A — Cloudinary (önerilen, ücretsiz tier var):**

1. [cloudinary.com](https://cloudinary.com) hesabı açın
2. Backend'e `cloudinary` paketi ekleyin: `npm install cloudinary multer-storage-cloudinary`
3. `backend/src/routes/admin/upload.js` oluşturun:

```js
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: "diyet" },
});
const upload = multer({ storage });

router.post("/", protect, upload.single("image"), (req, res) => {
  res.json({ url: req.file.path });
});
```

4. Frontend blog editöründe URL input yerine dosya yükleme alanı ekleyin

**Seçenek B — Lokal (VPS'de):**
Mevcut `multer` zaten kurulu. `backend/uploads/` klasörüne kaydedip `/uploads/dosya.jpg` URL'si döner.

### 5.5 Rate Limiting Sıkılaştırma

`backend/src/app.js` içinde mevcut rate limit var (100 istek/15 dk). Login endpoint için daha sıkı bir limit ekleyin:

```js
// app.js içine ekleyin, auth route'larından önce
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 15 dakikada 10 başarısız denemeden sonra blokla
  message: { message: "Çok fazla giriş denemesi, 15 dakika bekleyin." },
});
app.use("/api/auth/login", loginLimiter);
```

### 5.6 SEO — Dinamik Metadata

Blog detay sayfasında (`blog/[slug]/page.tsx`) `generateMetadata` ekleyin:

```tsx
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getPost(slug).catch(() => null);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.coverImage ? [post.coverImage] : [],
    },
  };
}
```

### 5.7 HTTPS / SSL (VPS Deploy)

`nginx/nginx.conf` içinde domain adını güncelleyin, ardından VPS'de:

```bash
# Certbot kurulumu (Ubuntu)
apt install certbot python3-certbot-nginx
certbot --nginx -d siteniz.com -d www.siteniz.com
# Otomatik yenileme için:
certbot renew --dry-run
```

### 5.8 Hata Takibi (Opsiyonel ama önerilen)

Ücretsiz [Sentry](https://sentry.io) ile hem backend hem frontend hatalarını izleyin:

```bash
# Frontend
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs

# Backend
npm install @sentry/node
```

---

## 6. VPS'e Deploy — Adım Adım

### Ön koşul

- Ubuntu 22.04+ VPS (DigitalOcean, Hetzner, vb.)
- Domain DNS → VPS IP'ye yönlendirilmiş
- Docker ve Docker Compose kurulu

### Adımlar

```bash
# 1. Kodu VPS'e kopyala
git init && git add . && git commit -m "initial"
# GitHub'a yükleyip VPS'ten git clone yapın

# 2. VPS'te repo klasörüne girin
cd /var/www/diyet

# 3. .env dosyalarını oluşturun
cp backend/.env.example backend/.env
nano backend/.env   # MONGO_URI, JWT_SECRET değerlerini doldurun
                    # MONGO_URI=mongodb://mongo:27017/diyet (Docker için)

nano .env           # NEXTAUTH_URL=https://siteniz.com ve NEXTAUTH_SECRET

# 4. nginx.conf içinde 'localhost' yerine gerçek domaininizi yazın
# ve SSL server bloğunu geri ekleyin
nano nginx/nginx.conf

# 5. Tüm servisleri başlat
docker compose up -d --build

# 6. Admin kullanıcısını oluştur (sadece bir kez)
docker compose exec backend node src/scripts/seed-admin.js

# 7. SSL sertifikası al
apt install certbot python3-certbot-nginx
certbot --nginx -d siteniz.com -d www.siteniz.com
```

### Güncelleme Yapmak

```bash
git pull
docker compose up -d --build frontend  # sadece frontend güncellediyseniz
docker compose up -d --build backend   # sadece backend güncellediyseniz
docker compose up -d --build           # her ikisi de
```

---

## 7. Sıkça Sorulan: Backend'e Nasıl Yeni Özellik Eklerim?

Backend'e daha önce hiç dokunmadıysanız, tipik bir özellik ekleme akışı:

### Örnek: "Başarı Hikayeleri" özelliği eklemek

**Adım 1 — Model** (`backend/src/models/Story.js`):

```js
const mongoose = require("mongoose");
const storySchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // kişinin adı
    beforeWeight: Number,
    afterWeight: Number,
    story: String,
    photoUrl: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
module.exports = mongoose.model("Story", storySchema);
```

**Adım 2 — Public route** (`backend/src/routes/stories.js`):

```js
const express = require("express");
const Story = require("../models/Story");
const router = express.Router();

router.get("/", async (_req, res) => {
  const stories = await Story.find({ isActive: true }).sort({ createdAt: -1 });
  res.json(stories);
});
module.exports = router;
```

**Adım 3 — Admin route** (`backend/src/routes/admin/stories.js`):

```js
const express = require("express");
const Story = require("../../models/Story");
const { protect } = require("../../middleware/auth");
const router = express.Router();
router.use(protect);

router.post("/", async (req, res) => {
  const story = await Story.create(req.body);
  res.status(201).json(story);
});
router.put("/:id", async (req, res) => {
  const story = await Story.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(story);
});
router.delete("/:id", async (req, res) => {
  await Story.findByIdAndDelete(req.params.id);
  res.json({ message: "Silindi" });
});
module.exports = router;
```

**Adım 4 — app.js'e kaydet** (`backend/src/app.js`):

```js
const storyRoutes = require("./routes/stories");
const adminStoryRoutes = require("./routes/admin/stories");
// ...
app.use("/api/stories", storyRoutes);
app.use("/api/admin/stories", adminStoryRoutes);
```

**Adım 5 — Frontend API fonksiyonları** (`frontend/src/lib/api.ts`):

```ts
export function getStories() {
  return apiFetch<Story[]>("/api/stories");
}
```

**Adım 6 — Frontend sayfası**: Normal bir Next.js async server component.

---

## 8. Önemli Dosyaların Kısa Açıklamaları

| Dosya                                       | Ne Yapar                                                                                             |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `backend/src/middleware/auth.js`            | Her admin isteğini JWT ile kontrol eder                                                              |
| `backend/src/scripts/seed-admin.js`         | İlk admin kullanıcısını bir kez oluşturur                                                            |
| `frontend/src/lib/api.ts`                   | Tüm backend çağrıları burada — SSR'da `http://backend:5000`, tarayıcıda relative URL kullanır        |
| `frontend/src/auth.ts`                      | NextAuth v5 ayarları — backend JWT'sini session'a kaydeder, her zaman `http://backend:5000` kullanır |
| `frontend/src/proxy.ts`                     | Next.js 16 route koruması (eski adı `middleware.ts`) — `/admin/*` için session kontrolü              |
| `frontend/src/app/admin/login/page.tsx`     | Login sayfası — `(panel)` layout'unun **dışında**, session kontrolü uygulanmaz                       |
| `frontend/src/app/admin/(panel)/layout.tsx` | Admin sidebar + session yoksa `/admin/login`'e yönlendir                                             |
| `frontend/next.config.ts`                   | `afterFiles` rewrites: `/api/*` (auth hariç) → `http://backend:5000`                                 |
| `frontend/src/app/globals.css`              | Tailwind base stilleri — dark mode override kaldırıldı (beyaz üstü beyaz yazı sorunu önlendi)        |
| `frontend/src/providers/GsapProvider.tsx`   | GSAP'ın ScrollTrigger plugin'ini SSR'dan kaçınarak kayıt eder                                        |
| `nginx/nginx.conf`                          | `/api/auth/*` → Next.js, `/api/*` → backend, diğerleri → frontend                                    |
| `docker-compose.yml`                        | 4 servis (mongo, backend, frontend, nginx) — `AUTH_TRUST_HOST=true` ile NextAuth güveni sağlanır     |
| `backend/.env`                              | `MONGO_URI=mongodb://mongo:27017/diyet` (Docker iç ağı)                                              |
| `.env`                                      | `NEXTAUTH_URL=http://localhost`, `NEXTAUTH_SECRET`                                                   |
