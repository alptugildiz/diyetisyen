# VPS Deploy Rehberi

Canlıya çıkmadan önce yapılması gereken her değişiklik bu belgede.

> **Not:** Nginx kaldırıldı, yerine **Caddy** kullanılıyor. Caddy SSL'i otomatik alır, nginx + Certbot kurmanıza gerek kalmaz.

---

## 1. Yerel Geliştirmeden Farklar

| Ayar | Geliştirme (local) | Production (VPS) |
|---|---|---|
| `backend/.env` → `MONGO_URI` | `mongodb://localhost:27017/diyet` | `mongodb://mongo:27017/diyet` |
| `backend/.env` → `NODE_ENV` | `development` | `production` |
| `.env` → `NEXTAUTH_URL` | `http://localhost:3000` | `https://siteniz.com` |
| `.env` → `CADDY_HOST` | ayarlanmaz (localhost) | `siteniz.com` |
| Admin şifresi | `Admin1234!` (seed default) | Güçlü şifre (aşağıya bak) |

---

## 2. Dosya Değişiklikleri

### 2.1 `backend/.env`

```dotenv
# Docker Compose iç ağı — localhost DEĞİL
MONGO_URI=mongodb://mongo:27017/diyet

# En az 64 karakter random string üret:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=BURAYA_URETILEN_STRINGI_YAZ

PORT=5000
NODE_ENV=production
UPLOAD_DIR=uploads
```

### 2.2 `.env` (proje kökü, docker-compose okur)

```dotenv
# Gerçek domaininiz — HTTP değil HTTPS
NEXTAUTH_URL=https://siteniz.com

# En az 32 karakter random string:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
NEXTAUTH_SECRET=BURAYA_URETILEN_STRINGI_YAZ

# Caddy'e domaini bildir (SSL otomatik alınır)
CADDY_HOST=siteniz.com
```

> `Caddyfile` değiştirilmez — `CADDY_HOST` env değişkeni yeterli.

---

## 3. VPS'e Kurulum — Adım Adım

### Ön koşullar

- Ubuntu 22.04+ VPS (DigitalOcean, Hetzner, vb.)
- Domainin DNS A kaydı VPS IP'ye yönlendirilmiş ve yayılmış
- Root veya sudo yetkili kullanıcı

### 3.1 Docker Kur

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Docker Compose plugin (v2)
apt install -y docker-compose-plugin

# Test
docker --version
docker compose version
```

### 3.2 Kodu VPS'e Al

```bash
git clone https://github.com/KULLANICI/diyet.git /var/www/diyet
cd /var/www/diyet
```

### 3.3 .env Dosyalarını Oluştur

```bash
# Backend
cp backend/.env.example backend/.env
nano backend/.env
# MONGO_URI=mongodb://mongo:27017/diyet  ← mongo yaz, localhost değil
# JWT_SECRET=...  ← random üret ve yapıştır
# NODE_ENV=production

# Proje kökü
nano .env
# NEXTAUTH_URL=https://siteniz.com
# NEXTAUTH_SECRET=...  ← random üret ve yapıştır
# CADDY_HOST=siteniz.com
```

### 3.4 Servisleri Başlat

```bash
cd /var/www/diyet
docker compose up -d --build
# İlk build ~3-5 dakika sürer
```

Caddy, başlar başlamaz `siteniz.com` için otomatik olarak **Let's Encrypt SSL sertifikası** alır.
Bunun için 80 ve 443 portlarının açık olması gerekir.

### 3.5 Admin Kullanıcısını Oluştur (Sadece İlk Kez)

```bash
docker compose exec backend node src/scripts/seed-admin.js
# Çıktı: Admin created: admin@diyet.com / Admin1234!
```

**Hemen ardından şifreyi değiştir** (bölüm 4'e bak).

---

## 4. Admin Şifresini Değiştir (KRİTİK)

```bash
docker compose exec backend node -e "
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./src/models/Admin');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const hash = await bcrypt.hash('YeniGüçlüŞifreniz!', 10);
  await Admin.findOneAndUpdate(
    { email: 'admin@diyet.com' },
    { passwordHash: hash }
  );
  console.log('Şifre güncellendi');
  process.exit(0);
});
"
```

---

## 5. Güncelleme Yapmak

```bash
cd /var/www/diyet
git pull

docker compose up -d --build frontend  # sadece frontend
docker compose up -d --build backend   # sadece backend
docker compose up -d --build           # ikisi de
```

---

## 6. Faydalı Komutlar

```bash
# Logları izle
docker compose logs -f
docker compose logs -f caddy
docker compose logs -f frontend
docker compose logs -f backend

# Container durumları
docker compose ps

# Servisleri durdur (veri korunur)
docker compose down

# Servisleri durdur + veriyi de sil (dikkat!)
docker compose down -v
```

---

## 7. Uploads Klasörü (Kapak Görselleri)

Blog editöründe yüklenen görseller backend container'ında `/app/uploads/` altında tutulur. Docker Compose `uploads` volume'u tanımlar, bu sayede container yeniden başlasa bile dosyalar kaybolmaz.

**Görseller için ekstra bir şey yapmanıza gerek yok** — volume otomatik oluşur.

> Görsel URL'leri veritabanında `/uploads/dosyaadi.webp` formatında saklanır.
> Frontend, `/uploads/*` isteklerini Next.js rewrite'ı ile backend'e proxy'ler.
> Bu hem local hem production'da aynı çalışır.

### Yedek Almak (opsiyonel)

```bash
# Uploads klasörünü yerel makineye kopyala
docker compose cp backend:/app/uploads ./uploads-backup
```

---

## 8. Kontrol Listesi

- [ ] `https://siteniz.com` açılıyor (HTTP → HTTPS otomatik yönlendirme)
- [ ] `https://siteniz.com/api/health` → `{"status":"ok"}` dönüyor
- [ ] `/blog` sayfası blog yazılarını gösteriyor
- [ ] `/sss` sayfası SSS listesini gösteriyor
- [ ] `/admin/login` → giriş yapılabiliyor
- [ ] Admin panelden blog yazısı oluşturulup yayınlanabiliyor
- [ ] Kapak görseli yüklenip blog kartında görünüyor
- [ ] Admin şifresi varsayılandan değiştirildi
