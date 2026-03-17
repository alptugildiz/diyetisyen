# VPS Deploy Rehberi (CapRover)

Bu proje **CapRover** üzerinden deploy edilir. Nginx ve Caddy kullanılmaz — SSL CapRover tarafından otomatik olarak yönetilir.

## Docker Image URL'leri

| Servis | Image |
|--------|-------|
| Frontend (Next.js) | `alpldz/diyet-frontend:latest` |
| Backend (Express) | `alpldz/diyet-backend:latest` |
| Veritabanı | CapRover One-Click App → MongoDB |

---

## 1. CapRover Kurulumu (VPS'te İlk Kez)

### Ön koşullar
- Ubuntu 22.04+ VPS
- Domainin `*.siteniz.com` wildcard DNS kaydı CapRover IP'ye yönlendirilmiş olmalı
- Root veya sudo yetkili kullanıcı

### Docker Kur

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker
```

### CapRover Kur

```bash
docker run -p 80:80 -p 443:443 -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /captain:/captain \
  caprover/caprover
```

Kurulum tamamlanınca `http://VPS_IP:3000` adresinden CapRover dashboard'una giriş yap.
Varsayılan şifre: `captain42` — **hemen değiştir.**

---

## 2. MongoDB Kurulumu (CapRover One-Click App)

CapRover Dashboard → **One-Click Apps** → `MongoDB` seç → kur.

- App adı: `mongo` (veya istediğin bir şey)
- Port: `27017`
- CapRover iç ağ hostname: `srv-captain--mongo` (app adına göre değişir)

> **Not:** Backend `.env` içindeki `MONGO_URI` değerini bu hostname ile güncelle.
> Örn: `MONGO_URI=mongodb://srv-captain--mongo:27017/diyet`

---

## 3. Backend Deploy

### 3.1 Yeni App Oluştur
CapRover Dashboard → **Apps** → **Create New App**
- App adı: `diyet-backend`
- HTTP/S: açık

### 3.2 Image Kaynağı Ayarla
App → **Deployment** sekmesi → **Deploy via ImageName**

```
alpldz/diyet-backend:latest
```

### 3.3 Ortam Değişkenlerini Gir
App → **App Configs** → **Environmental Variables**

```
MONGO_URI=mongodb://srv-captain--mongo:27017/diyet
JWT_SECRET=<64 karakter random string>
PORT=5000
NODE_ENV=production
UPLOAD_DIR=uploads
TELEGRAM_BOT_TOKEN=<botfather'dan aldığın token>
TELEGRAM_CHAT_ID=<telegram chat id>
```

> JWT_SECRET üretmek için: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### 3.4 Port Ayarla
App → **App Configs** → **Container HTTP Port**: `5000`

### 3.5 Deploy Et
**Deployment** → **Deploy** butonuna tıkla.

---

## 4. Frontend Deploy

### 4.1 Yeni App Oluştur
CapRover Dashboard → **Apps** → **Create New App**
- App adı: `diyet-frontend`
- HTTP/S: açık

### 4.2 Image Kaynağı Ayarla
App → **Deployment** sekmesi → **Deploy via ImageName**

```
alpldz/diyet-frontend:latest
```

### 4.3 Ortam Değişkenlerini Gir
App → **App Configs** → **Environmental Variables**

```
NEXTAUTH_URL=https://siteniz.com
NEXTAUTH_SECRET=<32 karakter random string>
AUTH_TRUST_HOST=true
BACKEND_URL=http://srv-captain--diyet-backend:5000
```

> `BACKEND_URL` değeri CapRover iç ağ adresini kullanır — internet üzerinden geçmez, hızlı ve güvenli.
> `NEXTAUTH_SECRET` üretmek için: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 4.4 Port Ayarla
App → **App Configs** → **Container HTTP Port**: `3000`

### 4.5 Domain Bağla
App → **HTTP Settings** → **Connect New Domain**
- Domain: `siteniz.com`
- **Enable HTTPS** → CapRover Let's Encrypt ile SSL'i otomatik alır

### 4.6 Deploy Et
**Deployment** → **Deploy** butonuna tıkla.

---

## 5. Admin Kullanıcısını Oluştur (Sadece İlk Kez)

CapRover Dashboard → **diyet-backend** → **App Logs / Console** → Exec komut:

```bash
node src/scripts/seed-admin.js
```

Veya local makineden (backend ayaktaysa):
```bash
# CapRover app URL'si üzerinden değil, doğrudan container exec ile
docker exec -it <container_id> node src/scripts/seed-admin.js
```

Varsayılan: `admin@diyet.com` / `Admin1234!` — **hemen değiştir.**

---

## 6. Image Güncelleme (Yeni Versiyon Deploy)

Kod değişikliği yapıldıktan sonra yeni image build edip push et:

```bash
# Multiplatform build + push
docker buildx build --platform linux/amd64,linux/arm64 \
  -t alpldz/diyet-backend:latest --push ./backend

docker buildx build --platform linux/amd64,linux/arm64 \
  -t alpldz/diyet-frontend:latest --push ./frontend
```

Ardından CapRover → ilgili app → **Deployment** → **Deploy** (image yeniden çekilir).

---

## 7. Uploads Klasörü (Kapak Görselleri)

Blog editöründe yüklenen görseller backend container'ında `/app/uploads/` altında tutulur.

CapRover'da **Persistent Directory** ayarla:
- App → **App Configs** → **Persistent Directories**
- Container Path: `/app/uploads`
- Label: `uploads`

Bu sayede container yeniden deploy edilse bile görseller kaybolmaz.

---

## 8. Kontrol Listesi

- [ ] `https://siteniz.com` açılıyor
- [ ] `https://siteniz.com/api/health` → `{"status":"ok"}` dönüyor
- [ ] `/blog` sayfası yazıları gösteriyor
- [ ] `/sss` sayfası SSS listesini gösteriyor
- [ ] `/admin/login` → giriş yapılabiliyor
- [ ] Admin panelden blog yazısı oluşturulup yayınlanabiliyor
- [ ] Randevu Al modalı → Telegram'a mesaj geliyor
- [ ] Admin şifresi varsayılandan değiştirildi
- [ ] Backend Persistent Directory `/app/uploads` ayarlı
