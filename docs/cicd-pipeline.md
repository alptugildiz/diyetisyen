# CI/CD Pipeline: GitHub Actions → Docker Hub → CapRover

Her `git push` ile backend veya frontend otomatik olarak build edilip CapRover'a deploy edilir.

---

## Genel Akış

```
git push (main branch)
        ↓
GitHub Actions tetiklenir
        ↓
Docker image build (linux/amd64 + linux/arm64)
        ↓
Docker Hub'a push (alpldz/diyet-backend:latest veya alpldz/diyet-frontend:latest)
        ↓
caprover CLI ile CapRover'a deploy
        ↓
✅ Uygulama yeniden başlatılır
```

- `backend/**` değişirse → sadece `deploy-backend.yml` çalışır
- `frontend/**` değişirse → sadece `deploy-frontend.yml` çalışır
- İkisi birden değişirse → her ikisi paralel çalışır

---

## Workflow Dosyaları

| Dosya | Tetikleyici |
|---|---|
| `.github/workflows/deploy-backend.yml` | `backend/**` değişikliği |
| `.github/workflows/deploy-frontend.yml` | `frontend/**` değişikliği |

---

## Gerekli GitHub Secrets

GitHub → Repo → **Settings** → **Secrets and variables** → **Actions**

| Secret Adı | Açıklama | Nereden Alınır |
|---|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub kullanıcı adı | `alpldz` |
| `DOCKERHUB_TOKEN` | Docker Hub access token | hub.docker.com → Account Settings → Security → Personal access tokens → **Read & Write** |
| `CAPROVER_BACKEND_TOKEN` | CapRover backend app token | CapRover → `diyet-backend` → Deployment → "Uygulama Belirtecini Etkinleştir" |
| `CAPROVER_FRONTEND_TOKEN` | CapRover frontend app token | CapRover → `diyet-frontend` → Deployment → "Uygulama Belirtecini Etkinleştir" |

---

## Kurulum Adımları

### 1. Docker Hub Access Token

1. [hub.docker.com](https://hub.docker.com) → sağ üst profil → **Account Settings**
2. Sol menü → **Security** → **Personal access tokens**
3. **Generate new token** → Access permissions: **Read & Write**
4. Token'ı kopyala → GitHub secret `DOCKERHUB_TOKEN` olarak ekle

### 2. CapRover App Token'larını Al

Her uygulama için ayrı token gerekir.

**Backend için:**
1. CapRover → Apps → `diyet-backend` → **Deployment** sekmesi
2. **"Uygulama Belirtecini Etkinleştir"** butonuna tıkla
3. Çıkan token'ı kopyala → GitHub secret `CAPROVER_BACKEND_TOKEN` olarak ekle

**Frontend için:**
1. CapRover → Apps → `diyet-frontend` → **Deployment** sekmesi
2. Aynı işlemi yap → `CAPROVER_FRONTEND_TOKEN` olarak ekle

> **Not:** Token'ı "Devre Dışı Bırak" yapıp tekrar etkinleştirirsen yeni token üretilir. Eski token geçersiz olur. GitHub secret'ı da güncellemeyi unutma.

### 3. GitHub Secrets Ekle

GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

4 secret eklenir:
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `CAPROVER_BACKEND_TOKEN`
- `CAPROVER_FRONTEND_TOKEN`

### 4. Workflow Dosyalarını Push Et

```bash
git add .github/
git commit -m "ci: GitHub Actions pipeline"
git push
```

---

## Token Yenileme (Gerektiğinde)

Token'lar "Auth token corrupted" hatası verirse:

1. CapRover → ilgili app → Deployment → **"Devre Dışı Bırak"** → **"Etkinleştir"**
2. Yeni token'ı kopyala
3. GitHub → ilgili secret → **Update** → yeni token'ı yapıştır
4. Actions'ta son workflow → **Re-run jobs**

---

## Workflow İçeriği

### deploy-backend.yml

```yaml
name: Deploy Backend
on:
  push:
    branches: [main]
    paths:
      - "backend/**"
      - ".github/workflows/deploy-backend.yml"

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-qemu-action@v3
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: ./backend
          platforms: linux/amd64,linux/arm64
          push: true
          tags: alpldz/diyet-backend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - name: Deploy to CapRover
        run: |
          npm install -g caprover
          caprover deploy \
            --caproverUrl https://captain.188.245.232.63.nip.io \
            --appToken ${{ secrets.CAPROVER_BACKEND_TOKEN }} \
            --appName diyet-backend \
            --imageName alpldz/diyet-backend:latest
```

### deploy-frontend.yml

```yaml
name: Deploy Frontend
on:
  push:
    branches: [main]
    paths:
      - "frontend/**"
      - ".github/workflows/deploy-frontend.yml"

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-qemu-action@v3
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: ./frontend
          platforms: linux/amd64,linux/arm64
          push: true
          tags: alpldz/diyet-frontend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - name: Deploy to CapRover
        run: |
          npm install -g caprover
          caprover deploy \
            --caproverUrl https://captain.188.245.232.63.nip.io \
            --appToken ${{ secrets.CAPROVER_FRONTEND_TOKEN }} \
            --appName diyet-frontend \
            --imageName alpldz/diyet-frontend:latest
```

---

## Sorun Giderme

| Hata | Sebep | Çözüm |
|---|---|---|
| `Could not resolve host` | CapRover URL yanlış | URL'yi kontrol et |
| `Auth token corrupted` | Token geçersiz veya yenilendi | Token'ı yenile, secret'ı güncelle |
| `Login failed` | Docker Hub token yanlış | Yeni token üret |
| Workflow tetiklenmedi | Path filter eşleşmedi | İlgili klasörde bir dosya değiştir |
| CapRover'da eski version | Deploy başarılı ama image aynı | Docker Hub'da image timestamp'ini kontrol et |

---

## Hızlı Referans

```bash
# Sadece backend deploy tetikle
# backend/ altında herhangi bir dosyayı değiştir ve push et

# Sadece frontend deploy tetikle
# frontend/ altında herhangi bir dosyayı değiştir ve push et

# Her ikisini tetikle
# Her iki klasörde de değişiklik yap ve push et

# CapRover'da deploy geçmişini gör
# CapRover → ilgili app → Deployment → Sürüm Geçmişi
```
