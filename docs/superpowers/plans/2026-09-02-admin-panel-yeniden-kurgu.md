# Admin Panel Yeniden Kurgusu — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin panelde `Booking`/`Appointment` ikiliğini tek gelir defteriyle (`Payment`) değiştirmek, paket satışı ve alacak takibi eklemek, paneli mobilde kullanılabilir hale getirmek ve 11 mevcut bug'ı kapatmak.

**Architecture:** Backend'de `Appointment` koleksiyonu kaldırılıp yerine `Payment` (tahsilat defteri), `Package` (katalog), `PatientPackage` (satış) ve `AppointmentRequest` (siteden gelen talep) modelleri gelir. `Booking.fee` tahakkuku, `Payment` tahsilatı temsil eder; alacak ikisinin farkıdır. Frontend'de ortak bir UI bileşen seti kurulur, sidebar responsive hale gelir ve ekranlar kullanım sıklığına göre yeniden gruplanır.

**Tech Stack:** Express 4 + Mongoose 8 + Zod 3 (backend), Next.js 16 App Router + TypeScript + Tailwind 4 + NextAuth v5 (frontend), Jest 29 + supertest + mongodb-memory-server (test).

**Spec:** `docs/superpowers/specs/2026-09-02-admin-panel-yeniden-kurgu-design.md`

## Global Constraints

- **UI dili Türkçe.** Tüm etiket, buton, hata mesajı ve boş durum metni Türkçe. Kod tarafındaki tanımlayıcılar (değişken, fonksiyon, model, alan adları) İngilizce.
- **Sadece Tailwind CSS.** CSS modülü, styled-components veya ayrı `.css` dosyası yok. Ana renk `brand-500` / `brand-600` (mevcut palet).
- **API deseni:** public `GET /api/<resource>`, admin `GET/POST/PUT/DELETE /api/admin/<resource>`. Tüm admin route'ları `router.use(protect)` ile korunur (`backend/src/middleware/auth.js`).
- **Validasyon:** Her admin route'unda Zod şeması. Hata yanıtı mevcut desene birebir uyar: `res.status(400).json({ message: "Validation error", errors: err.errors })`.
- **Model dosyaları:** `backend/src/models/` altında PascalCase (`Payment.js`). Route'lar `backend/src/routes/admin/` altında camelCase (`patientPackages.js`). Her yeni route `backend/src/app.js` içinde mount edilir.
- **Tarih normalizasyonu:** DB'ye yazılan tüm tarihler UTC gece yarısına normalize edilir. Tarih string'i üretirken `toISOString()` **kullanılmaz** — yerel bileşenler (`getFullYear`/`getMonth`/`getDate`) kullanılır.
- **API URL çözümü:** SSR `http://backend:5000`, tarayıcı göreli `/api/...`. `NEXT_PUBLIC_API_URL` kullanılmaz. Tüm frontend çağrıları `frontend/src/lib/api.ts` içindeki `apiFetch`/`adminFetch` üzerinden geçer.
- **Test komutu:** `cd backend && npm test`. Tek dosya için `npx jest tests/<dosya> --runInBand`.
- **Commit:** Her task sonunda. Mesaj Türkçe gövde, İngilizce conventional prefix (`feat:`, `fix:`, `refactor:`, `test:`).

---

## Dosya Yapısı

**Backend — yeni:**

| Dosya | Sorumluluk |
|---|---|
| `src/lib/dateRange.js` | UTC gece yarısı normalizasyonu + `?from&to` filtresi. Tüm route'lar buradan kullanır. |
| `src/lib/visitType.js` | `recalcVisitTypes(patientId)` — ziyaret tipini tarih sırasına göre yeniden hesaplar |
| `src/lib/packageTotals.js` | Satılan paketin türetilen alanlarını hesaplar (kalan seans, kalan borç) |
| `src/models/Package.js` | Paket katalogu |
| `src/models/PatientPackage.js` | Satılan paket |
| `src/models/Payment.js` | Tahsilat defteri |
| `src/models/AppointmentRequest.js` | Siteden gelen randevu talebi |
| `src/routes/admin/packages.js` | Katalog CRUD |
| `src/routes/admin/patientPackages.js` | Paket satışı CRUD |
| `src/routes/admin/payments.js` | Tahsilat CRUD |
| `src/routes/admin/requests.js` | Talep listesi + dönüştürme |
| `src/routes/admin/today.js` | "Bugün" ekranının verisi |
| `src/routes/admin/badges.js` | Sidebar rozet sayıları |
| `src/scripts/seed-demo.js` | Geliştirme için örnek veri |

**Backend — silinen:** `src/models/Appointment.js`, `src/routes/admin/appointments.js`, `src/scripts/backfill-visit-type.js`

**Frontend — yeni:**

| Dosya | Sorumluluk |
|---|---|
| `src/lib/date.ts` | Saat dilimi güvenli tarih yardımcıları — tek kaynak |
| `src/lib/paymentMethod.ts` | Ödeme yöntemi etiket/renk sözlüğü |
| `src/lib/requestStatus.ts` | Talep durumu etiket/renk sözlüğü |
| `src/components/admin/ui/*` | Ortak bileşen seti (9 dosya + `index.ts`) |
| `src/components/admin/AdminNav.tsx` | Sidebar, aktif sayfa vurgusu ile (client) |
| `src/components/admin/MobileTabBar.tsx` | Mobil alt sekme çubuğu |
| `src/components/admin/BookingActionSheet.tsx` | "İşle" modalı |
| `src/components/admin/stats/*` | İstatistik grafikleri, grafik başına bir dosya |
| `src/app/admin/(panel)/finans/page.tsx` | Finans — üç sekme |
| `src/app/admin/(panel)/talepler/page.tsx` | Randevu talepleri |

**Frontend — silinen:** `src/app/admin/(panel)/randevular/`, `src/app/admin/(panel)/giderler/` (içeriği Finans sekmelerine taşınır)

---

# Faz 1 — Tarih Temeli

Her şey tarihe dokunuyor. Önce burası sağlamlaşmalı, yoksa sonraki tüm testler kaygan zeminde yazılır.

### Task 1: Backend tarih aralığı yardımcısı

Bugün `buildDateFilter` üç route dosyasında birebir kopyalanmış (`bookings.js:41`, `appointments.js:23`, `expenses.js:16`) ve `to` gününü kapsamıyor: `$lte: new Date("2026-08-31")` UTC gece yarısı demek, yani o günün kendisi aralığın dışında kalıyor. Tek yardımcıya çıkarıp sınırı gün sonuna taşıyoruz.

**Files:**
- Create: `backend/src/lib/dateRange.js`
- Test: `backend/tests/dateRange.test.js`

**Interfaces:**
- Produces:
  - `toUtcMidnight(input: string | Date): Date` — "2026-08-31" → `2026-08-31T00:00:00.000Z`
  - `buildDateFilter(query: {from?: string, to?: string}, field = "date"): object` — `{ date: { $gte, $lte } }`, ikisi de yoksa `{}`

- [ ] **Step 1: Write the failing test**

`backend/tests/dateRange.test.js`:

```js
const { toUtcMidnight, buildDateFilter } = require("../src/lib/dateRange");

describe("toUtcMidnight", () => {
  it("normalises an ISO date string to UTC midnight", () => {
    expect(toUtcMidnight("2026-08-31").toISOString()).toBe(
      "2026-08-31T00:00:00.000Z",
    );
  });

  it("strips the time from a Date that carries one", () => {
    expect(toUtcMidnight(new Date("2026-08-31T18:45:00.000Z")).toISOString()).toBe(
      "2026-08-31T00:00:00.000Z",
    );
  });
});

describe("buildDateFilter", () => {
  it("returns an empty filter when neither bound is given", () => {
    expect(buildDateFilter({})).toEqual({});
  });

  it("includes the whole of the `to` day", () => {
    const filter = buildDateFilter({ from: "2026-08-01", to: "2026-08-31" });
    expect(filter.date.$gte.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(filter.date.$lte.toISOString()).toBe("2026-08-31T23:59:59.999Z");
  });

  it("accepts an open-ended range", () => {
    const filter = buildDateFilter({ from: "2026-08-01" });
    expect(filter.date.$gte.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(filter.date.$lte).toBeUndefined();
  });

  it("filters on the named field when one is given", () => {
    const filter = buildDateFilter({ from: "2026-08-01" }, "soldAt");
    expect(filter.soldAt.$gte.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest tests/dateRange.test.js --runInBand`
Expected: FAIL — `Cannot find module '../src/lib/dateRange'`

- [ ] **Step 3: Write minimal implementation**

`backend/src/lib/dateRange.js`:

```js
// Tarih alanlarının tek doğruluk kaynağı. DB'deki tüm tarihler UTC gece
// yarısına normalize edilir; aralık filtresi `to` gününün tamamını kapsar.

function toUtcMidnight(input) {
  const d = input instanceof Date ? input : new Date(input);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

// { from, to } sorgu parametrelerinden Mongo filtresi üretir.
// `to` gün sonuna taşınır, aksi halde o günün kayıtları aralığın dışında kalır.
function buildDateFilter(query, field = "date") {
  const filter = {};
  if (!query.from && !query.to) return filter;

  filter[field] = {};
  if (query.from) filter[field].$gte = toUtcMidnight(query.from);
  if (query.to) {
    const end = toUtcMidnight(query.to);
    end.setUTCHours(23, 59, 59, 999);
    filter[field].$lte = end;
  }
  return filter;
}

module.exports = { toUtcMidnight, buildDateFilter };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest tests/dateRange.test.js --runInBand`
Expected: PASS — 6 test

- [ ] **Step 5: Mevcut route'ları yardımcıya bağla**

`backend/src/routes/admin/bookings.js` ve `backend/src/routes/admin/expenses.js` içindeki yerel `buildDateFilter` fonksiyon tanımlarını sil, üstteki require bloğuna ekle:

```js
const { buildDateFilter, toUtcMidnight } = require("../../lib/dateRange");
```

Aynı dosyalarda `new Date(data.date)` geçen her yeri `toUtcMidnight(data.date)` yap.

`backend/src/routes/admin/appointments.js` bu turda siliniyor (Task 10), şimdi dokunma.

- [ ] **Step 6: Run the full suite**

Run: `cd backend && npm test`
Expected: PASS — mevcut testlerin tamamı hâlâ geçiyor

- [ ] **Step 7: Commit**

```bash
git add backend/src/lib/dateRange.js backend/tests/dateRange.test.js backend/src/routes/admin/bookings.js backend/src/routes/admin/expenses.js
git commit -m "fix: tarih aralığı filtresi to gününü kapsasın

buildDateFilter üç route'ta kopyalanmıştı ve \$lte UTC gece yarısına
denk geldiği için aralığın son günü dışarıda kalıyordu. Tek yardımcıya
çıkarıldı, sınır gün sonuna taşındı."
```

---

### Task 2: Frontend saat dilimi güvenli tarih yardımcıları

`periods.ts:29`'daki `toISODate` yerel gece yarısını `toISOString()` ile UTC'ye çeviriyor. Türkiye UTC+3 olduğu için `new Date(2026, 8, 1).toISOString()` → `"2026-08-31"`. Sonuç: "Bu Ay" filtresi önceki ayın son gününü de kapsıyor ve dashboard geliri şişik görünüyor. `calendar.ts` zaten doğru yöntemi (yerel bileşenler) kullanıyor; iki dosyayı tek kaynağa bağlıyoruz.

**Files:**
- Create: `frontend/src/lib/date.ts`
- Modify: `frontend/src/lib/periods.ts:26-29`, `frontend/src/lib/calendar.ts:24-31`

**Interfaces:**
- Produces:
  - `toISODate(d: Date): string` — yerel bileşenlerden `"YYYY-MM-DD"`
  - `todayISO(): string`
  - `addDays(iso: string, days: number): string`
  - `isISODate(v: string): boolean`

- [ ] **Step 1: Yeni tarih modülünü yaz**

`frontend/src/lib/date.ts`:

```ts
// Saat dilimi güvenli tarih yardımcıları — projedeki tek kaynak.
//
// Kural: gün anahtarı üretirken ASLA toISOString() kullanma. Yerel gece
// yarısını UTC'ye çevirir ve UTC+3'te bir gün geriye kaydırır.
// Yalnızca getFullYear/getMonth/getDate kullan.

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(new Date(y, m - 1, d + days));
}

export function isISODate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}
```

- [ ] **Step 2: `periods.ts`'i bağla**

`frontend/src/lib/periods.ts` içindeki yerel `toISODate` tanımını (satır 26) sil, en üste ekle:

```ts
import { toISODate } from "@/lib/date";
```

`periodRange` gövdesi değişmiyor — artık doğru `toISODate`'i kullanıyor.

- [ ] **Step 3: `calendar.ts`'i bağla**

`frontend/src/lib/calendar.ts` içindeki yerel `pad`, `isoOf` ve `todayISO` tanımlarını sil. En üste ekle:

```ts
import { toISODate, todayISO } from "@/lib/date";

export { todayISO };
```

`monthGrid` içinde `isoOf(d.getFullYear(), d.getMonth(), d.getDate())` çağrılarını `toISODate(d)` ile değiştir.

- [ ] **Step 4: Tekrarlanan yerel tanımları temizle**

Şu iki yerdeki `const today = () => new Date().toISOString().slice(0, 10)` satırlarını sil ve `todayISO` import et:
- `frontend/src/app/admin/(panel)/randevular/page.tsx:19`
- `frontend/src/app/admin/(panel)/giderler/page.tsx:16`

`frontend/src/app/admin/(panel)/page.tsx:14`'teki yerel `plusDays` yardımcısını sil, `addDays` import et.

- [ ] **Step 5: Doğrula**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: hata yok

Elle kontrol: `docker compose up -d --build` sonrası `/admin` aç, "Bu Ay Kazanç" değerinin ayın 1'inden itibaren hesaplandığını doğrula (önceki ayın son günü dahil değil).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/date.ts frontend/src/lib/periods.ts frontend/src/lib/calendar.ts "frontend/src/app/admin/(panel)"
git commit -m "fix: tarih üretiminde saat dilimi kayması

periods.ts yerel gece yarısını toISOString ile UTC'ye çeviriyordu;
UTC+3'te bu bir gün geriye kayıyor ve 'Bu Ay' filtresi önceki ayın
son gününü de kapsıyordu. Tüm tarih yardımcıları lib/date.ts altında
toplandı, yalnızca yerel bileşenlerle çalışıyor."
```

---

# Faz 2 — Veri Modeli ve Backend

### Task 3: Paket katalogu

**Files:**
- Create: `backend/src/models/Package.js`, `backend/src/routes/admin/packages.js`
- Modify: `backend/src/app.js`
- Test: `backend/tests/packages.test.js`

**Interfaces:**
- Produces: `Package` modeli — `{ name, sessionCount, price, isActive, order }`. `GET /api/admin/packages?activeOnly=true` aktif olanları `order` sırasıyla döner.

- [ ] **Step 1: Write the failing test**

`backend/tests/packages.test.js`:

```js
const request = require("supertest");
const app = require("../src/app");
const Package = require("../src/models/Package");
const { connect, clearDatabase, closeDatabase } = require("./testDb");
const { makeToken } = require("./authHelper");

let token;

beforeAll(async () => {
  await connect();
  token = makeToken();
});
afterEach(async () => {
  await clearDatabase();
});
afterAll(async () => {
  await closeDatabase();
});

describe("admin packages", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await request(app).get("/api/admin/packages");
    expect(res.status).toBe(401);
  });

  it("creates a package", async () => {
    const res = await request(app)
      .post("/api/admin/packages")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "8 Seans Kilo Yönetimi", sessionCount: 8, price: 10000 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("8 Seans Kilo Yönetimi");
    expect(res.body.isActive).toBe(true);
  });

  it("rejects a package with fewer than one session", async () => {
    const res = await request(app)
      .post("/api/admin/packages")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Boş paket", sessionCount: 0, price: 100 });
    expect(res.status).toBe(400);
  });

  it("hides inactive packages when activeOnly is set", async () => {
    await Package.create({ name: "Aktif", sessionCount: 4, price: 5000 });
    await Package.create({
      name: "Pasif",
      sessionCount: 4,
      price: 5000,
      isActive: false,
    });
    const res = await request(app)
      .get("/api/admin/packages?activeOnly=true")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Aktif");
  });

  it("returns every package by default, ordered", async () => {
    await Package.create({ name: "İkinci", sessionCount: 4, price: 5000, order: 2 });
    await Package.create({ name: "Birinci", sessionCount: 8, price: 9000, order: 1 });
    const res = await request(app)
      .get("/api/admin/packages")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.map((p) => p.name)).toEqual(["Birinci", "İkinci"]);
  });

  it("deletes a package", async () => {
    const pkg = await Package.create({ name: "Silinecek", sessionCount: 4, price: 5000 });
    const res = await request(app)
      .delete(`/api/admin/packages/${pkg._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(await Package.countDocuments()).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest tests/packages.test.js --runInBand`
Expected: FAIL — `Cannot find module '../src/models/Package'`

- [ ] **Step 3: Write the model**

`backend/src/models/Package.js`:

```js
const mongoose = require("mongoose");

// Paket katalogu: diyetisyenin bir kez tanımlayıp satışta seçtiği şablonlar.
// Satış anında alanlar PatientPackage'a kopyalanır (snapshot), böylece
// buradaki fiyat değişse de geçmiş satışlar bozulmaz.
const packageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sessionCount: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Package", packageSchema);
```

- [ ] **Step 4: Write the route**

`backend/src/routes/admin/packages.js`:

```js
const express = require("express");
const { z } = require("zod");
const Package = require("../../models/Package");
const { protect } = require("../../middleware/auth");

const router = express.Router();
router.use(protect);

const packageSchema = z.object({
  name: z.string().min(1),
  sessionCount: z.number().int().min(1),
  price: z.number().min(0),
  isActive: z.boolean().optional(),
  order: z.number().optional(),
});

router.get("/", async (req, res) => {
  try {
    const filter = req.query.activeOnly === "true" ? { isActive: true } : {};
    const packages = await Package.find(filter).sort({ order: 1, name: 1 });
    res.json(packages);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = packageSchema.parse(req.body);
    res.status(201).json(await Package.create(data));
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const data = packageSchema.partial().parse(req.body);
    const pkg = await Package.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!pkg) return res.status(404).json({ message: "Package not found" });
    res.json(pkg);
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const pkg = await Package.findByIdAndDelete(req.params.id);
    if (!pkg) return res.status(404).json({ message: "Package not found" });
    res.json({ message: "Package deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
```

- [ ] **Step 5: Mount the route**

`backend/src/app.js` — require bloğuna ve mount bloğuna ekle:

```js
const adminPackageRoutes = require("./routes/admin/packages");
// ...
app.use("/api/admin/packages", adminPackageRoutes);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && npx jest tests/packages.test.js --runInBand`
Expected: PASS — 6 test

- [ ] **Step 7: Commit**

```bash
git add backend/src/models/Package.js backend/src/routes/admin/packages.js backend/src/app.js backend/tests/packages.test.js
git commit -m "feat: paket katalogu modeli ve CRUD route'u"
```

---

### Task 4: Satılan paket

**Files:**
- Create: `backend/src/models/PatientPackage.js`, `backend/src/lib/packageTotals.js`, `backend/src/routes/admin/patientPackages.js`
- Modify: `backend/src/app.js`
- Test: `backend/tests/patientPackages.test.js`

**Interfaces:**
- Consumes: `Package` (Task 3), `toUtcMidnight` (Task 1)
- Produces:
  - `PatientPackage` modeli — `{ patient, package, name, sessionCount, price, soldAt, status, note }`
  - `decoratePatientPackage(pp): Promise<object>` — `usedSessions`, `remainingSessions`, `paidAmount`, `remainingDebt` eklenmiş düz nesne
  - `POST /api/admin/patient-packages` gövdesi: `{ patient, package?, name, sessionCount, price, soldAt, note? }`

- [ ] **Step 1: Write the failing test**

`backend/tests/patientPackages.test.js`:

```js
const request = require("supertest");
const app = require("../src/app");
const Patient = require("../src/models/Patient");
const Package = require("../src/models/Package");
const PatientPackage = require("../src/models/PatientPackage");
const { connect, clearDatabase, closeDatabase } = require("./testDb");
const { makeToken } = require("./authHelper");

let token;

beforeAll(async () => {
  await connect();
  token = makeToken();
});
afterEach(async () => {
  await clearDatabase();
});
afterAll(async () => {
  await closeDatabase();
});

const createPatient = () =>
  Patient.create({
    firstName: "Ayşe",
    lastName: "Yılmaz",
    phone: "0(555)123 45 67",
  });

describe("admin patient packages", () => {
  it("sells a package, copying the catalogue values as a snapshot", async () => {
    const patient = await createPatient();
    const pkg = await Package.create({
      name: "8 Seans",
      sessionCount: 8,
      price: 10000,
    });

    const res = await request(app)
      .post("/api/admin/patient-packages")
      .set("Authorization", `Bearer ${token}`)
      .send({
        patient: patient._id.toString(),
        package: pkg._id.toString(),
        name: pkg.name,
        sessionCount: pkg.sessionCount,
        price: pkg.price,
        soldAt: "2026-09-01",
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("8 Seans");
    expect(res.body.price).toBe(10000);
    expect(res.body.status).toBe("aktif");
  });

  it("keeps the snapshot when the catalogue price changes afterwards", async () => {
    const patient = await createPatient();
    const pkg = await Package.create({
      name: "8 Seans",
      sessionCount: 8,
      price: 10000,
    });
    const sold = await PatientPackage.create({
      patient: patient._id,
      package: pkg._id,
      name: pkg.name,
      sessionCount: pkg.sessionCount,
      price: pkg.price,
      soldAt: new Date("2026-09-01"),
    });

    await Package.findByIdAndUpdate(pkg._id, { price: 14000 });

    const res = await request(app)
      .get(`/api/admin/patient-packages?patient=${patient._id}`)
      .set("Authorization", `Bearer ${token}`);
    const found = res.body.find((p) => p._id === sold._id.toString());
    expect(found.price).toBe(10000);
  });

  it("reports remaining sessions and remaining debt", async () => {
    const patient = await createPatient();
    await PatientPackage.create({
      patient: patient._id,
      name: "4 Seans",
      sessionCount: 4,
      price: 8000,
      soldAt: new Date("2026-09-01"),
    });

    const res = await request(app)
      .get(`/api/admin/patient-packages?patient=${patient._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.body[0].usedSessions).toBe(0);
    expect(res.body[0].remainingSessions).toBe(4);
    expect(res.body[0].paidAmount).toBe(0);
    expect(res.body[0].remainingDebt).toBe(8000);
  });

  it("normalises soldAt to UTC midnight", async () => {
    const patient = await createPatient();
    const res = await request(app)
      .post("/api/admin/patient-packages")
      .set("Authorization", `Bearer ${token}`)
      .send({
        patient: patient._id.toString(),
        name: "4 Seans",
        sessionCount: 4,
        price: 8000,
        soldAt: "2026-09-01",
      });
    expect(new Date(res.body.soldAt).toISOString()).toBe(
      "2026-09-01T00:00:00.000Z",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest tests/patientPackages.test.js --runInBand`
Expected: FAIL — `Cannot find module '../src/models/PatientPackage'`

- [ ] **Step 3: Write the model**

`backend/src/models/PatientPackage.js`:

```js
const mongoose = require("mongoose");

// Danışana satılmış paket. name/sessionCount/price alanları satış anında
// katalogdan kopyalanır (snapshot) — katalog sonradan değişse de geçmiş
// satışın bedeli sabit kalır. Kalan seans ve kalan borç saklanmaz,
// Booking ve Payment kayıtlarından hesaplanır (bkz. lib/packageTotals.js).
const patientPackageSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    package: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },
    name: { type: String, required: true, trim: true },
    sessionCount: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    soldAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["aktif", "tamamlandi", "iptal"],
      default: "aktif",
    },
    note: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PatientPackage", patientPackageSchema);
```

- [ ] **Step 4: Write the totals helper**

`backend/src/lib/packageTotals.js`:

```js
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");

// Satılan paketin türetilen alanlarını hesaplar. Sayaç saklamıyoruz;
// saklanan sayaç er ya da geç gerçekle uyumsuzlaşır.
async function decoratePatientPackage(pp) {
  const plain = pp.toObject ? pp.toObject() : { ...pp };

  const usedSessions = await Booking.countDocuments({
    patientPackage: pp._id,
    status: "geldi",
  });

  const payments = await Payment.find({ patientPackage: pp._id }).select("amount");
  const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  return {
    ...plain,
    usedSessions,
    remainingSessions: Math.max(plain.sessionCount - usedSessions, 0),
    paidAmount,
    remainingDebt: Math.max(plain.price - paidAmount, 0),
  };
}

module.exports = { decoratePatientPackage };
```

- [ ] **Step 5: Write the route**

`backend/src/routes/admin/patientPackages.js`:

```js
const express = require("express");
const { z } = require("zod");
const PatientPackage = require("../../models/PatientPackage");
const Payment = require("../../models/Payment");
const Booking = require("../../models/Booking");
const { protect } = require("../../middleware/auth");
const { toUtcMidnight, buildDateFilter } = require("../../lib/dateRange");
const { decoratePatientPackage } = require("../../lib/packageTotals");

const router = express.Router();
router.use(protect);

const saleSchema = z.object({
  patient: z.string().min(1),
  package: z.string().optional().nullable(),
  name: z.string().min(1),
  sessionCount: z.number().int().min(1),
  price: z.number().min(0),
  soldAt: z.string().min(1),
  status: z.enum(["aktif", "tamamlandi", "iptal"]).optional(),
  note: z.string().optional(),
});

router.get("/", async (req, res) => {
  try {
    const filter = buildDateFilter(req.query, "soldAt");
    if (req.query.patient) filter.patient = req.query.patient;
    const sales = await PatientPackage.find(filter)
      .populate("patient", "firstName lastName phone")
      .sort({ soldAt: -1 });
    res.json(await Promise.all(sales.map(decoratePatientPackage)));
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = saleSchema.parse(req.body);
    const sale = await PatientPackage.create({
      ...data,
      soldAt: toUtcMidnight(data.soldAt),
    });
    res.status(201).json(await decoratePatientPackage(sale));
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const data = saleSchema.partial().parse(req.body);
    if (data.soldAt) data.soldAt = toUtcMidnight(data.soldAt);
    const sale = await PatientPackage.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!sale)
      return res.status(404).json({ message: "PatientPackage not found" });
    res.json(await decoratePatientPackage(sale));
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    res.status(500).json({ message: "Server error" });
  }
});

// Paket silinince ona bağlı tahsilatlar da silinir ve seansların paket
// bağı çözülür — öksüz kayıt bırakmıyoruz.
router.delete("/:id", async (req, res) => {
  try {
    const sale = await PatientPackage.findByIdAndDelete(req.params.id);
    if (!sale)
      return res.status(404).json({ message: "PatientPackage not found" });
    await Payment.deleteMany({ patientPackage: sale._id });
    await Booking.updateMany(
      { patientPackage: sale._id },
      { patientPackage: null },
    );
    res.json({ message: "PatientPackage deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
```

- [ ] **Step 6: Mount the route**

`backend/src/app.js`:

```js
const adminPatientPackageRoutes = require("./routes/admin/patientPackages");
// ...
app.use("/api/admin/patient-packages", adminPatientPackageRoutes);
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd backend && npx jest tests/patientPackages.test.js --runInBand`
Expected: PASS — 4 test

> `Payment` modeli Task 5'te yazılıyor. Bu task'ı önce Task 5'i tamamlayıp geri dönerek çalıştır, ya da iki task'ı tek oturumda sırayla yürüt. Sıra bağımlılığı bilinçlidir: `packageTotals.js` `Payment`'a, `payments.js` `PatientPackage`'a ihtiyaç duyuyor.

- [ ] **Step 8: Commit**

```bash
git add backend/src/models/PatientPackage.js backend/src/lib/packageTotals.js backend/src/routes/admin/patientPackages.js backend/src/app.js backend/tests/patientPackages.test.js
git commit -m "feat: satılan paket modeli, snapshot alanları ve türetilen bakiye"
```

---

### Task 5: Tahsilat defteri

**Files:**
- Create: `backend/src/models/Payment.js`, `backend/src/routes/admin/payments.js`
- Modify: `backend/src/app.js`
- Test: `backend/tests/payments.test.js`

**Interfaces:**
- Consumes: `PatientPackage` (Task 4), `toUtcMidnight`/`buildDateFilter` (Task 1)
- Produces:
  - `Payment` modeli — `{ patient, source, booking, patientPackage, amount, method, date, documentNumber, note }`
  - `GET /api/admin/payments?from=&to=&patient=` → `{ payments, total, count }`, `patient` ve kaynak kaydı populate edilmiş

- [ ] **Step 1: Write the failing test**

`backend/tests/payments.test.js`:

```js
const request = require("supertest");
const app = require("../src/app");
const Patient = require("../src/models/Patient");
const Booking = require("../src/models/Booking");
const PatientPackage = require("../src/models/PatientPackage");
const Payment = require("../src/models/Payment");
const { connect, clearDatabase, closeDatabase } = require("./testDb");
const { makeToken } = require("./authHelper");

let token;

beforeAll(async () => {
  await connect();
  token = makeToken();
});
afterEach(async () => {
  await clearDatabase();
});
afterAll(async () => {
  await closeDatabase();
});

const createPatient = () =>
  Patient.create({
    firstName: "Ayşe",
    lastName: "Yılmaz",
    phone: "0(555)123 45 67",
  });

describe("admin payments", () => {
  it("records a payment against a booking", async () => {
    const patient = await createPatient();
    const booking = await Booking.create({
      patient: patient._id,
      date: new Date("2026-09-01"),
      status: "geldi",
      fee: 1500,
      visitType: "ilk_gorusme",
    });

    const res = await request(app)
      .post("/api/admin/payments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        patient: patient._id.toString(),
        source: "booking",
        booking: booking._id.toString(),
        amount: 1500,
        method: "nakit",
        date: "2026-09-01",
      });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(1500);
    expect(res.body.method).toBe("nakit");
  });

  it("rejects source=booking without a booking reference", async () => {
    const patient = await createPatient();
    const res = await request(app)
      .post("/api/admin/payments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        patient: patient._id.toString(),
        source: "booking",
        amount: 1500,
        method: "nakit",
        date: "2026-09-01",
      });
    expect(res.status).toBe(400);
  });

  it("rejects a payment carrying both a booking and a package", async () => {
    const patient = await createPatient();
    const booking = await Booking.create({
      patient: patient._id,
      date: new Date("2026-09-01"),
      visitType: "ilk_gorusme",
    });
    const sale = await PatientPackage.create({
      patient: patient._id,
      name: "4 Seans",
      sessionCount: 4,
      price: 8000,
      soldAt: new Date("2026-09-01"),
    });

    const res = await request(app)
      .post("/api/admin/payments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        patient: patient._id.toString(),
        source: "package",
        booking: booking._id.toString(),
        patientPackage: sale._id.toString(),
        amount: 4000,
        method: "kart",
        date: "2026-09-01",
      });
    expect(res.status).toBe(400);
  });

  it("accepts havale as a payment method", async () => {
    const patient = await createPatient();
    const sale = await PatientPackage.create({
      patient: patient._id,
      name: "4 Seans",
      sessionCount: 4,
      price: 8000,
      soldAt: new Date("2026-09-01"),
    });
    const res = await request(app)
      .post("/api/admin/payments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        patient: patient._id.toString(),
        source: "package",
        patientPackage: sale._id.toString(),
        amount: 4000,
        method: "havale",
        date: "2026-09-01",
      });
    expect(res.status).toBe(201);
  });

  it("supports instalments against one package", async () => {
    const patient = await createPatient();
    const sale = await PatientPackage.create({
      patient: patient._id,
      name: "8 Seans",
      sessionCount: 8,
      price: 10000,
      soldAt: new Date("2026-09-01"),
    });
    for (const [amount, date] of [
      [4000, "2026-09-01"],
      [3000, "2026-10-01"],
    ]) {
      await Payment.create({
        patient: patient._id,
        source: "package",
        patientPackage: sale._id,
        amount,
        method: "nakit",
        date: new Date(date),
      });
    }

    const res = await request(app)
      .get(`/api/admin/patient-packages?patient=${patient._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.body[0].paidAmount).toBe(7000);
    expect(res.body[0].remainingDebt).toBe(3000);
  });

  it("includes the last day of the requested range", async () => {
    const patient = await createPatient();
    await Payment.create({
      patient: patient._id,
      source: "booking",
      booking: null,
      amount: 500,
      method: "nakit",
      date: new Date("2026-09-30"),
    });
    const res = await request(app)
      .get("/api/admin/payments?from=2026-09-01&to=2026-09-30")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.total).toBe(500);
    expect(res.body.count).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest tests/payments.test.js --runInBand`
Expected: FAIL — `Cannot find module '../src/models/Payment'`

- [ ] **Step 3: Write the model**

`backend/src/models/Payment.js`:

```js
const mongoose = require("mongoose");

// Tek gelir defteri. İstatistiklerdeki her gelir rakamı buradan çıkar.
//
// Booking.fee TAHAKKUK'tur ("bu seansın ücreti 1.500 ₺"), Payment
// TAHSİLAT ("bu parayı 2 Eylül'de aldım"). İkisinin farkı alacaktır.
// Aylık gelir, o ay tarihli Payment kayıtlarının toplamıdır (kasa esası).
const paymentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    source: { type: String, enum: ["booking", "package"], required: true },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
      index: true,
    },
    patientPackage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PatientPackage",
      default: null,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ["nakit", "kart", "havale"],
      required: true,
    },
    date: { type: Date, required: true, index: true },
    documentNumber: { type: String, default: "", trim: true },
    note: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Payment", paymentSchema);
```

- [ ] **Step 4: Write the route**

`backend/src/routes/admin/payments.js`:

```js
const express = require("express");
const { z } = require("zod");
const Payment = require("../../models/Payment");
const { protect } = require("../../middleware/auth");
const { toUtcMidnight, buildDateFilter } = require("../../lib/dateRange");

const router = express.Router();
router.use(protect);

// source ile referans alanı birbirini tutmak zorunda: booking XOR package.
const paymentSchema = z
  .object({
    patient: z.string().min(1),
    source: z.enum(["booking", "package"]),
    booking: z.string().nullable().optional(),
    patientPackage: z.string().nullable().optional(),
    amount: z.number().min(0),
    method: z.enum(["nakit", "kart", "havale"]),
    date: z.string().min(1),
    documentNumber: z.string().optional(),
    note: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.source === "booking" && data.patientPackage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["patientPackage"],
        message: "Randevu tahsilatı pakete bağlanamaz.",
      });
    }
    if (data.source === "package") {
      if (data.booking) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["booking"],
          message: "Paket tahsilatı randevuya bağlanamaz.",
        });
      }
      if (!data.patientPackage) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["patientPackage"],
          message: "Paket tahsilatı için paket seçilmelidir.",
        });
      }
    }
  });

router.get("/", async (req, res) => {
  try {
    const filter = buildDateFilter(req.query);
    if (req.query.patient) filter.patient = req.query.patient;
    const payments = await Payment.find(filter)
      .populate("patient", "firstName lastName phone")
      .populate("patientPackage", "name sessionCount price")
      .populate("booking", "date time")
      .sort({ date: -1, createdAt: -1 });
    const total = payments.reduce((sum, p) => sum + p.amount, 0);
    res.json({ payments, total, count: payments.length });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = paymentSchema.parse(req.body);
    const payment = await Payment.create({
      ...data,
      date: toUtcMidnight(data.date),
    });
    res.status(201).json(payment);
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const data = paymentSchema.parse({ ...req.body });
    data.date = toUtcMidnight(data.date);
    const payment = await Payment.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    res.json(payment);
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    res.json({ message: "Payment deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
```

> `PUT` bilerek tam şema kullanıyor (`.partial()` değil): `source` ile referans alanı arasındaki değişmez, kısmi güncellemede doğrulanamaz.

- [ ] **Step 5: Mount the route**

`backend/src/app.js`:

```js
const adminPaymentRoutes = require("./routes/admin/payments");
// ...
app.use("/api/admin/payments", adminPaymentRoutes);
```

- [ ] **Step 6: Run both package and payment suites**

Run: `cd backend && npx jest tests/payments.test.js tests/patientPackages.test.js --runInBand`
Expected: PASS — 10 test (Task 4'ün testleri artık geçiyor)

- [ ] **Step 7: Commit**

```bash
git add backend/src/models/Payment.js backend/src/routes/admin/payments.js backend/src/app.js backend/tests/payments.test.js
git commit -m "feat: tek gelir defteri olarak Payment modeli

source alanı booking XOR package değişmezini superRefine ile zorluyor.
Taksitli tahsilat aynı pakete bağlı birden çok Payment ile doğal olarak
karşılanıyor; ayrı bir taksit modeli gerekmiyor."
```

---

### Task 6: Ziyaret tipini tarihe göre hesapla

Doğru mantık zaten `scripts/backfill-visit-type.js` içinde var ama yalnızca tek seferlik migration olarak çalışıyor; canlı yazma yolunda `countDocuments` kullanılıyor (`bookings.js:82`). Bu yüzden geçmiş bir randevu sonradan girilirse veya ilk randevu silinirse `visitType` yanlışlanıyor. Mantığı yardımcıya çıkarıp her yazma sonrası çağırıyoruz. Spec kararı gereği `iptal` durumundaki randevular sıralamadan çıkarılır.

**Files:**
- Create: `backend/src/lib/visitType.js`
- Modify: `backend/src/routes/admin/bookings.js`
- Delete: `backend/src/scripts/backfill-visit-type.js`
- Test: `backend/tests/backfillVisitType.test.js` (yeniden yazılır)

**Interfaces:**
- Produces: `recalcVisitTypes(patientId): Promise<void>` — danışanın iptal olmayan randevularını `date, time` sırasına dizer, en erkenini `ilk_gorusme`, kalanını `kontrol` yapar. İptal edilenlerin `visitType`'ı `null` olur.

- [ ] **Step 1: Write the failing test**

`backend/tests/backfillVisitType.test.js` (mevcut içeriğin tamamını değiştir):

```js
const Patient = require("../src/models/Patient");
const Booking = require("../src/models/Booking");
const { recalcVisitTypes } = require("../src/lib/visitType");
const { connect, clearDatabase, closeDatabase } = require("./testDb");

beforeAll(async () => {
  await connect();
});
afterEach(async () => {
  await clearDatabase();
});
afterAll(async () => {
  await closeDatabase();
});

const createPatient = () =>
  Patient.create({
    firstName: "Ayşe",
    lastName: "Yılmaz",
    phone: "0(555)123 45 67",
  });

const makeBooking = (patient, date, extra = {}) =>
  Booking.create({ patient: patient._id, date: new Date(date), ...extra });

async function visitTypesByDate(patientId) {
  const rows = await Booking.find({ patient: patientId }).sort({ date: 1 });
  return rows.map((b) => b.visitType);
}

it("assigns ilk_gorusme to the earliest booking and kontrol to the rest", async () => {
  const patient = await createPatient();
  await makeBooking(patient, "2026-08-01");
  await makeBooking(patient, "2026-09-01");

  await recalcVisitTypes(patient._id);

  expect(await visitTypesByDate(patient._id)).toEqual([
    "ilk_gorusme",
    "kontrol",
  ]);
});

it("re-assigns ilk_gorusme when an earlier booking is added later", async () => {
  const patient = await createPatient();
  await makeBooking(patient, "2026-09-01");
  await recalcVisitTypes(patient._id);

  await makeBooking(patient, "2026-07-01");
  await recalcVisitTypes(patient._id);

  expect(await visitTypesByDate(patient._id)).toEqual([
    "ilk_gorusme",
    "kontrol",
  ]);
});

it("skips cancelled bookings when deciding the first visit", async () => {
  const patient = await createPatient();
  await makeBooking(patient, "2026-08-01", {
    status: "iptal",
    cancelReason: "unuttu",
  });
  await makeBooking(patient, "2026-09-01", { status: "geldi" });

  await recalcVisitTypes(patient._id);

  expect(await visitTypesByDate(patient._id)).toEqual([null, "ilk_gorusme"]);
});

it("orders same-day bookings by time", async () => {
  const patient = await createPatient();
  await makeBooking(patient, "2026-08-01", { time: "14:00" });
  await makeBooking(patient, "2026-08-01", { time: "09:00" });

  await recalcVisitTypes(patient._id);

  const rows = await Booking.find({ patient: patient._id }).sort({ time: 1 });
  expect(rows.map((b) => b.visitType)).toEqual(["ilk_gorusme", "kontrol"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest tests/backfillVisitType.test.js --runInBand`
Expected: FAIL — `Cannot find module '../src/lib/visitType'`

- [ ] **Step 3: Write the helper**

`backend/src/lib/visitType.js`:

```js
const Booking = require("../models/Booking");

// Ziyaret tipini kayıt sayısına göre değil TARİHE göre belirler.
// Sayıya göre hesaplamak, geçmiş bir randevu sonradan girildiğinde veya
// ilk randevu silindiğinde yanlış sonuç veriyordu.
//
// İptal edilen randevular sıralamaya girmez: danışan gelmediyse o
// "ilk görüşme" sayılmamalı, yoksa devamlılık metriği anlamsızlaşır.
async function recalcVisitTypes(patientId) {
  const bookings = await Booking.find({ patient: patientId }).sort({
    date: 1,
    time: 1,
    createdAt: 1,
  });

  let seen = 0;
  for (const booking of bookings) {
    let visitType;
    if (booking.status === "iptal") {
      visitType = null;
    } else {
      visitType = seen === 0 ? "ilk_gorusme" : "kontrol";
      seen++;
    }
    if (booking.visitType !== visitType) {
      await Booking.updateOne({ _id: booking._id }, { visitType });
    }
  }
}

module.exports = { recalcVisitTypes };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest tests/backfillVisitType.test.js --runInBand`
Expected: PASS — 4 test

- [ ] **Step 5: Yazma yoluna bağla**

`backend/src/routes/admin/bookings.js`:

- Üstte import et: `const { recalcVisitTypes } = require("../../lib/visitType");`
- `POST` içindeki şu iki satırı sil:
  ```js
  const priorCount = await Booking.countDocuments({ patient: data.patient });
  const visitType = priorCount === 0 ? "ilk_gorusme" : "kontrol";
  ```
  `Booking.create` çağrısından `visitType` alanını çıkar; oluşturduktan hemen sonra `await recalcVisitTypes(created.patient);` çağır, ardından kaydı yeniden oku ve populate ederek dön.
- `PUT` içinde güncellemeden sonra `await recalcVisitTypes(booking.patient._id);` çağır.
- `DELETE` içinde silmeden önce `patient` id'sini sakla, sildikten sonra `await recalcVisitTypes(patientId);` çağır.

- [ ] **Step 6: Tek seferlik script'i sil**

```bash
git rm backend/src/scripts/backfill-visit-type.js
```

Canlıda veri olmadığı için migration'a gerek yok; mantık artık yazma yolunda çalışıyor.

- [ ] **Step 7: Run the full suite**

Run: `cd backend && npm test`
Expected: PASS — `bookings.test.js`'teki `ilk_gorusme`/`kontrol` testleri de dahil hepsi geçiyor

- [ ] **Step 8: Commit**

```bash
git add backend/src/lib/visitType.js backend/src/routes/admin/bookings.js backend/tests/backfillVisitType.test.js
git rm --cached backend/src/scripts/backfill-visit-type.js 2>/dev/null; true
git commit -m "fix: ziyaret tipi kayıt sayısına değil tarihe göre hesaplansın

countDocuments ile hesaplamak, geçmiş randevu sonradan girildiğinde
veya ilk randevu silindiğinde yanlış sonuç veriyordu. Doğru mantık
zaten backfill script'inde vardı; recalcVisitTypes yardımcısına
çıkarılıp her yazma sonrası çağrılıyor. İptal edilen randevular artık
ilk görüşme sıralamasına girmiyor."
```

---

### Task 7: Randevu sonuçlandırma ve cascade silme

Üç bug birden burada kapanıyor. Bugün `PUT` içindeki `completionPayment` bloğu `Appointment` upsert ediyor ama geri yönü yok: randevu silinince gelir kalıyor (#1), "geldi" durumu geri alınınca gelir kalıyor (#2). Sonuçlandırmayı ayrı bir endpoint'e taşıyıp cascade davranışlarını ekliyoruz.

**Files:**
- Modify: `backend/src/models/Booking.js`, `backend/src/routes/admin/bookings.js`
- Test: `backend/tests/bookings.test.js` (genişletilir)

**Interfaces:**
- Consumes: `Payment` (Task 5), `PatientPackage` (Task 4), `recalcVisitTypes` (Task 6)
- Produces:
  - `Booking.fee: Number` (default 0), `Booking.patientPackage: ObjectId | null`
  - `POST /api/admin/bookings/:id/complete` gövdesi:
    ```
    { status: "geldi",   fee?: number, patientPackage?: string|null,
      payment?: { amount: number, method: "nakit"|"kart"|"havale", documentNumber?: string } }
    { status: "gelmedi" | "iptal", cancelReason: string }
    ```
  - `PUT /api/admin/bookings/:id` — durum `geldi`den çıkarken bağlı tahsilat varsa `409 { message, paymentCount }` döner; `?force=true` ile tahsilat silinip devam edilir

- [ ] **Step 1: Write the failing tests**

`backend/tests/bookings.test.js` sonuna ekle:

```js
const Payment = require("../src/models/Payment");
const PatientPackage = require("../src/models/PatientPackage");

describe("POST /api/admin/bookings/:id/complete", () => {
  it("records the fee and a payment when money is collected", async () => {
    const patient = await createPatient();
    const booking = await Booking.create({
      patient: patient._id,
      date: new Date("2026-09-01"),
      status: "planlandi",
      visitType: "ilk_gorusme",
    });

    const res = await request(app)
      .post(`/api/admin/bookings/${booking._id}/complete`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        status: "geldi",
        fee: 1500,
        payment: { amount: 1500, method: "nakit" },
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("geldi");
    expect(res.body.fee).toBe(1500);

    const payments = await Payment.find({ booking: booking._id });
    expect(payments).toHaveLength(1);
    expect(payments[0].amount).toBe(1500);
    expect(payments[0].source).toBe("booking");
  });

  it("leaves a receivable when the fee is set but no payment is taken", async () => {
    const patient = await createPatient();
    const booking = await Booking.create({
      patient: patient._id,
      date: new Date("2026-09-01"),
      status: "planlandi",
      visitType: "ilk_gorusme",
    });

    const res = await request(app)
      .post(`/api/admin/bookings/${booking._id}/complete`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "geldi", fee: 1500 });

    expect(res.status).toBe(200);
    expect(res.body.fee).toBe(1500);
    expect(await Payment.countDocuments({ booking: booking._id })).toBe(0);
  });

  it("charges nothing when the session comes out of a package", async () => {
    const patient = await createPatient();
    const sale = await PatientPackage.create({
      patient: patient._id,
      name: "8 Seans",
      sessionCount: 8,
      price: 10000,
      soldAt: new Date("2026-09-01"),
    });
    const booking = await Booking.create({
      patient: patient._id,
      date: new Date("2026-09-02"),
      status: "planlandi",
      visitType: "kontrol",
    });

    const res = await request(app)
      .post(`/api/admin/bookings/${booking._id}/complete`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "geldi", patientPackage: sale._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.fee).toBe(0);
    expect(await Payment.countDocuments({ booking: booking._id })).toBe(0);

    const pkgRes = await request(app)
      .get(`/api/admin/patient-packages?patient=${patient._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(pkgRes.body[0].usedSessions).toBe(1);
    expect(pkgRes.body[0].remainingSessions).toBe(7);
  });

  it("requires a cancelReason for gelmedi", async () => {
    const patient = await createPatient();
    const booking = await Booking.create({
      patient: patient._id,
      date: new Date("2026-09-01"),
      status: "planlandi",
      visitType: "ilk_gorusme",
    });
    const res = await request(app)
      .post(`/api/admin/bookings/${booking._id}/complete`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "gelmedi" });
    expect(res.status).toBe(400);
  });
});

describe("booking cascade behaviour", () => {
  it("deletes linked payments when the booking is deleted", async () => {
    const patient = await createPatient();
    const booking = await Booking.create({
      patient: patient._id,
      date: new Date("2026-09-01"),
      status: "geldi",
      fee: 1500,
      visitType: "ilk_gorusme",
    });
    await Payment.create({
      patient: patient._id,
      source: "booking",
      booking: booking._id,
      amount: 1500,
      method: "nakit",
      date: new Date("2026-09-01"),
    });

    const res = await request(app)
      .delete(`/api/admin/bookings/${booking._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(await Payment.countDocuments()).toBe(0);
  });

  it("refuses to move away from geldi while a payment exists", async () => {
    const patient = await createPatient();
    const booking = await Booking.create({
      patient: patient._id,
      date: new Date("2026-09-01"),
      status: "geldi",
      fee: 1500,
      visitType: "ilk_gorusme",
    });
    await Payment.create({
      patient: patient._id,
      source: "booking",
      booking: booking._id,
      amount: 1500,
      method: "nakit",
      date: new Date("2026-09-01"),
    });

    const res = await request(app)
      .put(`/api/admin/bookings/${booking._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "iptal", cancelReason: "unuttu" });

    expect(res.status).toBe(409);
    expect(res.body.paymentCount).toBe(1);
    expect(await Payment.countDocuments()).toBe(1);
  });

  it("clears the payment and the fee when forced", async () => {
    const patient = await createPatient();
    const booking = await Booking.create({
      patient: patient._id,
      date: new Date("2026-09-01"),
      status: "geldi",
      fee: 1500,
      visitType: "ilk_gorusme",
    });
    await Payment.create({
      patient: patient._id,
      source: "booking",
      booking: booking._id,
      amount: 1500,
      method: "nakit",
      date: new Date("2026-09-01"),
    });

    const res = await request(app)
      .put(`/api/admin/bookings/${booking._id}?force=true`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "iptal", cancelReason: "unuttu" });

    expect(res.status).toBe(200);
    expect(res.body.fee).toBe(0);
    expect(await Payment.countDocuments()).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest tests/bookings.test.js --runInBand`
Expected: FAIL — `/complete` 404 dönüyor, cascade testleri kalan kayıt buluyor

- [ ] **Step 3: Modeli genişlet**

`backend/src/models/Booking.js` — `note` alanından önce ekle:

```js
    // Bu seansın ücreti (tahakkuk). Yalnızca status "geldi" ise anlamlı.
    // Paketten düşen seanslarda 0 kalır — para paket satışında tahsil edildi.
    fee: { type: Number, default: 0, min: 0 },
    // Doluysa bu seans o paketten düşer.
    patientPackage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PatientPackage",
      default: null,
      index: true,
    },
```

- [ ] **Step 4: Sonuçlandırma endpoint'ini yaz**

`backend/src/routes/admin/bookings.js` — `PUT` ile `DELETE` arasına ekle:

```js
const completeSchema = z
  .object({
    status: z.enum(["geldi", "gelmedi", "iptal"]),
    fee: z.number().min(0).optional(),
    patientPackage: z.string().nullable().optional(),
    cancelReason: z.enum(CANCEL_REASONS).optional().nullable(),
    payment: z
      .object({
        amount: z.number().min(0),
        method: z.enum(["nakit", "kart", "havale"]),
        documentNumber: z.string().optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (needsCancelReason(data.status) && !data.cancelReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cancelReason"],
        message: "İptal veya gelmeme durumunda neden zorunludur.",
      });
    }
  });

// Randevuyu tek işlemde sonuçlandırır: durum + ücret + (varsa) tahsilat.
// Ücret girilip tahsilat girilmezse fark alacak olarak kalır.
router.post("/:id/complete", async (req, res) => {
  try {
    const data = completeSchema.parse(req.body);
    const booking = await Booking.findById(req.params.id);
    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    const fromPackage = Boolean(data.patientPackage);
    booking.status = data.status;
    booking.cancelReason = needsCancelReason(data.status)
      ? data.cancelReason
      : null;

    if (data.status === "geldi") {
      booking.patientPackage = data.patientPackage ?? null;
      booking.fee = fromPackage ? 0 : (data.fee ?? 0);
    } else {
      booking.patientPackage = null;
      booking.fee = 0;
      await Payment.deleteMany({ booking: booking._id });
    }
    await booking.save();

    if (data.status === "geldi" && data.payment && !fromPackage) {
      await Payment.create({
        patient: booking.patient,
        source: "booking",
        booking: booking._id,
        amount: data.payment.amount,
        method: data.payment.method,
        documentNumber: data.payment.documentNumber ?? "",
        date: booking.date,
      });
    }

    await recalcVisitTypes(booking.patient);
    const fresh = await Booking.findById(booking._id).populate(
      "patient",
      "firstName lastName phone",
    );
    res.json(fresh);
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    res.status(500).json({ message: "Server error" });
  }
});
```

Dosyanın üstüne ekle: `const Payment = require("../../models/Payment");`

- [ ] **Step 5: `PUT` içine geri-alma korumasını ekle**

`PUT /:id` içinde, `existing` okunduktan hemen sonra:

```js
    // "geldi"den çıkılıyorsa bağlı tahsilat sessizce silinmemeli.
    if (existing.status === "geldi" && resultingStatus !== "geldi") {
      const paymentCount = await Payment.countDocuments({
        booking: existing._id,
      });
      if (paymentCount > 0 && req.query.force !== "true") {
        return res.status(409).json({
          message:
            "Bu randevuya bağlı tahsilat var. Durumu değiştirirsen tahsilat da silinir.",
          paymentCount,
        });
      }
      await Payment.deleteMany({ booking: existing._id });
      data.fee = 0;
      data.patientPackage = null;
    }
```

Aynı `PUT` içindeki eski `completionPayment` bloğunu (Appointment upsert eden kısım) tamamen sil; `bookingSchema`'dan da `completionPayment` alanını çıkar.

- [ ] **Step 6: `DELETE` içine cascade ekle**

```js
router.delete("/:id", async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking)
      return res.status(404).json({ message: "Booking not found" });
    await Payment.deleteMany({ booking: booking._id });
    await recalcVisitTypes(booking.patient);
    res.json({ message: "Booking deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd backend && npx jest tests/bookings.test.js --runInBand`
Expected: PASS — mevcut 6 + yeni 7 test

- [ ] **Step 8: Commit**

```bash
git add backend/src/models/Booking.js backend/src/routes/admin/bookings.js backend/tests/bookings.test.js
git commit -m "feat: randevu sonuçlandırma endpoint'i ve cascade silme

Randevu silinince bağlı tahsilat da siliniyor; 'geldi' durumundan
çıkılırken tahsilat varsa 409 dönüp onay isteniyor. Ücret girilip
tahsilat girilmediğinde fark alacak olarak kalıyor. Paketten düşen
seanslarda ücret 0."
```

---

### Task 8: Danışan cascade, arama ve sayfalama

Danışan silinince bugün yalnızca randevuları siliniyor; paketleri ve tahsilatları kalıyor (#1). Ayrıca üç ekran birden tüm danışan listesini indiriyor ve arama tarayıcıda yapılıyor (#8) — backend'de `?q=` zaten var ama kullanılmıyor.

**Files:**
- Modify: `backend/src/routes/admin/patients.js`
- Test: `backend/tests/patients.test.js` (genişletilir)

**Interfaces:**
- Produces: `GET /api/admin/patients?q=&page=&limit=` → `{ patients, total, page, totalPages }`. `limit` varsayılan 50, üst sınır 200. **Kırıcı değişiklik:** yanıt artık düz dizi değil.

- [ ] **Step 1: Write the failing tests**

`backend/tests/patients.test.js` sonuna ekle:

```js
const PatientPackage = require("../src/models/PatientPackage");
const Payment = require("../src/models/Payment");

describe("patient cascade and listing", () => {
  it("deletes bookings, packages and payments with the patient", async () => {
    const patient = await Patient.create({
      firstName: "Ayşe",
      lastName: "Yılmaz",
      phone: "0(555)123 45 67",
    });
    const sale = await PatientPackage.create({
      patient: patient._id,
      name: "4 Seans",
      sessionCount: 4,
      price: 8000,
      soldAt: new Date("2026-09-01"),
    });
    await Payment.create({
      patient: patient._id,
      source: "package",
      patientPackage: sale._id,
      amount: 4000,
      method: "nakit",
      date: new Date("2026-09-01"),
    });

    const res = await request(app)
      .delete(`/api/admin/patients/${patient._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(await PatientPackage.countDocuments()).toBe(0);
    expect(await Payment.countDocuments()).toBe(0);
  });

  it("paginates the list", async () => {
    for (let i = 0; i < 5; i++) {
      await Patient.create({
        firstName: `Ad${i}`,
        lastName: "Soyad",
        phone: `0(555)000 00 0${i}`,
      });
    }
    const res = await request(app)
      .get("/api/admin/patients?page=2&limit=2")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.patients).toHaveLength(2);
    expect(res.body.total).toBe(5);
    expect(res.body.totalPages).toBe(3);
    expect(res.body.page).toBe(2);
  });

  it("searches by name and phone", async () => {
    await Patient.create({
      firstName: "Zeynep",
      lastName: "Ak",
      phone: "0(555)111 22 33",
    });
    await Patient.create({
      firstName: "Mehmet",
      lastName: "Kaya",
      phone: "0(555)444 55 66",
    });

    const byName = await request(app)
      .get("/api/admin/patients?q=zeynep")
      .set("Authorization", `Bearer ${token}`);
    expect(byName.body.patients).toHaveLength(1);

    const byPhone = await request(app)
      .get("/api/admin/patients?q=444")
      .set("Authorization", `Bearer ${token}`);
    expect(byPhone.body.patients).toHaveLength(1);
    expect(byPhone.body.patients[0].firstName).toBe("Mehmet");
  });
});
```

Mevcut testlerde `GET /api/admin/patients` yanıtını dizi varsayan assert'ler varsa `res.body.patients` olarak güncelle.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest tests/patients.test.js --runInBand`
Expected: FAIL — cascade testinde paket/tahsilat sayısı 0 değil, sayfalama testinde `res.body.patients` undefined

- [ ] **Step 3: Update the route**

`backend/src/routes/admin/patients.js`:

`GET /` gövdesini değiştir:

```js
router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.trim();
    const filter = q
      ? {
          $or: [
            { firstName: { $regex: q, $options: "i" } },
            { lastName: { $regex: q, $options: "i" } },
            { phone: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);

    const [patients, total] = await Promise.all([
      Patient.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Patient.countDocuments(filter),
    ]);

    res.json({
      patients,
      total,
      page,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});
```

`DELETE /:id` içindeki cascade'i genişlet:

```js
    await Booking.deleteMany({ patient: patient._id });
    await PatientPackage.deleteMany({ patient: patient._id });
    await Payment.deleteMany({ patient: patient._id });
```

Üste import ekle:

```js
const PatientPackage = require("../../models/PatientPackage");
const Payment = require("../../models/Payment");
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest tests/patients.test.js --runInBand`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/admin/patients.js backend/tests/patients.test.js
git commit -m "feat: danışan listesinde arama ve sayfalama, cascade silme genişletildi

Danışan silinince paketleri ve tahsilatları da siliniyor. Liste yanıtı
{ patients, total, page, totalPages } şekline geçti — frontend Task 19'da
uyarlanacak."
```

---

### Task 9: Randevu talepleri

Siteden gelen randevu talebi bugün yalnızca Telegram'a gidiyor, hiçbir yere kaydedilmiyor (#11). Diyetisyen Telegram'daki mesajı görüp danışanı panele elle yazmak zorunda.

**Files:**
- Create: `backend/src/models/AppointmentRequest.js`, `backend/src/routes/admin/requests.js`
- Modify: `backend/src/routes/appointment.js`, `backend/src/app.js`
- Test: `backend/tests/requests.test.js`

**Interfaces:**
- Consumes: `Patient`, `Booking`, `toUtcMidnight`, `recalcVisitTypes`
- Produces:
  - `AppointmentRequest` — `{ name, email, phone, status, patient }`
  - `GET /api/admin/requests?status=` → dizi, yeni olanlar önce
  - `POST /api/admin/requests/:id/convert` gövdesi: `{ firstName, lastName, phone, source?, note?, booking?: { date, time? } }` → `{ request, patient, booking }`
  - `PUT /api/admin/requests/:id` gövdesi: `{ status }`

- [ ] **Step 1: Write the failing test**

`backend/tests/requests.test.js`:

```js
const request = require("supertest");
const app = require("../src/app");
const Patient = require("../src/models/Patient");
const Booking = require("../src/models/Booking");
const AppointmentRequest = require("../src/models/AppointmentRequest");
const { connect, clearDatabase, closeDatabase } = require("./testDb");
const { makeToken } = require("./authHelper");

let token;

beforeAll(async () => {
  await connect();
  token = makeToken();
  process.env.TELEGRAM_BOT_TOKEN = "test-bot";
  process.env.TELEGRAM_CHAT_ID = "test-chat";
});
afterEach(async () => {
  await clearDatabase();
  jest.restoreAllMocks();
});
afterAll(async () => {
  await closeDatabase();
});

describe("POST /api/appointment", () => {
  it("stores the request and notifies Telegram", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true, json: async () => ({}) });

    const res = await request(app).post("/api/appointment").send({
      name: "Ali Vural",
      email: "ali@example.com",
      phone: "05551234567",
    });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalled();
    const saved = await AppointmentRequest.find();
    expect(saved).toHaveLength(1);
    expect(saved[0].status).toBe("yeni");
  });

  it("still stores the request when Telegram fails", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));

    await request(app).post("/api/appointment").send({
      name: "Ali Vural",
      email: "ali@example.com",
      phone: "05551234567",
    });

    expect(await AppointmentRequest.countDocuments()).toBe(1);
  });
});

describe("admin requests", () => {
  it("lists new requests first", async () => {
    await AppointmentRequest.create({
      name: "Eski",
      email: "e@x.com",
      phone: "05550000001",
      status: "yoksayildi",
    });
    await AppointmentRequest.create({
      name: "Yeni",
      email: "y@x.com",
      phone: "05550000002",
    });

    const res = await request(app)
      .get("/api/admin/requests")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe("Yeni");
  });

  it("converts a request into a patient and a booking", async () => {
    const reqDoc = await AppointmentRequest.create({
      name: "Ali Vural",
      email: "ali@example.com",
      phone: "05551234567",
    });

    const res = await request(app)
      .post(`/api/admin/requests/${reqDoc._id}/convert`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Ali",
        lastName: "Vural",
        phone: "0(555)123 45 67",
        source: "web_sitesi",
        booking: { date: "2026-09-10", time: "14:30" },
      });

    expect(res.status).toBe(201);
    expect(res.body.patient.firstName).toBe("Ali");
    expect(res.body.booking.visitType).toBe("ilk_gorusme");

    const updated = await AppointmentRequest.findById(reqDoc._id);
    expect(updated.status).toBe("donusturuldu");
    expect(updated.patient.toString()).toBe(res.body.patient._id);
    expect(await Patient.countDocuments()).toBe(1);
    expect(await Booking.countDocuments()).toBe(1);
  });

  it("converts without a booking when none is given", async () => {
    const reqDoc = await AppointmentRequest.create({
      name: "Ali Vural",
      email: "ali@example.com",
      phone: "05551234567",
    });
    const res = await request(app)
      .post(`/api/admin/requests/${reqDoc._id}/convert`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Ali",
        lastName: "Vural",
        phone: "0(555)123 45 67",
      });
    expect(res.status).toBe(201);
    expect(res.body.booking).toBeNull();
    expect(await Booking.countDocuments()).toBe(0);
  });

  it("marks a request as ignored", async () => {
    const reqDoc = await AppointmentRequest.create({
      name: "Spam",
      email: "s@x.com",
      phone: "05550000000",
    });
    const res = await request(app)
      .put(`/api/admin/requests/${reqDoc._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "yoksayildi" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("yoksayildi");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest tests/requests.test.js --runInBand`
Expected: FAIL — `Cannot find module '../src/models/AppointmentRequest'`

- [ ] **Step 3: Write the model**

`backend/src/models/AppointmentRequest.js`:

```js
const mongoose = require("mongoose");

// Public sitedeki randevu formundan gelen talep. Telegram bildirimi
// devam ediyor; bu kayıt talebin panelde de görünmesini sağlıyor.
const appointmentRequestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["yeni", "donusturuldu", "yoksayildi"],
      default: "yeni",
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AppointmentRequest", appointmentRequestSchema);
```

- [ ] **Step 4: Public route'a kaydı ekle**

`backend/src/routes/appointment.js` — `const data = appointmentSchema.parse(req.body);` satırından hemen sonra:

```js
    // Önce kaydet: Telegram düşerse bile talep kaybolmasın.
    await AppointmentRequest.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
    });
```

Telegram gönderimini `try/catch` içine al ki hata yanıtı 500'e dönmesin:

```js
    try {
      const telegramRes = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: "Markdown",
          }),
        },
      );
      if (!telegramRes.ok) {
        console.error("Telegram API error:", await telegramRes.json().catch(() => ({})));
      }
    } catch (telegramErr) {
      console.error("Telegram request failed:", telegramErr.message);
    }

    res.json({ success: true });
```

Ayrıca token/chatId eksikse artık 500 dönme — kaydı at, uyarıyı logla ve `success: true` dön. Üste import ekle:

```js
const AppointmentRequest = require("../models/AppointmentRequest");
```

- [ ] **Step 5: Admin route'unu yaz**

`backend/src/routes/admin/requests.js`:

```js
const express = require("express");
const { z } = require("zod");
const AppointmentRequest = require("../../models/AppointmentRequest");
const Patient = require("../../models/Patient");
const Booking = require("../../models/Booking");
const { protect } = require("../../middleware/auth");
const { toUtcMidnight } = require("../../lib/dateRange");
const { recalcVisitTypes } = require("../../lib/visitType");

const router = express.Router();
router.use(protect);

const PHONE_RE = /^0\(5\d{2}\)\d{3} \d{2} \d{2}$/;

const convertSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().regex(PHONE_RE, "Geçersiz telefon formatı"),
  source: z.string().optional().nullable(),
  note: z.string().optional(),
  booking: z
    .object({ date: z.string().min(1), time: z.string().optional() })
    .optional(),
});

// Yeni talepler her zaman üstte; içinde tarihe göre yeniden eskiye.
router.get("/", async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const requests = await AppointmentRequest.find(filter)
      .populate("patient", "firstName lastName")
      .sort({ status: 1, createdAt: -1 });
    res.json(requests);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/:id/convert", async (req, res) => {
  try {
    const data = convertSchema.parse(req.body);
    const reqDoc = await AppointmentRequest.findById(req.params.id);
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });

    const patient = await Patient.create({
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      source: data.source ?? "web_sitesi",
      note: data.note ?? "",
    });

    let booking = null;
    if (data.booking) {
      booking = await Booking.create({
        patient: patient._id,
        date: toUtcMidnight(data.booking.date),
        time: data.booking.time ?? "",
        status: "planlandi",
      });
      await recalcVisitTypes(patient._id);
      booking = await Booking.findById(booking._id);
    }

    reqDoc.status = "donusturuldu";
    reqDoc.patient = patient._id;
    await reqDoc.save();

    res.status(201).json({ request: reqDoc, patient, booking });
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { status } = z
      .object({ status: z.enum(["yeni", "donusturuldu", "yoksayildi"]) })
      .parse(req.body);
    const reqDoc = await AppointmentRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true },
    );
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });
    res.json(reqDoc);
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
```

- [ ] **Step 6: Mount the route**

`backend/src/app.js`:

```js
const adminRequestRoutes = require("./routes/admin/requests");
// ...
app.use("/api/admin/requests", adminRequestRoutes);
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd backend && npx jest tests/requests.test.js --runInBand`
Expected: PASS — 7 test

- [ ] **Step 8: Commit**

```bash
git add backend/src/models/AppointmentRequest.js backend/src/routes/admin/requests.js backend/src/routes/appointment.js backend/src/app.js backend/tests/requests.test.js
git commit -m "feat: siteden gelen randevu talepleri panele düşsün

Talep artık önce DB'ye yazılıyor, sonra Telegram'a gidiyor — bildirim
başarısız olsa bile talep kaybolmuyor. Tek çağrıyla danışana ve
randevuya dönüştürülebiliyor."
```

---

### Task 10: `Appointment`'ı kaldır, istatistikleri `Payment`'a taşı

**Files:**
- Delete: `backend/src/models/Appointment.js`, `backend/src/routes/admin/appointments.js`
- Modify: `backend/src/routes/admin/stats.js`, `backend/src/app.js`
- Test: `backend/tests/stats.test.js`, `backend/tests/finance.test.js` (yeniden yazılır)

**Interfaces:**
- Produces: `GET /api/admin/stats?from=&to=` — mevcut `StatsResponse` alanları korunur, eklenenler:
  - `outstandingReceivables: number` — toplam alacak
  - `sessionRevenue: number` / `packageRevenue: number`
  - `topDebtors: { name, phone, debt }[]` (en fazla 5)
  - `paymentBreakdown` artık `havale`yi de içerir

- [ ] **Step 1: Testleri yaz**

`backend/tests/finance.test.js` — `Appointment` kullanan üç testi sil, yerine:

```js
const Payment = require("../src/models/Payment");
const PatientPackage = require("../src/models/PatientPackage");

it("totals revenue from the payment ledger", async () => {
  const patient = await createPatient();
  await Payment.create({
    patient: patient._id,
    source: "booking",
    amount: 1500,
    method: "nakit",
    date: new Date("2026-09-05"),
  });
  await Payment.create({
    patient: patient._id,
    source: "booking",
    amount: 2500,
    method: "havale",
    date: new Date("2026-09-06"),
  });

  const res = await request(app)
    .get("/api/admin/stats?from=2026-09-01&to=2026-09-30")
    .set("Authorization", `Bearer ${token}`);

  expect(res.body.totalRevenue).toBe(4000);
  const havale = res.body.paymentBreakdown.find((m) => m.method === "havale");
  expect(havale.total).toBe(2500);
});

it("counts an unpaid completed booking as a receivable", async () => {
  const patient = await createPatient();
  await Booking.create({
    patient: patient._id,
    date: new Date("2026-09-05"),
    status: "geldi",
    fee: 1500,
    visitType: "ilk_gorusme",
  });

  const res = await request(app)
    .get("/api/admin/stats?from=2026-09-01&to=2026-09-30")
    .set("Authorization", `Bearer ${token}`);

  expect(res.body.totalRevenue).toBe(0);
  expect(res.body.outstandingReceivables).toBe(1500);
});

it("counts a package's unpaid balance as a receivable", async () => {
  const patient = await createPatient();
  const sale = await PatientPackage.create({
    patient: patient._id,
    name: "8 Seans",
    sessionCount: 8,
    price: 10000,
    soldAt: new Date("2026-09-01"),
  });
  await Payment.create({
    patient: patient._id,
    source: "package",
    patientPackage: sale._id,
    amount: 4000,
    method: "nakit",
    date: new Date("2026-09-01"),
  });

  const res = await request(app)
    .get("/api/admin/stats?from=2026-09-01&to=2026-09-30")
    .set("Authorization", `Bearer ${token}`);

  expect(res.body.totalRevenue).toBe(4000);
  expect(res.body.packageRevenue).toBe(4000);
  expect(res.body.outstandingReceivables).toBe(6000);
});
```

Dosyanın başındaki `Appointment` import'unu sil; `Booking` ve `Patient` import'ları ile `createPatient` yardımcısı yoksa `bookings.test.js`'teki gibi ekle. Gider testleri olduğu gibi kalır.

`backend/tests/stats.test.js` içinde `Appointment` kullanan kurulumları `Payment.create` ile değiştir; alan eşlemesi: `amount` → `amount`, `paymentMethod` → `method`, `date` → `date`, ayrıca `patient` ve `source: "booking"` zorunlu.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest tests/finance.test.js tests/stats.test.js --runInBand`
Expected: FAIL — `totalRevenue` 0 geliyor, `outstandingReceivables` undefined

- [ ] **Step 3: `stats.js`'i `Payment`'a taşı**

`backend/src/routes/admin/stats.js`:

- `const Appointment = require("../../models/Appointment");` → `const Payment = require("../../models/Payment");`
- `const PatientPackage = require("../../models/PatientPackage");` ekle
- Dosya içindeki tüm `Appointment.find(...)` / `Appointment.aggregate(...)` çağrılarını `Payment` karşılıklarıyla değiştir. Alan eşlemesi: `amount` aynı, `paymentMethod` → `method`, `date` aynı.
- Yerel `buildDateFilter`'ı sil, `require("../../lib/dateRange")`'den al.
- `paymentBreakdown` üretiminde yöntem listesini `["nakit", "kart", "havale"]` yap; `Payment.method` zorunlu olduğu için `"belirtilmedi"` kovası kalkar.

Alacak hesabını ekle (dönem filtresi uygulanmış hâlde):

```js
// Alacak = tahakkuk − tahsilat. İki kaynaktan gelir:
// (1) "geldi" işaretli ama tahsilatı eksik randevular,
// (2) bedeli tam ödenmemiş paket satışları.
async function computeReceivables(dateFilter) {
  const completed = await Booking.find({
    ...dateFilter,
    status: "geldi",
    fee: { $gt: 0 },
  }).select("_id fee patient");

  const bookingPaid = await Payment.aggregate([
    { $match: { booking: { $in: completed.map((b) => b._id) } } },
    { $group: { _id: "$booking", paid: { $sum: "$amount" } } },
  ]);
  const paidByBooking = new Map(
    bookingPaid.map((row) => [String(row._id), row.paid]),
  );

  let bookingDebt = 0;
  for (const b of completed) {
    bookingDebt += Math.max(b.fee - (paidByBooking.get(String(b._id)) ?? 0), 0);
  }

  const sales = await PatientPackage.find({
    ...buildDateFilter(
      { from: dateFilter.date?.$gte, to: dateFilter.date?.$lte },
      "soldAt",
    ),
    status: { $ne: "iptal" },
  }).select("_id price");

  const packagePaid = await Payment.aggregate([
    { $match: { patientPackage: { $in: sales.map((s) => s._id) } } },
    { $group: { _id: "$patientPackage", paid: { $sum: "$amount" } } },
  ]);
  const paidByPackage = new Map(
    packagePaid.map((row) => [String(row._id), row.paid]),
  );

  let packageDebt = 0;
  for (const s of sales) {
    packageDebt += Math.max(s.price - (paidByPackage.get(String(s._id)) ?? 0), 0);
  }

  return bookingDebt + packageDebt;
}
```

Yanıt nesnesine ekle: `outstandingReceivables`, `sessionRevenue` (`source: "booking"` toplamı), `packageRevenue` (`source: "package"` toplamı), `topDebtors`.

- [ ] **Step 4: `Appointment`'ı sil**

```bash
git rm backend/src/models/Appointment.js backend/src/routes/admin/appointments.js
```

`backend/src/app.js` içinden `adminAppointmentRoutes` require ve mount satırlarını sil.

- [ ] **Step 5: Run the full suite**

Run: `cd backend && npm test`
Expected: PASS — tüm dosyalar

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/admin/stats.js backend/src/app.js backend/tests/
git commit -m "refactor: gelir istatistikleri tek deftere (Payment) taşındı

Appointment koleksiyonu ve route'u kaldırıldı. İstatistiklere alacak
(outstandingReceivables), seans/paket geliri ayrımı ve en yüksek
borçlular eklendi. Ödeme kırılımı artık havaleyi de içeriyor."
```

---

### Task 11: "Bugün" ve rozet endpoint'leri

"Bugün" ekranı bugünkü dashboard gibi dört ayrı istek atmamalı; tek çağrıda gelmeli.

**Files:**
- Create: `backend/src/routes/admin/today.js`, `backend/src/routes/admin/badges.js`
- Modify: `backend/src/app.js`
- Test: `backend/tests/today.test.js`

**Interfaces:**
- Produces:
  - `GET /api/admin/today` →
    ```
    { date, bookings: Booking[], unprocessedCount, collectedToday,
      outstandingReceivables, endingPackages: {patient, name, remainingSessions}[],
      pendingRequests }
    ```
    `unprocessedCount` = bugün tarihli ve hâlâ `planlandi` olan randevu sayısı.
  - `GET /api/admin/badges` → `{ pendingRequests }`

- [ ] **Step 1: Write the failing test**

`backend/tests/today.test.js`:

```js
const request = require("supertest");
const app = require("../src/app");
const Patient = require("../src/models/Patient");
const Booking = require("../src/models/Booking");
const Payment = require("../src/models/Payment");
const AppointmentRequest = require("../src/models/AppointmentRequest");
const { toUtcMidnight } = require("../src/lib/dateRange");
const { connect, clearDatabase, closeDatabase } = require("./testDb");
const { makeToken } = require("./authHelper");

let token;

beforeAll(async () => {
  await connect();
  token = makeToken();
});
afterEach(async () => {
  await clearDatabase();
});
afterAll(async () => {
  await closeDatabase();
});

const today = () => {
  const n = new Date();
  const pad = (v) => String(v).padStart(2, "0");
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
};

const createPatient = () =>
  Patient.create({
    firstName: "Ayşe",
    lastName: "Yılmaz",
    phone: "0(555)123 45 67",
  });

describe("GET /api/admin/today", () => {
  it("returns today's bookings and counts the unprocessed ones", async () => {
    const patient = await createPatient();
    await Booking.create({
      patient: patient._id,
      date: toUtcMidnight(today()),
      time: "09:30",
      status: "geldi",
      fee: 1500,
      visitType: "ilk_gorusme",
    });
    await Booking.create({
      patient: patient._id,
      date: toUtcMidnight(today()),
      time: "11:00",
      status: "planlandi",
      visitType: "kontrol",
    });

    const res = await request(app)
      .get("/api/admin/today")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.bookings).toHaveLength(2);
    expect(res.body.unprocessedCount).toBe(1);
    expect(res.body.bookings[0].patient.firstName).toBe("Ayşe");
  });

  it("sums money collected today", async () => {
    const patient = await createPatient();
    await Payment.create({
      patient: patient._id,
      source: "booking",
      amount: 1500,
      method: "nakit",
      date: toUtcMidnight(today()),
    });

    const res = await request(app)
      .get("/api/admin/today")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.collectedToday).toBe(1500);
  });

  it("reports pending requests", async () => {
    await AppointmentRequest.create({
      name: "Ali",
      email: "a@x.com",
      phone: "05550000000",
    });

    const res = await request(app)
      .get("/api/admin/today")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.pendingRequests).toBe(1);

    const badges = await request(app)
      .get("/api/admin/badges")
      .set("Authorization", `Bearer ${token}`);
    expect(badges.body.pendingRequests).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest tests/today.test.js --runInBand`
Expected: FAIL — 404

- [ ] **Step 3: Write `today.js`**

`backend/src/routes/admin/today.js`:

```js
const express = require("express");
const Booking = require("../../models/Booking");
const Payment = require("../../models/Payment");
const PatientPackage = require("../../models/PatientPackage");
const AppointmentRequest = require("../../models/AppointmentRequest");
const { protect } = require("../../middleware/auth");
const { buildDateFilter } = require("../../lib/dateRange");
const { decoratePatientPackage } = require("../../lib/packageTotals");

const router = express.Router();
router.use(protect);

// Sunucunun yerel gününü ISO gün anahtarı olarak verir.
// toISOString kullanmıyoruz — UTC+3'te bir gün geriye kayıyor.
function localToday() {
  const n = new Date();
  const pad = (v) => String(v).padStart(2, "0");
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

router.get("/", async (req, res) => {
  try {
    const day = req.query.date || localToday();
    const dayFilter = buildDateFilter({ from: day, to: day });

    const [bookings, payments, requests, activePackages] = await Promise.all([
      Booking.find(dayFilter)
        .populate("patient", "firstName lastName phone")
        .sort({ time: 1 }),
      Payment.find(dayFilter).select("amount"),
      AppointmentRequest.countDocuments({ status: "yeni" }),
      PatientPackage.find({ status: "aktif" }).populate(
        "patient",
        "firstName lastName",
      ),
    ]);

    const decorated = await Promise.all(activePackages.map(decoratePatientPackage));
    const endingPackages = decorated
      .filter((p) => p.remainingSessions > 0 && p.remainingSessions <= 1)
      .map((p) => ({
        patient: p.patient,
        name: p.name,
        remainingSessions: p.remainingSessions,
      }));

    // Alacak = paket borçları + tahsil edilmemiş seans ücretleri.
    // stats.js ile aynı tanım — iki ekran farklı rakam göstermemeli.
    const packageDebt = decorated.reduce((sum, p) => sum + p.remainingDebt, 0);

    const unpaidCandidates = await Booking.find({
      status: "geldi",
      fee: { $gt: 0 },
    }).select("_id fee");
    const bookingPaid = await Payment.aggregate([
      { $match: { booking: { $in: unpaidCandidates.map((b) => b._id) } } },
      { $group: { _id: "$booking", paid: { $sum: "$amount" } } },
    ]);
    const paidByBooking = new Map(
      bookingPaid.map((row) => [String(row._id), row.paid]),
    );
    const bookingDebt = unpaidCandidates.reduce(
      (sum, b) => sum + Math.max(b.fee - (paidByBooking.get(String(b._id)) ?? 0), 0),
      0,
    );

    const outstandingReceivables = packageDebt + bookingDebt;

    res.json({
      date: day,
      bookings,
      unprocessedCount: bookings.filter((b) => b.status === "planlandi").length,
      collectedToday: payments.reduce((sum, p) => sum + p.amount, 0),
      outstandingReceivables,
      endingPackages,
      pendingRequests: requests,
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
```

- [ ] **Step 4: Write `badges.js`**

`backend/src/routes/admin/badges.js`:

```js
const express = require("express");
const AppointmentRequest = require("../../models/AppointmentRequest");
const { protect } = require("../../middleware/auth");

const router = express.Router();
router.use(protect);

// Sidebar rozetleri. Her sayfada çağrıldığı için bilinçli olarak ucuz
// tutuluyor: yalnızca sayım, populate yok.
router.get("/", async (_req, res) => {
  try {
    res.json({
      pendingRequests: await AppointmentRequest.countDocuments({
        status: "yeni",
      }),
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
```

- [ ] **Step 5: Mount both**

`backend/src/app.js`:

```js
const adminTodayRoutes = require("./routes/admin/today");
const adminBadgeRoutes = require("./routes/admin/badges");
// ...
app.use("/api/admin/today", adminTodayRoutes);
app.use("/api/admin/badges", adminBadgeRoutes);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && npx jest tests/today.test.js --runInBand`
Expected: PASS — 3 test

- [ ] **Step 7: Commit**

```bash
git add backend/src/routes/admin/today.js backend/src/routes/admin/badges.js backend/src/app.js backend/tests/today.test.js
git commit -m "feat: Bugün ekranı ve sidebar rozeti için endpoint'ler"
```

---

### Task 12: Geliştirme için örnek veri

Frontend adımlarını elle doğrulayabilmek için gerçekçi veri gerekiyor. Canlıda veri olmadığı için migration yerine seed yazıyoruz.

**Files:**
- Create: `backend/src/scripts/seed-demo.js`

- [ ] **Step 1: Script'i yaz**

`backend/src/scripts/seed-demo.js`:

```js
/**
 * Geliştirme için örnek veri üretir. Mevcut koleksiyonları TEMİZLER.
 *
 *   docker compose exec backend node src/scripts/seed-demo.js
 */
const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const Package = require("../models/Package");
const PatientPackage = require("../models/PatientPackage");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Expense = require("../models/Expense");
const AppointmentRequest = require("../models/AppointmentRequest");
const { toUtcMidnight } = require("../lib/dateRange");
const { recalcVisitTypes } = require("../lib/visitType");

const pad = (n) => String(n).padStart(2, "0");
const isoOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  await Promise.all([
    Patient.deleteMany({}),
    Package.deleteMany({}),
    PatientPackage.deleteMany({}),
    Booking.deleteMany({}),
    Payment.deleteMany({}),
    Expense.deleteMany({}),
    AppointmentRequest.deleteMany({}),
  ]);

  const packages = await Package.create([
    { name: "8 Seans Kilo Yönetimi", sessionCount: 8, price: 10000, order: 1 },
    { name: "4 Seans Kontrol", sessionCount: 4, price: 6000, order: 2 },
  ]);

  const people = [
    ["Ayşe", "Yılmaz", "0(532)111 22 33", "instagram"],
    ["Mehmet", "Kaya", "0(533)222 33 44", "google"],
    ["Zeynep", "Ak", "0(534)333 44 55", "danisan_tavsiyesi"],
    ["Elif", "Demir", "0(535)444 55 66", "web_sitesi"],
    ["Burak", "Şahin", "0(536)555 66 77", "klinik_ici"],
  ];

  for (let i = 0; i < people.length; i++) {
    const [firstName, lastName, phone, source] = people[i];
    const patient = await Patient.create({ firstName, lastName, phone, source });

    // Geçmiş bir seans: tamamlanmış ve tahsil edilmiş
    const past = await Booking.create({
      patient: patient._id,
      date: toUtcMidnight(isoOffset(-14)),
      time: "10:00",
      status: "geldi",
      fee: 1500,
    });
    await Payment.create({
      patient: patient._id,
      source: "booking",
      booking: past._id,
      amount: 1500,
      method: "nakit",
      date: past.date,
    });

    // Bugün: biri işlenmiş, kalanı bekliyor
    await Booking.create({
      patient: patient._id,
      date: toUtcMidnight(isoOffset(0)),
      time: `${pad(9 + (i % 8))}:30`,
      status: "planlandi",
    });

    // Gelecek randevu
    await Booking.create({
      patient: patient._id,
      date: toUtcMidnight(isoOffset(7)),
      time: "14:00",
      status: "planlandi",
    });

    await recalcVisitTypes(patient._id);
  }

  // Taksitli paket satışı: 10.000 ₺'nin 6.000'i tahsil edildi
  const first = await Patient.findOne();
  const sale = await PatientPackage.create({
    patient: first._id,
    package: packages[0]._id,
    name: packages[0].name,
    sessionCount: packages[0].sessionCount,
    price: packages[0].price,
    soldAt: toUtcMidnight(isoOffset(-20)),
  });
  await Payment.create([
    {
      patient: first._id,
      source: "package",
      patientPackage: sale._id,
      amount: 4000,
      method: "havale",
      date: toUtcMidnight(isoOffset(-20)),
    },
    {
      patient: first._id,
      source: "package",
      patientPackage: sale._id,
      amount: 2000,
      method: "nakit",
      date: toUtcMidnight(isoOffset(-5)),
    },
  ]);

  await Expense.create([
    { category: "vergi", amount: 3500, date: toUtcMidnight(isoOffset(-10)) },
    { category: "bagkur", amount: 2800, date: toUtcMidnight(isoOffset(-8)) },
    { category: "muhasebe", amount: 1200, date: toUtcMidnight(isoOffset(-3)) },
  ]);

  await AppointmentRequest.create([
    { name: "Ali Vural", email: "ali@example.com", phone: "05551234567" },
    { name: "Deniz Öz", email: "deniz@example.com", phone: "05559876543" },
  ]);

  console.log("Örnek veri yüklendi.");
  await mongoose.connection.close();
}

seed().catch(async (err) => {
  console.error(err);
  await mongoose.connection.close();
  process.exit(1);
});
```

- [ ] **Step 2: Çalıştır ve doğrula**

```bash
docker compose up -d --build
docker compose exec backend node src/scripts/seed-demo.js
curl -s http://localhost:5000/api/health
```

Expected: "Örnek veri yüklendi." ve health 200.

- [ ] **Step 3: Commit**

```bash
git add backend/src/scripts/seed-demo.js
git commit -m "chore: geliştirme için örnek veri script'i"
```

> **Faz 2 bitti.** Bu noktada backend tamamen yeni modelde ve tüm testler geçiyor, ama frontend hâlâ silinmiş `/api/admin/appointments` endpoint'ini çağırıyor. Panel Task 15'e kadar kısmen bozuk kalacak — canlı kullanım olmadığı için kabul edilebilir.

---

# Faz 3 — Frontend Temeli

Frontend'de test altyapısı yok. Her task'ın doğrulaması: `npx tsc --noEmit`, `npm run lint` ve tarayıcıda elle kontrol.

### Task 13: Ortak UI bileşen seti

`inputCls` string'i altı dosyada birebir kopyalanmış, `randevular` ile `giderler` neredeyse aynı iskelet, altı yerde native `confirm()` var (#9, #10). Yeni ekranları yazmadan önce ortak seti kuruyoruz — sonra yazmak hem hızlı hem tutarlı olur.

**Files:**
- Create: `frontend/src/components/admin/ui/Button.tsx`, `Field.tsx`, `Modal.tsx`, `ConfirmDialog.tsx`, `DataTable.tsx`, `Tabs.tsx`, `StatTile.tsx`, `EmptyState.tsx`, `Badge.tsx`, `index.ts`

**Interfaces:**
- Produces (hepsi `@/components/admin/ui` üzerinden export edilir):
  - `<Button variant="primary"|"secondary"|"danger"|"ghost" size="sm"|"md" loading?: boolean>`
  - `<Field label: string, error?: string, hint?: string>` — children'ı sarar
  - `INPUT_CLS: string` — ham `<input>` için ortak sınıf dizesi
  - `<Modal open, onClose, title, children, footer?>` — masaüstünde ortada, `<md` ekranda alttan açılan sheet
  - `useConfirm(): (opts: {title, message, confirmLabel?, danger?}) => Promise<boolean>` + `<ConfirmProvider>`
  - `<DataTable columns: Column<T>[], rows: T[], keyOf: (row)=>string, empty: ReactNode>` — `<md` ekranda karta düşer
  - `<Tabs items: {key, label, badge?}[], active, onChange>`
  - `<StatTile label, value, accent?, hint?>`
  - `<EmptyState title, description?, action?>`
  - `<Badge tone: "brand"|"emerald"|"amber"|"gray"|"red">`

- [ ] **Step 1: `Button`, `Badge`, `StatTile`, `EmptyState` yaz**

`frontend/src/components/admin/ui/Button.tsx`:

```tsx
"use client";

const VARIANTS = {
  primary: "bg-brand-500 hover:bg-brand-600 text-white",
  secondary: "border border-gray-300 text-gray-600 hover:bg-gray-50",
  danger: "bg-red-500 hover:bg-red-600 text-white",
  ghost: "text-gray-500 hover:text-gray-900",
} as const;

const SIZES = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-2.5 text-sm",
} as const;

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  children,
  ...rest
}: {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`rounded-xl font-semibold transition-colors disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading ? "Kaydediliyor…" : children}
    </button>
  );
}
```

`frontend/src/components/admin/ui/Badge.tsx`:

```tsx
const TONES = {
  brand: "bg-brand-50 text-brand-700",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  gray: "bg-gray-100 text-gray-500",
  red: "bg-red-50 text-red-600",
} as const;

export default function Badge({
  tone = "gray",
  children,
}: {
  tone?: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
```

`frontend/src/components/admin/ui/StatTile.tsx`:

```tsx
export default function StatTile({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string;
  accent?: boolean;
  hint?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p
        className={`text-2xl font-bold mt-1 tabular-nums ${accent ? "text-brand-600" : "text-gray-900"}`}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
```

`frontend/src/components/admin/ui/EmptyState.tsx`:

```tsx
export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
      <p className="text-gray-900 font-medium">{title}</p>
      {description && (
        <p className="text-sm text-gray-400 mt-1">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 2: `Field` ve `INPUT_CLS` yaz**

`frontend/src/components/admin/ui/Field.tsx`:

```tsx
// Altı dosyada kopyalanan input sınıf dizesinin tek kaynağı.
export const INPUT_CLS =
  "w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400";

export default function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: `Modal` yaz (mobilde bottom sheet)**

`frontend/src/components/admin/ui/Modal.tsx`:

```tsx
"use client";

import { useEffect } from "react";

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  // Escape ile kapat, açıkken arka planı kaydırma.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30 md:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full md:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl md:rounded-2xl p-6 shadow-xl"
      >
        <h2 className="font-semibold text-gray-900 mb-4">{title}</h2>
        {children}
        {footer && <div className="flex gap-3 justify-end mt-6">{footer}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `ConfirmDialog` + `useConfirm` yaz**

`frontend/src/components/admin/ui/ConfirmDialog.tsx`:

```tsx
"use client";

import { createContext, useCallback, useContext, useState } from "react";
import Modal from "./Modal";
import Button from "./Button";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
}

type Resolver = (ok: boolean) => void;

const ConfirmContext = createContext<
  ((opts: ConfirmOptions) => Promise<boolean>) | null
>(null);

// Native confirm() yerine: tasarımla uyumlu ve mobilde kullanılabilir.
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    opts: ConfirmOptions;
    resolve: Resolver;
  } | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setState({ opts, resolve })),
    [],
  );

  const close = (ok: boolean) => {
    state?.resolve(ok);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={state !== null}
        onClose={() => close(false)}
        title={state?.opts.title ?? ""}
        footer={
          <>
            <Button
              variant={state?.opts.danger ? "danger" : "primary"}
              onClick={() => close(true)}
            >
              {state?.opts.confirmLabel ?? "Onayla"}
            </Button>
            <Button variant="secondary" onClick={() => close(false)}>
              Vazgeç
            </Button>
          </>
        }
      >
        {state?.opts.message && (
          <p className="text-sm text-gray-600">{state.opts.message}</p>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider");
  return ctx;
}
```

- [ ] **Step 5: `Tabs` ve `DataTable` yaz**

`frontend/src/components/admin/ui/Tabs.tsx`:

```tsx
"use client";

export default function Tabs<T extends string>({
  items,
  active,
  onChange,
}: {
  items: { key: T; label: string; badge?: number }[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
            active === item.key
              ? "border-brand-500 text-brand-600"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          {item.label}
          {item.badge ? (
            <span className="ml-2 text-xs bg-brand-50 text-brand-700 rounded-full px-2 py-0.5">
              {item.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
```

`frontend/src/components/admin/ui/DataTable.tsx`:

```tsx
"use client";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  // Mobil kartta gizlenecek sütunlar için
  hideOnMobile?: boolean;
  align?: "left" | "right";
}

// Masaüstünde tablo, <md ekranda kart listesi. Yatay kaydırma yok.
export default function DataTable<T>({
  columns,
  rows,
  keyOf,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  keyOf: (row: T) => string;
  empty: React.ReactNode;
}) {
  if (rows.length === 0) return <>{empty}</>;

  return (
    <>
      <div className="hidden md:block bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-6 py-4 font-semibold text-gray-600 ${c.align === "right" ? "text-right" : "text-left"}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={keyOf(row)} className="hover:bg-gray-50">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-6 py-4 ${c.align === "right" ? "text-right" : ""}`}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {rows.map((row) => (
          <div
            key={keyOf(row)}
            className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2"
          >
            {columns
              .filter((c) => !c.hideOnMobile)
              .map((c) => (
                <div key={c.key} className="flex justify-between gap-3">
                  <span className="text-xs text-gray-400 shrink-0">
                    {c.header}
                  </span>
                  <span className="text-sm text-right min-w-0">
                    {c.render(row)}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 6: Barrel dosyasını yaz**

`frontend/src/components/admin/ui/index.ts`:

```ts
export { default as Button } from "./Button";
export { default as Badge } from "./Badge";
export { default as StatTile } from "./StatTile";
export { default as EmptyState } from "./EmptyState";
export { default as Field, INPUT_CLS } from "./Field";
export { default as Modal } from "./Modal";
export { default as Tabs } from "./Tabs";
export { default as DataTable, type Column } from "./DataTable";
export { ConfirmProvider, useConfirm } from "./ConfirmDialog";
```

- [ ] **Step 7: Doğrula ve commit**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: hata yok

```bash
git add frontend/src/components/admin/ui
git commit -m "feat: admin paneli için ortak UI bileşen seti

Altı dosyada kopyalanan input sınıfı, altı yerdeki native confirm() ve
tekrarlanan tablo/modal iskeletleri tek yerde toplandı. Modal ve
DataTable mobilde sırasıyla bottom sheet ve kart listesine düşüyor."
```

---

### Task 14: Responsive layout ve navigasyon

Sidebar `w-72` sabit; telefonda içeriği eziyor ve gizlenemiyor. Aktif sayfa vurgusu da yok — layout server component olduğu için `usePathname` kullanılamıyor (#7).

**Files:**
- Create: `frontend/src/components/admin/AdminNav.tsx`, `frontend/src/components/admin/MobileTabBar.tsx`
- Modify: `frontend/src/app/admin/(panel)/layout.tsx`

**Interfaces:**
- Consumes: `adminGetBadges` (Task 15'te eklenecek — bu task'ta geçici olarak `fetch("/api/admin/badges")` yerine prop ile 0 geçilir, Task 15 sonrası bağlanır)
- Produces:
  - `NAV_ITEMS: { href, label, icon, group }[]` — `AdminNav.tsx`'ten export edilir, `MobileTabBar` de kullanır
  - `<AdminNav email={string} signOut={ReactNode} />`

- [ ] **Step 1: Navigasyon tanımını ve sidebar'ı yaz**

`frontend/src/components/admin/AdminNav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  group: "gunluk" | "finans" | "icerik";
  mobile?: boolean;
}

// Kullanım sıklığına göre sıralı. `mobile: true` olanlar alt sekme
// çubuğunda görünür; kalanı "Daha fazla" sayfasına düşer.
export const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Bugün", icon: "☀️", group: "gunluk", mobile: true },
  { href: "/admin/takvim", label: "Takvim", icon: "📆", group: "gunluk", mobile: true },
  { href: "/admin/hastalar", label: "Danışanlar", icon: "👥", group: "gunluk", mobile: true },
  { href: "/admin/talepler", label: "Talepler", icon: "📨", group: "gunluk" },
  { href: "/admin/finans", label: "Finans", icon: "💰", group: "finans", mobile: true },
  { href: "/admin/istatistik", label: "İstatistikler", icon: "📈", group: "finans" },
  { href: "/admin/blog", label: "Blog Yazıları", icon: "📝", group: "icerik" },
  { href: "/admin/sss", label: "SSS", icon: "❓", group: "icerik" },
];

const GROUPS: { key: NavItem["group"]; label: string }[] = [
  { key: "gunluk", label: "Günlük" },
  { key: "finans", label: "Finans" },
  { key: "icerik", label: "İçerik" },
];

// "/admin" yalnızca tam eşleşmede aktif; diğerleri alt yolları da kapsar.
export function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export default function AdminNav({
  email,
  signOut,
  pendingRequests = 0,
}: {
  email: string;
  signOut: React.ReactNode;
  pendingRequests?: number;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-72 bg-white border-r border-gray-200 flex-col shrink-0">
      <div className="p-6 border-b border-gray-200">
        <p className="font-bold text-brand-600 text-lg">Admin Panel</p>
        <p className="text-xs text-gray-400 mt-0.5">{email}</p>
      </div>
      <nav className="flex-1 p-4 overflow-y-auto">
        {GROUPS.map((group) => (
          <div key={group.key} className="mb-5 last:mb-0">
            <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {group.label}
            </p>
            <ul className="space-y-1">
              {NAV_ITEMS.filter((i) => i.group === group.key).map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(pathname, item.href) ? "page" : undefined}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(pathname, item.href)
                        ? "bg-brand-50 text-brand-600"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span aria-hidden>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.href === "/admin/talepler" && pendingRequests > 0 && (
                      <span className="text-xs bg-brand-500 text-white rounded-full px-2 py-0.5">
                        {pendingRequests}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-200">{signOut}</div>
    </aside>
  );
}
```

- [ ] **Step 2: Alt sekme çubuğunu yaz**

`frontend/src/components/admin/MobileTabBar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_ITEMS, isActive } from "./AdminNav";
import Modal from "./ui/Modal";

const PRIMARY = NAV_ITEMS.filter((i) => i.mobile);
const SECONDARY = NAV_ITEMS.filter((i) => !i.mobile);

export default function MobileTabBar({
  signOut,
  pendingRequests = 0,
}: {
  signOut: React.ReactNode;
  pendingRequests?: number;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const tabCls = (active: boolean) =>
    `flex-1 flex flex-col items-center gap-0.5 py-2 min-h-[56px] justify-center text-[11px] font-medium ${
      active ? "text-brand-600" : "text-gray-500"
    }`;

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 flex">
        {PRIMARY.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
            className={tabCls(isActive(pathname, item.href))}
          >
            <span aria-hidden className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
        <button onClick={() => setMoreOpen(true)} className={tabCls(false)}>
          <span aria-hidden className="text-base">⋯</span>
          Daha fazla
          {pendingRequests > 0 && (
            <span className="absolute top-1 right-6 w-2 h-2 rounded-full bg-brand-500" />
          )}
        </button>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Daha fazla">
        <ul className="space-y-1">
          {SECONDARY.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <span aria-hidden>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.href === "/admin/talepler" && pendingRequests > 0 && (
                  <span className="text-xs bg-brand-500 text-white rounded-full px-2 py-0.5">
                    {pendingRequests}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-4 pt-4 border-t border-gray-200">{signOut}</div>
      </Modal>
    </>
  );
}
```

- [ ] **Step 3: Layout'u yeniden yaz**

`frontend/src/app/admin/(panel)/layout.tsx`:

```tsx
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import NextAuthProvider from "@/providers/NextAuthProvider";
import { ConfirmProvider } from "@/components/admin/ui";
import AdminNav from "@/components/admin/AdminNav";
import MobileTabBar from "@/components/admin/MobileTabBar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const signOutButton = (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/admin/login" });
      }}
    >
      <button
        type="submit"
        className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-red-500 transition-colors"
      >
        🚪 Çıkış Yap
      </button>
    </form>
  );

  return (
    <NextAuthProvider>
      <ConfirmProvider>
        <div className="min-h-screen bg-gray-50 flex">
          <AdminNav email={session.user?.email ?? ""} signOut={signOutButton} />
          {/* Alt sekme çubuğunun altında kalmaması için mobilde alt boşluk */}
          <main className="flex-1 min-w-0 p-4 md:p-8 pb-24 md:pb-8 overflow-auto">
            {children}
          </main>
          <MobileTabBar signOut={signOutButton} />
        </div>
      </ConfirmProvider>
    </NextAuthProvider>
  );
}
```

> Rozet sayısı bu adımda 0. Task 15'te `adminGetBadges` eklendikten sonra `AdminNav`/`MobileTabBar` içine küçük bir `useEffect` ile bağlanacak (Task 15 Step 5).

- [ ] **Step 4: Doğrula**

Run: `cd frontend && npx tsc --noEmit && npm run lint`

Tarayıcıda: pencereyi 375px genişliğe daralt, sidebar'ın kaybolup alt çubuğun geldiğini, "Daha fazla" sayfasının açıldığını ve aktif sekmenin vurgulandığını doğrula.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/admin/AdminNav.tsx frontend/src/components/admin/MobileTabBar.tsx "frontend/src/app/admin/(panel)/layout.tsx"
git commit -m "feat: panel mobilde kullanılabilir, aktif sayfa vurgusu geldi

Sidebar w-72 sabitti ve telefonda içeriği eziyordu; <md ekranda alt
sekme çubuğuna düşüyor. Navigasyon kullanım sıklığına göre üç gruba
ayrıldı ve usePathname ile aktif sayfa vurgulanıyor."
```

---

### Task 15: API katmanı ve tipler

Backend yüzeyi tamamen değişti. `api.ts` ve `types/index.ts` yeni modele uyarlanır; `Appointment` ile ilgili her şey silinir.

**Files:**
- Modify: `frontend/src/lib/api.ts`, `frontend/src/types/index.ts`
- Create: `frontend/src/lib/paymentMethod.ts`, `frontend/src/lib/requestStatus.ts`

**Interfaces:**
- Produces (yeni tipler):
  ```ts
  Package, PatientPackage, Payment, PaymentMethod, AppointmentRequest,
  RequestStatus, PatientListResponse, PaymentListResponse, TodayResponse
  ```
- Produces (yeni API fonksiyonları): `adminGetPackages`, `adminCreatePackage`, `adminUpdatePackage`, `adminDeletePackage`, `adminGetPatientPackages`, `adminCreatePatientPackage`, `adminDeletePatientPackage`, `adminGetPayments`, `adminCreatePayment`, `adminUpdatePayment`, `adminDeletePayment`, `adminGetRequests`, `adminConvertRequest`, `adminUpdateRequest`, `adminGetToday`, `adminGetBadges`, `adminCompleteBooking`
- **Kırıcı:** `adminGetPatients` artık `PatientListResponse` döner; `adminGet/Create/Update/DeleteAppointment` silinir.

- [ ] **Step 1: Tipleri güncelle**

`frontend/src/types/index.ts` — `Appointment` ve `AppointmentListResponse` arayüzlerini sil, şunları ekle:

```ts
export type PaymentMethod = "nakit" | "kart" | "havale";
export type PaymentSource = "booking" | "package";
export type RequestStatus = "yeni" | "donusturuldu" | "yoksayildi";
export type PatientPackageStatus = "aktif" | "tamamlandi" | "iptal";

export interface Package {
  _id: string;
  name: string;
  sessionCount: number;
  price: number;
  isActive: boolean;
  order: number;
}

export interface PatientPackage {
  _id: string;
  patient: Pick<Patient, "_id" | "firstName" | "lastName" | "phone">;
  package: string | null;
  name: string;
  sessionCount: number;
  price: number;
  soldAt: string;
  status: PatientPackageStatus;
  note: string;
  // Sunucuda türetilir, saklanmaz
  usedSessions: number;
  remainingSessions: number;
  paidAmount: number;
  remainingDebt: number;
}

export interface Payment {
  _id: string;
  patient: Pick<Patient, "_id" | "firstName" | "lastName" | "phone">;
  source: PaymentSource;
  booking: Pick<Booking, "_id" | "date" | "time"> | null;
  patientPackage: Pick<PatientPackage, "_id" | "name"> | null;
  amount: number;
  method: PaymentMethod;
  date: string;
  documentNumber: string;
  note: string;
}

export interface PaymentListResponse {
  payments: Payment[];
  total: number;
  count: number;
}

export interface PatientListResponse {
  patients: Patient[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AppointmentRequest {
  _id: string;
  name: string;
  email: string;
  phone: string;
  status: RequestStatus;
  patient: Pick<Patient, "_id" | "firstName" | "lastName"> | null;
  createdAt: string;
}

export interface TodayResponse {
  date: string;
  bookings: Booking[];
  unprocessedCount: number;
  collectedToday: number;
  outstandingReceivables: number;
  endingPackages: {
    patient: Pick<Patient, "_id" | "firstName" | "lastName">;
    name: string;
    remainingSessions: number;
  }[];
  pendingRequests: number;
}
```

`Booking` arayüzüne ekle:

```ts
  fee: number;
  patientPackage: string | null;
```

`StatsResponse` arayüzüne ekle:

```ts
  outstandingReceivables: number;
  sessionRevenue: number;
  packageRevenue: number;
  topDebtors: { name: string; phone: string; debt: number }[];
```

`StatsResponse.paymentBreakdown` içindeki `method` tipini `PaymentMethod` yap.

- [ ] **Step 2: Etiket sözlüklerini yaz**

`frontend/src/lib/paymentMethod.ts`:

```ts
import type { PaymentMethod } from "@/types";

export const PAYMENT_METHOD: Record<
  PaymentMethod,
  { label: string; badge: string }
> = {
  nakit: { label: "Nakit", badge: "bg-emerald-50 text-emerald-700" },
  kart: { label: "Kart", badge: "bg-brand-50 text-brand-700" },
  havale: { label: "Havale", badge: "bg-indigo-50 text-indigo-700" },
};

export const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = [
  "nakit",
  "kart",
  "havale",
];
```

`frontend/src/lib/requestStatus.ts`:

```ts
import type { RequestStatus } from "@/types";

export const REQUEST_STATUS: Record<
  RequestStatus,
  { label: string; badge: string }
> = {
  yeni: { label: "Yeni", badge: "bg-brand-50 text-brand-700" },
  donusturuldu: { label: "Danışana dönüştürüldü", badge: "bg-emerald-50 text-emerald-700" },
  yoksayildi: { label: "Yoksayıldı", badge: "bg-gray-100 text-gray-500" },
};
```

- [ ] **Step 3: `api.ts`'i güncelle**

Sil: `adminGetAppointments`, `adminCreateAppointment`, `adminUpdateAppointment`, `adminDeleteAppointment` ve `Appointment`/`AppointmentListResponse` import'ları.

`adminGetPatients` imzasını değiştir:

```ts
export function adminGetPatients(
  token: string,
  params?: { q?: string; page?: number; limit?: number },
) {
  const q = new URLSearchParams();
  if (params?.q) q.set("q", params.q);
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return adminFetch<PatientListResponse>(
    `/api/admin/patients${qs ? `?${qs}` : ""}`,
    token,
  );
}
```

`adminCreateBooking` / `adminUpdateBooking` gövde tiplerinden `completionPayment` alanını çıkar. Yeni fonksiyonları ekle:

```ts
// ─── Randevu sonuçlandırma ─────────────────────────────────────

export function adminCompleteBooking(
  id: string,
  data: {
    status: "geldi" | "gelmedi" | "iptal";
    fee?: number;
    patientPackage?: string | null;
    cancelReason?: string | null;
    payment?: {
      amount: number;
      method: PaymentMethod;
      documentNumber?: string;
    };
  },
  token: string,
) {
  return adminFetch<Booking>(`/api/admin/bookings/${id}/complete`, token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── Paketler ──────────────────────────────────────────────────

export function adminGetPackages(token: string, activeOnly = false) {
  return adminFetch<Package[]>(
    `/api/admin/packages${activeOnly ? "?activeOnly=true" : ""}`,
    token,
  );
}

export function adminCreatePackage(data: Partial<Package>, token: string) {
  return adminFetch<Package>("/api/admin/packages", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function adminUpdatePackage(
  id: string,
  data: Partial<Package>,
  token: string,
) {
  return adminFetch<Package>(`/api/admin/packages/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function adminDeletePackage(id: string, token: string) {
  return adminFetch<{ message: string }>(`/api/admin/packages/${id}`, token, {
    method: "DELETE",
  });
}

// ─── Satılan paketler ──────────────────────────────────────────

export function adminGetPatientPackages(
  token: string,
  params?: { patient?: string; from?: string; to?: string },
) {
  const q = new URLSearchParams();
  if (params?.patient) q.set("patient", params.patient);
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  const qs = q.toString();
  return adminFetch<PatientPackage[]>(
    `/api/admin/patient-packages${qs ? `?${qs}` : ""}`,
    token,
  );
}

export function adminCreatePatientPackage(
  data: {
    patient: string;
    package?: string | null;
    name: string;
    sessionCount: number;
    price: number;
    soldAt: string;
    note?: string;
  },
  token: string,
) {
  return adminFetch<PatientPackage>("/api/admin/patient-packages", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function adminDeletePatientPackage(id: string, token: string) {
  return adminFetch<{ message: string }>(
    `/api/admin/patient-packages/${id}`,
    token,
    { method: "DELETE" },
  );
}

// ─── Tahsilatlar ───────────────────────────────────────────────

export function adminGetPayments(
  token: string,
  params?: { from?: string; to?: string; patient?: string },
) {
  const q = new URLSearchParams();
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  if (params?.patient) q.set("patient", params.patient);
  const qs = q.toString();
  return adminFetch<PaymentListResponse>(
    `/api/admin/payments${qs ? `?${qs}` : ""}`,
    token,
  );
}

export function adminCreatePayment(
  data: {
    patient: string;
    source: PaymentSource;
    booking?: string | null;
    patientPackage?: string | null;
    amount: number;
    method: PaymentMethod;
    date: string;
    documentNumber?: string;
    note?: string;
  },
  token: string,
) {
  return adminFetch<Payment>("/api/admin/payments", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function adminUpdatePayment(
  id: string,
  data: Parameters<typeof adminCreatePayment>[0],
  token: string,
) {
  return adminFetch<Payment>(`/api/admin/payments/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function adminDeletePayment(id: string, token: string) {
  return adminFetch<{ message: string }>(`/api/admin/payments/${id}`, token, {
    method: "DELETE",
  });
}

// ─── Randevu talepleri ─────────────────────────────────────────

export function adminGetRequests(token: string, status?: RequestStatus) {
  return adminFetch<AppointmentRequest[]>(
    `/api/admin/requests${status ? `?status=${status}` : ""}`,
    token,
  );
}

export function adminConvertRequest(
  id: string,
  data: {
    firstName: string;
    lastName: string;
    phone: string;
    source?: string | null;
    note?: string;
    booking?: { date: string; time?: string };
  },
  token: string,
) {
  return adminFetch<{
    request: AppointmentRequest;
    patient: Patient;
    booking: Booking | null;
  }>(`/api/admin/requests/${id}/convert`, token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function adminUpdateRequest(
  id: string,
  status: RequestStatus,
  token: string,
) {
  return adminFetch<AppointmentRequest>(`/api/admin/requests/${id}`, token, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

// ─── Bugün / rozetler ──────────────────────────────────────────

export function adminGetToday(token: string, date?: string) {
  return adminFetch<TodayResponse>(
    `/api/admin/today${date ? `?date=${date}` : ""}`,
    token,
  );
}

export function adminGetBadges(token: string) {
  return adminFetch<{ pendingRequests: number }>("/api/admin/badges", token);
}
```

Import bloğunu yeni tiplerle güncelle.

- [ ] **Step 4: Kırılan çağrı yerlerini geçici olarak düzelt**

`adminGetPatients` artık nesne döndüğü için üç yerde `.patients` eklenmesi gerekiyor. Bu dosyalar sonraki task'larda tamamen yeniden yazılacak; şimdilik derlemeyi geçirmek için minimal düzelt:

- `frontend/src/app/admin/(panel)/takvim/page.tsx:66` → `adminGetPatients(token).then((r) => setPatients(r.patients))`
- `frontend/src/app/admin/(panel)/hastalar/page.tsx:456` → `setPatients((await adminGetPatients(token)).patients)`
- `frontend/src/app/admin/(panel)/page.tsx` → `patients.length` yerine `patients.total`

`randevular/page.tsx` silinmiş `adminGetAppointments`'ı çağırıyor. Klasörü şimdi sil:

```bash
git rm -r "frontend/src/app/admin/(panel)/randevular"
```

- [ ] **Step 5: Rozeti navigasyona bağla**

`AdminNav.tsx` ve `MobileTabBar.tsx` içinde `pendingRequests` prop'unu prop olmaktan çıkarıp ortak bir hook'la doldur. `frontend/src/components/admin/useBadges.ts`:

```ts
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { adminGetBadges } from "@/lib/api";

// Sidebar rozeti. Sayfa geçişlerinde tazelenir; hata sessizce yutulur —
// rozet kritik bilgi değil, panelin çalışmasını engellememeli.
export function usePendingRequests() {
  const { data: session } = useSession();
  const token = (session as { backendToken?: string })?.backendToken ?? "";
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    adminGetBadges(token)
      .then((b) => setCount(b.pendingRequests))
      .catch(() => {});
  }, [token]);

  return count;
}
```

Her iki bileşende `pendingRequests` prop'unu kaldır, yerine `const pendingRequests = usePendingRequests();` kullan. `layout.tsx`'te prop geçmeyi bırak.

- [ ] **Step 6: Doğrula ve commit**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: hata yok

```bash
git add frontend/src/lib frontend/src/types frontend/src/components/admin "frontend/src/app/admin/(panel)"
git commit -m "refactor: API katmanı yeni veri modeline taşındı

Appointment fonksiyonları silindi; paket, tahsilat, talep, bugün ve
rozet endpoint'leri eklendi. adminGetPatients artık sayfalanmış yanıt
döndüğü için çağrı yerleri uyarlandı."
```

---

# Faz 4 — Ekranlar

### Task 16: "İşle" modalı

Takvimdeki üç ayrı buton (Tamamla / Gelmedi / İptal) ve üç ayrı hızlı-durum state'i tek bileşene iner. Bugün ekranı ve takvim ikisi de bunu kullanır.

**Files:**
- Create: `frontend/src/components/admin/BookingActionSheet.tsx`

**Interfaces:**
- Consumes: `adminCompleteBooking`, `adminGetPatientPackages` (Task 15)
- Produces: `<BookingActionSheet booking={Booking | null} token onClose onSaved />`

- [ ] **Step 1: Bileşeni yaz**

`frontend/src/components/admin/BookingActionSheet.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { adminCompleteBooking, adminGetPatientPackages } from "@/lib/api";
import { CANCEL_REASON, CANCEL_REASON_OPTIONS } from "@/lib/bookingCancelReason";
import { PAYMENT_METHOD, PAYMENT_METHOD_OPTIONS } from "@/lib/paymentMethod";
import { SelectInput } from "@/components/admin/DateTimeInput";
import { Button, Field, INPUT_CLS, Modal } from "@/components/admin/ui";
import type { Booking, BookingCancelReason, PatientPackage, PaymentMethod } from "@/types";

type Outcome = "geldi" | "gelmedi" | "iptal";

const OUTCOMES: { key: Outcome; label: string }[] = [
  { key: "geldi", label: "Geldi" },
  { key: "gelmedi", label: "Gelmedi" },
  { key: "iptal", label: "İptal" },
];

export default function BookingActionSheet({
  booking,
  token,
  onClose,
  onSaved,
}: {
  booking: Booking | null;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [outcome, setOutcome] = useState<Outcome>("geldi");
  const [packages, setPackages] = useState<PatientPackage[]>([]);
  const [usePackage, setUsePackage] = useState(false);
  const [packageId, setPackageId] = useState("");
  const [fee, setFee] = useState(0);
  const [collectNow, setCollectNow] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>("nakit");
  const [documentNumber, setDocumentNumber] = useState("");
  const [reason, setReason] = useState<BookingCancelReason>("belirtilmedi");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Danışanın kullanılabilir paketi varsa "paketten düş" öne çıksın.
  useEffect(() => {
    if (!booking || !token) return;
    setOutcome("geldi");
    setFee(0);
    setCollectNow(true);
    setMethod("nakit");
    setDocumentNumber("");
    setReason("belirtilmedi");
    setError("");

    adminGetPatientPackages(token, { patient: booking.patient._id })
      .then((all) => {
        const usable = all.filter(
          (p) => p.status === "aktif" && p.remainingSessions > 0,
        );
        setPackages(usable);
        setUsePackage(usable.length > 0);
        setPackageId(usable[0]?._id ?? "");
      })
      .catch(() => {
        setPackages([]);
        setUsePackage(false);
      });
  }, [booking, token]);

  if (!booking) return null;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      if (outcome === "geldi") {
        await adminCompleteBooking(
          booking._id,
          usePackage
            ? { status: "geldi", patientPackage: packageId }
            : {
                status: "geldi",
                fee,
                payment: collectNow
                  ? { amount: fee, method, documentNumber }
                  : undefined,
              },
          token,
        );
      } else {
        await adminCompleteBooking(
          booking._id,
          { status: outcome, cancelReason: reason },
          token,
        );
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${booking.time || ""} ${booking.patient.firstName} ${booking.patient.lastName}`.trim()}
      footer={
        <>
          <Button onClick={handleSave} loading={saving}>
            Kaydet
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Vazgeç
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Ne oldu?</p>
          <div className="grid grid-cols-3 gap-2">
            {OUTCOMES.map((o) => (
              <button
                key={o.key}
                onClick={() => setOutcome(o.key)}
                className={`py-3 rounded-xl text-sm font-medium border transition-colors ${
                  outcome === o.key
                    ? "bg-brand-500 border-brand-500 text-white"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {outcome === "geldi" ? (
          <>
            {packages.length > 0 && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    checked={usePackage}
                    onChange={() => setUsePackage(true)}
                  />
                  Paketten düş
                </label>
                {usePackage && (
                  <SelectInput
                    value={packageId}
                    onChange={setPackageId}
                    inputClassName={INPUT_CLS}
                    options={packages.map((p) => ({
                      value: p._id,
                      label: `${p.name} · ${p.usedSessions}/${p.sessionCount}`,
                    }))}
                  />
                )}
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    checked={!usePackage}
                    onChange={() => setUsePackage(false)}
                  />
                  Tek seans
                </label>
              </div>
            )}

            {!usePackage && (
              <>
                <Field label="Ücret (₺)">
                  <input
                    type="number"
                    min={0}
                    value={fee === 0 ? "" : fee}
                    placeholder="0"
                    onChange={(e) => setFee(Number(e.target.value))}
                    className={INPUT_CLS}
                  />
                </Field>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Tahsilat</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCollectNow(true)}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                        collectNow
                          ? "bg-brand-500 border-brand-500 text-white"
                          : "border-gray-300 text-gray-600"
                      }`}
                    >
                      Tahsil edildi
                    </button>
                    <button
                      onClick={() => setCollectNow(false)}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                        !collectNow
                          ? "bg-amber-500 border-amber-500 text-white"
                          : "border-gray-300 text-gray-600"
                      }`}
                    >
                      Sonra
                    </button>
                  </div>
                </div>

                {collectNow && (
                  <>
                    <Field label="Ödeme Yöntemi">
                      <SelectInput
                        value={method}
                        onChange={(v) => setMethod(v as PaymentMethod)}
                        inputClassName={INPUT_CLS}
                        options={PAYMENT_METHOD_OPTIONS.map((m) => ({
                          value: m,
                          label: PAYMENT_METHOD[m].label,
                        }))}
                      />
                    </Field>
                    <Field label="Belge / Fatura No" hint="Opsiyonel">
                      <input
                        value={documentNumber}
                        onChange={(e) => setDocumentNumber(e.target.value)}
                        className={INPUT_CLS}
                      />
                    </Field>
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <Field label="Neden">
            <SelectInput
              value={reason}
              onChange={(v) => setReason(v as BookingCancelReason)}
              inputClassName={INPUT_CLS}
              options={CANCEL_REASON_OPTIONS.map((r) => ({
                value: r,
                label: CANCEL_REASON[r].label,
              }))}
            />
          </Field>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Doğrula ve commit**

Run: `cd frontend && npx tsc --noEmit && npm run lint`

```bash
git add frontend/src/components/admin/BookingActionSheet.tsx
git commit -m "feat: randevu sonuçlandırma için tek 'İşle' modalı"
```

---

### Task 17: "Bugün" ekranı

**Files:**
- Modify (tamamen yeniden yaz): `frontend/src/app/admin/(panel)/page.tsx`

**Interfaces:**
- Consumes: `adminGetToday` (Task 15), `BookingActionSheet` (Task 16), UI seti (Task 13)

- [ ] **Step 1: Ekranı yaz**

`frontend/src/app/admin/(panel)/page.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { adminGetToday } from "@/lib/api";
import { formatTRY } from "@/lib/periods";
import { STATUS } from "@/lib/bookingStatus";
import { Badge, Button, EmptyState, StatTile } from "@/components/admin/ui";
import BookingActionSheet from "@/components/admin/BookingActionSheet";
import type { Booking, TodayResponse } from "@/types";

export default function AdminTodayPage() {
  const { data: session } = useSession();
  const token = (session as { backendToken?: string })?.backendToken ?? "";

  const [data, setData] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<Booking | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setData(await adminGetToday(token));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const todayLabel = new Date().toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Bugün</h1>
      <p className="text-gray-500 mb-6 capitalize">{todayLabel}</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile
          label="Randevu"
          value={loading ? "…" : String(data?.bookings.length ?? 0)}
        />
        <StatTile
          label="İşlenmedi"
          value={loading ? "…" : String(data?.unprocessedCount ?? 0)}
          accent={(data?.unprocessedCount ?? 0) > 0}
        />
        <StatTile
          label="Bugün Tahsil Edilen"
          value={loading ? "…" : formatTRY(data?.collectedToday ?? 0)}
        />
        <StatTile
          label="Bekleyen Alacak"
          value={loading ? "…" : formatTRY(data?.outstandingReceivables ?? 0)}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Günün Programı</h2>
          <Link href="/admin/takvim" className="text-sm text-brand-600 hover:underline">
            Takvim →
          </Link>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Yükleniyor…</p>
        ) : data && data.bookings.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {data.bookings.map((b) => (
              <div key={b._id} className="flex items-center gap-3 py-3 flex-wrap">
                <span className="text-sm font-semibold text-gray-900 tabular-nums w-14 shrink-0">
                  {b.time || "—"}
                </span>
                <span className="flex-1 min-w-0 text-sm text-gray-900 truncate">
                  {b.patient.firstName} {b.patient.lastName}
                </span>
                {b.status === "geldi" && b.fee > 0 && (
                  <span className="text-sm text-gray-500 tabular-nums">
                    {formatTRY(b.fee)}
                  </span>
                )}
                {b.status === "planlandi" ? (
                  <Button size="sm" onClick={() => setActing(b)}>
                    İşle
                  </Button>
                ) : (
                  <Badge
                    tone={
                      b.status === "geldi"
                        ? "emerald"
                        : b.status === "gelmedi"
                          ? "amber"
                          : "gray"
                    }
                  >
                    {STATUS[b.status].label}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Bugün randevu yok.</p>
        )}
      </div>

      <h2 className="font-semibold text-gray-900 mb-3">Dikkat</h2>
      {loading ? (
        <p className="text-gray-400 text-sm">Yükleniyor…</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
          <Link
            href="/admin/finans"
            className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
          >
            <span className="text-sm text-gray-700">Tahsil edilmemiş tutar</span>
            <span className="text-sm font-semibold text-amber-600 tabular-nums">
              {formatTRY(data?.outstandingReceivables ?? 0)}
            </span>
          </Link>
          <Link
            href="/admin/talepler"
            className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
          >
            <span className="text-sm text-gray-700">Bekleyen randevu talebi</span>
            <span className="text-sm font-semibold text-brand-600">
              {data?.pendingRequests ?? 0}
            </span>
          </Link>
          {(data?.endingPackages.length ?? 0) > 0 && (
            <div className="px-6 py-4">
              <p className="text-sm text-gray-700 mb-2">Paketi bitmek üzere</p>
              <ul className="space-y-1">
                {data?.endingPackages.map((p, i) => (
                  <li key={i} className="text-sm text-gray-500">
                    <Link
                      href={`/admin/hastalar/${p.patient._id}`}
                      className="hover:text-brand-600"
                    >
                      {p.patient.firstName} {p.patient.lastName}
                    </Link>{" "}
                    · {p.name} · {p.remainingSessions} seans kaldı
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {(data?.bookings.length ?? 0) === 0 && !loading && (
        <div className="mt-8">
          <EmptyState
            title="Bugün için planlanmış randevu yok"
            description="Takvimden yeni randevu ekleyebilirsin."
            action={
              <Link href="/admin/takvim">
                <Button>Takvime git</Button>
              </Link>
            }
          />
        </div>
      )}

      <BookingActionSheet
        booking={acting}
        token={token}
        onClose={() => setActing(null)}
        onSaved={() => {
          setActing(null);
          load();
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Doğrula**

Run: `cd frontend && npx tsc --noEmit && npm run lint`

Tarayıcıda `/admin`: seed verisiyle bugünün randevuları listelenmeli, "İşle" modalı açılıp kaydettikten sonra sayılar güncellenmeli.

- [ ] **Step 3: Commit**

```bash
git add "frontend/src/app/admin/(panel)/page.tsx"
git commit -m "feat: dashboard yerine günlük operasyon ekranı

Navigasyon kartları sidebar'la mükerrerdi. Yerine günün programı,
işlenmemiş randevu sayısı, bugünkü tahsilat ve dikkat gerektiren
kalemler geldi."
```

---

### Task 18: Takvim ekranını uyarla

**Files:**
- Modify: `frontend/src/app/admin/(panel)/takvim/page.tsx`

- [ ] **Step 1: Hızlı durum state'lerini kaldır**

Şu state'leri ve `openQuickStatus`/`saveQuickStatus` fonksiyonlarını sil: `quickBooking`, `quickStatus`, `quickAmount`, `quickPayment`, `quickDocument`, `quickReason`, `quickSaving`. Dosyanın sonundaki `{quickBooking && (...)}` modal bloğunu da sil.

Yerine tek state: `const [acting, setActing] = useState<Booking | null>(null);`

Gün panelindeki üç butonu tek butonla değiştir:

```tsx
{b.status === "planlandi" && (
  <Button size="sm" onClick={() => setActing(b)}>
    İşle
  </Button>
)}
```

Dosyanın sonuna, `showForm` modalından sonra ekle:

```tsx
<BookingActionSheet
  booking={acting}
  token={token}
  onClose={() => setActing(null)}
  onSaved={() => {
    setActing(null);
    fetchBookings();
  }}
/>
```

- [ ] **Step 2: `confirm()` yerine `useConfirm` kullan**

`handleDelete` içindeki `confirm(...)` çağrısını değiştir:

```tsx
const confirm = useConfirm();

const handleDelete = async (b: Booking) => {
  const ok = await confirm({
    title: "Randevu silinsin mi?",
    message: `${b.patient.firstName} ${b.patient.lastName} randevusu ve varsa bağlı tahsilatı silinecek.`,
    confirmLabel: "Sil",
    danger: true,
  });
  if (!ok) return;
  await adminDeleteBooking(b._id, token);
  setBookings((prev) => prev.filter((x) => x._id !== b._id));
};
```

- [ ] **Step 3: Mobil gün listesi görünümü ekle**

Ay grid'ini `hidden md:block` ile sar. Altına mobil görünüm ekle:

```tsx
{/* Mobilde ay grid'i okunamayacak kadar dar — yatay gün seçici + liste */}
<div className="md:hidden">
  <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
    {grid
      .filter((c) => c.inMonth)
      .map((cell) => {
        const count = (byDay[cell.iso] ?? []).length;
        const selected = selectedDay === cell.iso;
        return (
          <button
            key={cell.iso}
            onClick={() => setSelectedDay(cell.iso)}
            className={`shrink-0 w-14 py-2 rounded-xl text-center border transition-colors ${
              selected
                ? "bg-brand-500 border-brand-500 text-white"
                : cell.isToday
                  ? "border-brand-300 text-brand-600"
                  : "border-gray-200 text-gray-600"
            }`}
          >
            <span className="block text-sm font-semibold">{cell.day}</span>
            <span className="block text-[10px] opacity-70">
              {count > 0 ? `${count} rnd` : "—"}
            </span>
          </button>
        );
      })}
  </div>
</div>
```

Seçili gün paneli zaten grid'in altında; mobilde de aynı panel kullanılır, ek kod gerekmez.

- [ ] **Step 4: Danışan listesini sayfalanmış yanıta uyarla**

`adminGetPatients(token)` çağrısını `adminGetPatients(token, { limit: 200 })` yap ve `.then((r) => setPatients(r.patients))` kullan. (Randevu formundaki seçici için 200 kayıt yeterli; daha fazlası Task 19'daki aramalı seçiciye devredilir.)

- [ ] **Step 5: Doğrula ve commit**

Run: `cd frontend && npx tsc --noEmit && npm run lint`

Tarayıcıda: 375px genişlikte gün seçicinin yatay kaydığını, "İşle" modalının bottom sheet olarak açıldığını doğrula.

```bash
git add "frontend/src/app/admin/(panel)/takvim/page.tsx"
git commit -m "feat: takvim mobilde gün listesine düşüyor, tek 'İşle' akışı

Üç ayrı hızlı-durum butonu ve yedi state tek modale indi."
```

---

### Task 19: Danışan ekranları

**Files:**
- Modify: `frontend/src/app/admin/(panel)/hastalar/page.tsx`, `frontend/src/app/admin/(panel)/hastalar/[id]/page.tsx`

**Interfaces:**
- Consumes: `adminGetPatients` (sayfalanmış), `adminGetPatientPackages`, `adminCreatePatientPackage`, `adminGetPayments`, `adminCreatePayment`, `adminGetPackages`

- [ ] **Step 1: Liste ekranında aramayı backend'e taşı**

`hastalar/page.tsx` içinde client-side `filtered` hesabını sil. `search` state'ini debounce'layıp backend'e gönder:

```tsx
const [search, setSearch] = useState("");
const [page, setPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const [total, setTotal] = useState(0);

// 300ms debounce: her tuşta istek atmayalım.
useEffect(() => {
  if (!token) return;
  const timer = setTimeout(async () => {
    setLoading(true);
    try {
      const res = await adminGetPatients(token, {
        q: search.trim() || undefined,
        page,
      });
      setPatients(res.patients);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, 300);
  return () => clearTimeout(timer);
}, [token, search, page]);

// Arama değişince ilk sayfaya dön
useEffect(() => {
  setPage(1);
}, [search]);
```

Tabloyu `DataTable` ile değiştir ve altına sayfalama ekle:

```tsx
{totalPages > 1 && (
  <div className="flex items-center justify-between mt-4">
    <p className="text-sm text-gray-400">{total} danışan</p>
    <div className="flex gap-2">
      <Button
        variant="secondary"
        size="sm"
        disabled={page === 1}
        onClick={() => setPage((p) => p - 1)}
      >
        Önceki
      </Button>
      <span className="text-sm text-gray-500 self-center tabular-nums">
        {page} / {totalPages}
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={page === totalPages}
        onClick={() => setPage((p) => p + 1)}
      >
        Sonraki
      </Button>
    </div>
  </div>
)}
```

`confirm()` çağrısını `useConfirm` ile değiştir, form alanlarını `Field` + `INPUT_CLS` ile sadeleştir.

- [ ] **Step 2: Detay ekranını sekmeli hale getir**

`hastalar/[id]/page.tsx` — dört sekme: `ozet`, `randevular`, `paketler`, `notlar`.

Sekme state'i ve iskelet:

```tsx
type Tab = "ozet" | "randevular" | "paketler" | "notlar";
const [tab, setTab] = useState<Tab>("ozet");
const [packages, setPackages] = useState<PatientPackage[]>([]);
const [payments, setPayments] = useState<Payment[]>([]);

// Paket ve tahsilat verisi Özet ile Paketler sekmelerinde kullanılıyor;
// tek seferde çekip iki sekmede paylaşıyoruz.
useEffect(() => {
  if (!token || !patient) return;
  Promise.all([
    adminGetPatientPackages(token, { patient: patient._id }),
    adminGetPayments(token, { patient: patient._id }),
  ]).then(([pkgs, pays]) => {
    setPackages(pkgs);
    setPayments(pays.payments);
  });
}, [token, patient]);
```

`Özet` sekmesi içeriği — türetilen değerler:

```tsx
const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
const packageDebt = packages.reduce((s, p) => s + p.remainingDebt, 0);
const bookingDebt = bookings
  .filter((b) => b.status === "geldi" && b.fee > 0 && !b.patientPackage)
  .reduce((s, b) => s + b.fee, 0)
  - payments.filter((p) => p.source === "booking").reduce((s, p) => s + p.amount, 0);
const activePackage = packages.find(
  (p) => p.status === "aktif" && p.remainingSessions > 0,
);
const completed = bookings.filter((b) => b.status === "geldi");
```

```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  <StatTile label="Toplam Ödediği" value={formatTRY(totalPaid)} />
  <StatTile
    label="Kalan Borç"
    value={formatTRY(Math.max(packageDebt + bookingDebt, 0))}
    accent={packageDebt + bookingDebt > 0}
  />
  <StatTile
    label="Aktif Paket"
    value={activePackage ? `${activePackage.remainingSessions} seans` : "—"}
    hint={activePackage?.name}
  />
  <StatTile label="Tamamlanan Seans" value={String(completed.length)} />
</div>
```

Altına ilk/son görüşme tarihleri:

```tsx
<div className="bg-white border border-gray-200 rounded-2xl p-6 mt-4 grid sm:grid-cols-2 gap-4 text-sm">
  <div>
    <p className="text-gray-500">İlk görüşme</p>
    <p className="text-gray-900 font-medium">
      {completed.length
        ? new Date(completed[completed.length - 1].date).toLocaleDateString("tr-TR")
        : "—"}
    </p>
  </div>
  <div>
    <p className="text-gray-500">Son görüşme</p>
    <p className="text-gray-900 font-medium">
      {completed.length
        ? new Date(completed[0].date).toLocaleDateString("tr-TR")
        : "—"}
    </p>
  </div>
</div>
```

> `bookings` backend'den `date: -1` sırayla geliyor, bu yüzden son görüşme `[0]`, ilk görüşme `[length-1]`.

`Paketler & Ödemeler` sekmesi: satılan paketleri kart olarak listele (ad, kalan seans, kalan borç), "Paket Sat" ve "Tahsilat Ekle" butonları modal açsın. Paket satış modalı `adminGetPackages(token, true)` ile katalogdan seçim yaptırır ve seçilen paketin `name`/`sessionCount`/`price` değerlerini gövdeye kopyalar (snapshot).

`Randevular` ve `Notlar` sekmeleri mevcut içerikleri taşır.

- [ ] **Step 3: Doğrula ve commit**

Run: `cd frontend && npx tsc --noEmit && npm run lint`

Tarayıcıda: seed'deki ilk danışanda Özet sekmesinde kalan borcun 4.000 ₺ (10.000 − 6.000) göründüğünü doğrula.

```bash
git add "frontend/src/app/admin/(panel)/hastalar"
git commit -m "feat: danışan ekranlarında sunucu araması, sayfalama ve sekmeli detay

Üç ekran birden tüm danışan listesini indiriyordu. Detayda toplam
ödeme, kalan borç, aktif paket ve seans sayısı tek yerde toplandı."
```

---

### Task 20: Finans ekranı

**Files:**
- Create: `frontend/src/app/admin/(panel)/finans/page.tsx`
- Delete: `frontend/src/app/admin/(panel)/giderler/`

- [ ] **Step 1: Sekmeli sayfayı yaz**

`frontend/src/app/admin/(panel)/finans/page.tsx` — üç sekme, dönem filtresi ortak:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { adminGetPayments, adminGetExpenses } from "@/lib/api";
import { formatTRY } from "@/lib/periods";
import { PAYMENT_METHOD } from "@/lib/paymentMethod";
import PeriodFilter, { type Range } from "@/components/admin/PeriodFilter";
import { Badge, DataTable, EmptyState, StatTile, Tabs, type Column } from "@/components/admin/ui";
import type { Expense, Payment } from "@/types";

type Tab = "gelirler" | "giderler" | "paketler";

export default function AdminFinansPage() {
  const { data: session } = useSession();
  const token = (session as { backendToken?: string })?.backendToken ?? "";

  const [tab, setTab] = useState<Tab>("gelirler");
  const [range, setRange] = useState<Range | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !range) return;
    setLoading(true);
    Promise.all([
      adminGetPayments(token, range),
      adminGetExpenses(token, range),
    ])
      .then(([pay, exp]) => {
        setPayments(pay.payments);
        setIncomeTotal(pay.total);
        setExpenses(exp.expenses);
        setExpenseTotal(exp.total);
      })
      .finally(() => setLoading(false));
  }, [token, range]);

  // Tahsilatın nereden geldiğini tek satırda anlatır.
  const sourceLabel = (p: Payment) =>
    p.source === "package"
      ? `Paket · ${p.patientPackage?.name ?? "—"}`
      : "Randevu";

  const paymentColumns: Column<Payment>[] = [
    {
      key: "patient",
      header: "Danışan",
      render: (p) => `${p.patient.firstName} ${p.patient.lastName}`,
    },
    { key: "source", header: "Kaynak", render: sourceLabel },
    {
      key: "amount",
      header: "Tutar",
      align: "right",
      render: (p) => (
        <span className="font-medium tabular-nums">{formatTRY(p.amount)}</span>
      ),
    },
    {
      key: "method",
      header: "Yöntem",
      render: (p) => (
        <span className={`text-xs px-2.5 py-1 rounded-full ${PAYMENT_METHOD[p.method].badge}`}>
          {PAYMENT_METHOD[p.method].label}
        </span>
      ),
    },
    {
      key: "date",
      header: "Tarih",
      render: (p) => new Date(p.date).toLocaleDateString("tr-TR"),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Finans</h1>

      <Tabs
        items={[
          { key: "gelirler", label: "Gelirler" },
          { key: "giderler", label: "Giderler" },
          { key: "paketler", label: "Paketler" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab !== "paketler" && <PeriodFilter onChange={setRange} />}

      {tab === "gelirler" && (
        <>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <StatTile label="Toplam Tahsilat" value={formatTRY(incomeTotal)} accent />
            <StatTile label="Toplam Gider" value={formatTRY(expenseTotal)} />
            <StatTile label="Net" value={formatTRY(incomeTotal - expenseTotal)} />
          </div>
          {loading ? (
            <p className="text-gray-400">Yükleniyor…</p>
          ) : (
            <DataTable
              columns={paymentColumns}
              rows={payments}
              keyOf={(p) => p._id}
              empty={<EmptyState title="Bu dönemde tahsilat yok." />}
            />
          )}
        </>
      )}

      {/* Giderler ve Paketler sekmeleri Step 2 ve Step 3'te */}
    </div>
  );
}
```

- [ ] **Step 2: Giderler sekmesini taşı**

`giderler/page.tsx` içindeki form, tablo ve CRUD mantığını `frontend/src/components/admin/finans/ExpensesTab.tsx` bileşenine taşı; `range` ve `expenses` prop olarak alsın, `onChanged` callback'iyle listeyi tazelesin. `native confirm()` yerine `useConfirm`, form alanları `Field` + `INPUT_CLS`, tablo `DataTable`.

Sonra klasörü sil:

```bash
git rm -r "frontend/src/app/admin/(panel)/giderler"
```

- [ ] **Step 3: Paketler sekmesini yaz**

`frontend/src/components/admin/finans/PackagesTab.tsx` — katalog CRUD:

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  adminGetPackages,
  adminCreatePackage,
  adminUpdatePackage,
  adminDeletePackage,
} from "@/lib/api";
import { formatTRY } from "@/lib/periods";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Field,
  INPUT_CLS,
  Modal,
  useConfirm,
  type Column,
} from "@/components/admin/ui";
import type { Package } from "@/types";

export default function PackagesTab({ token }: { token: string }) {
  const confirm = useConfirm();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Package | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sessionCount, setSessionCount] = useState(8);
  const [price, setPrice] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      setPackages(await adminGetPackages(token));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openNew = () => {
    setEditing(null);
    setName("");
    setSessionCount(8);
    setPrice(0);
    setError("");
    setOpen(true);
  };

  const openEdit = (pkg: Package) => {
    setEditing(pkg);
    setName(pkg.name);
    setSessionCount(pkg.sessionCount);
    setPrice(pkg.price);
    setError("");
    setOpen(true);
  };

  const save = async () => {
    if (!name.trim()) {
      setError("Paket adı zorunludur.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const data = { name, sessionCount, price };
      if (editing) await adminUpdatePackage(editing._id, data, token);
      else await adminCreatePackage(data, token);
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (pkg: Package) => {
    await adminUpdatePackage(pkg._id, { isActive: !pkg.isActive }, token);
    await load();
  };

  const remove = async (pkg: Package) => {
    const ok = await confirm({
      title: "Paket silinsin mi?",
      message: `"${pkg.name}" katalogdan kalkacak. Bu paketten yapılmış satışlar etkilenmez.`,
      confirmLabel: "Sil",
      danger: true,
    });
    if (!ok) return;
    await adminDeletePackage(pkg._id, token);
    await load();
  };

  const columns: Column<Package>[] = [
    { key: "name", header: "Paket", render: (p) => p.name },
    {
      key: "sessions",
      header: "Seans",
      render: (p) => `${p.sessionCount} seans`,
    },
    {
      key: "price",
      header: "Fiyat",
      align: "right",
      render: (p) => (
        <span className="font-medium tabular-nums">{formatTRY(p.price)}</span>
      ),
    },
    {
      key: "status",
      header: "Durum",
      render: (p) => (
        <Badge tone={p.isActive ? "emerald" : "gray"}>
          {p.isActive ? "Aktif" : "Pasif"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) => (
        <div className="flex gap-3 justify-end">
          <button onClick={() => openEdit(p)} className="text-brand-600 hover:underline font-medium">
            Düzenle
          </button>
          <button onClick={() => toggleActive(p)} className="text-gray-500 hover:underline font-medium">
            {p.isActive ? "Pasifleştir" : "Aktifleştir"}
          </button>
          <button onClick={() => remove(p)} className="text-red-400 hover:underline font-medium">
            Sil
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={openNew}>+ Yeni Paket</Button>
      </div>

      {loading ? (
        <p className="text-gray-400">Yükleniyor…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={packages}
          keyOf={(p) => p._id}
          empty={
            <EmptyState
              title="Henüz paket tanımı yok"
              description="Satışta seçebilmek için önce bir paket tanımla."
              action={<Button onClick={openNew}>Paket ekle</Button>}
            />
          }
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Paketi Düzenle" : "Yeni Paket"}
        footer={
          <>
            <Button onClick={save} loading={saving}>Kaydet</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>Vazgeç</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Paket Adı">
            <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLS} />
          </Field>
          <Field label="Seans Sayısı">
            <input
              type="number"
              min={1}
              value={sessionCount}
              onChange={(e) => setSessionCount(Number(e.target.value))}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Fiyat (₺)">
            <input
              type="number"
              min={0}
              value={price === 0 ? "" : price}
              placeholder="0"
              onChange={(e) => setPrice(Number(e.target.value))}
              className={INPUT_CLS}
            />
          </Field>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
```

`finans/page.tsx` içinde `{tab === "giderler" && <ExpensesTab ... />}` ve `{tab === "paketler" && <PackagesTab token={token} />}` satırlarını ekle.

- [ ] **Step 4: Doğrula ve commit**

Run: `cd frontend && npx tsc --noEmit && npm run lint`

```bash
git add "frontend/src/app/admin/(panel)/finans" frontend/src/components/admin/finans
git commit -m "feat: Finans ekranı — gelirler, giderler ve paket katalogu tek sayfada

/admin/randevular ve /admin/giderler kaldırıldı; gelir artık yalnızca
tahsilat defterinden okunuyor ve veri girişi randevu akışından yapılıyor."
```

---

### Task 21: Talepler ekranı

**Files:**
- Create: `frontend/src/app/admin/(panel)/talepler/page.tsx`

- [ ] **Step 1: Ekranı yaz**

Liste + dönüştürme modalı. Modal, talebin adını ad/soyada bölerek ve telefonu maskeleyerek önden doldurur; opsiyonel randevu tarihi/saati alır.

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  adminGetRequests,
  adminConvertRequest,
  adminUpdateRequest,
} from "@/lib/api";
import { REQUEST_STATUS } from "@/lib/requestStatus";
import { formatPhone, isValidPhone } from "@/lib/phone";
import { DateInput, TimeInput } from "@/components/admin/DateTimeInput";
import PhoneInput from "@/components/admin/PhoneInput";
import {
  Button,
  EmptyState,
  Field,
  INPUT_CLS,
  Modal,
  useConfirm,
} from "@/components/admin/ui";
import type { AppointmentRequest } from "@/types";

// "Ali Vural" → { firstName: "Ali", lastName: "Vural" }
function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  return {
    firstName: parts.slice(0, -1).join(" ") || parts[0] || "",
    lastName: parts.length > 1 ? parts[parts.length - 1] : "",
  };
}

export default function AdminTaleplerPage() {
  const { data: session } = useSession();
  const token = (session as { backendToken?: string })?.backendToken ?? "";
  const router = useRouter();
  const confirm = useConfirm();

  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState<AppointmentRequest | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [withBooking, setWithBooking] = useState(true);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setRequests(await adminGetRequests(token));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const openConvert = (req: AppointmentRequest) => {
    const { firstName: f, lastName: l } = splitName(req.name);
    setConverting(req);
    setFirstName(f);
    setLastName(l);
    setPhone(formatPhone(req.phone));
    setWithBooking(true);
    setDate("");
    setTime("");
    setError("");
  };

  const save = async () => {
    if (!converting) return;
    if (!firstName || !lastName) {
      setError("Ad ve soyad zorunludur.");
      return;
    }
    if (!isValidPhone(phone)) {
      setError("Geçerli bir telefon girin: 0(5xx)xxx xx xx");
      return;
    }
    if (withBooking && !date) {
      setError("Randevu için tarih seçmelisin.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await adminConvertRequest(
        converting._id,
        {
          firstName,
          lastName,
          phone,
          source: "web_sitesi",
          booking: withBooking ? { date, time } : undefined,
        },
        token,
      );
      setConverting(null);
      router.push(`/admin/hastalar/${res.patient._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  };

  const ignore = async (req: AppointmentRequest) => {
    const ok = await confirm({
      title: "Talep yoksayılsın mı?",
      message: `${req.name} talebi listede kalır ama "yoksayıldı" olarak işaretlenir.`,
      confirmLabel: "Yoksay",
    });
    if (!ok) return;
    await adminUpdateRequest(req._id, "yoksayildi", token);
    await load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Randevu Talepleri</h1>
      <p className="text-gray-500 mb-6">Siteden gelen talepler burada toplanır.</p>

      {loading ? (
        <p className="text-gray-400">Yükleniyor…</p>
      ) : requests.length === 0 ? (
        <EmptyState
          title="Bekleyen talep yok"
          description="Sitedeki randevu formu doldurulduğunda burada görünür."
        />
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req._id}
              className="bg-white border border-gray-200 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{req.name}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full ${REQUEST_STATUS[req.status].badge}`}>
                      {REQUEST_STATUS[req.status].label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {req.phone} · {req.email}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(req.createdAt).toLocaleString("tr-TR")}
                  </p>
                </div>
                {req.status === "yeni" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => openConvert(req)}>
                      Danışan Oluştur
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => ignore(req)}>
                      Yoksay
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={converting !== null}
        onClose={() => setConverting(null)}
        title="Danışan Oluştur"
        footer={
          <>
            <Button onClick={save} loading={saving}>Kaydet</Button>
            <Button variant="secondary" onClick={() => setConverting(null)}>
              Vazgeç
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ad">
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={INPUT_CLS} />
            </Field>
            <Field label="Soyad">
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={INPUT_CLS} />
            </Field>
          </div>
          <Field label="Telefon" hint="Siteden gelen numara otomatik biçimlendirildi">
            <PhoneInput value={phone} onChange={setPhone} inputClassName={INPUT_CLS} />
          </Field>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={withBooking}
              onChange={(e) => setWithBooking(e.target.checked)}
            />
            Aynı anda randevu da ver
          </label>

          {withBooking && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tarih">
                <DateInput value={date} onChange={setDate} inputClassName={INPUT_CLS} />
              </Field>
              <Field label="Saat">
                <TimeInput value={time} onChange={setTime} inputClassName={INPUT_CLS} />
              </Field>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Doğrula ve commit**

Run: `cd frontend && npx tsc --noEmit && npm run lint`

Tarayıcıda: seed'deki iki talebin listelendiğini, "Danışan Oluştur" akışının danışan detayına yönlendirdiğini ve sidebar rozetinin azaldığını doğrula.

```bash
git add "frontend/src/app/admin/(panel)/talepler"
git commit -m "feat: siteden gelen randevu talepleri ekranı

Talep tek tıkla danışana ve randevuya dönüşüyor; Telegram'daki mesajı
elle panele geçirme adımı ortadan kalktı."
```

---

### Task 22: İstatistik ekranı

792 satırlık tek dosya; grafik başına bileşene bölünür ve gelir kaynağı `Payment`'a bağlanır.

**Files:**
- Create: `frontend/src/components/admin/stats/` altında `ChartCard.tsx`, `DeltaChip.tsx`, `ChartTooltip.tsx`, `RevenueChart.tsx`, `AppointmentsChart.tsx`, `WeekdayChart.tsx`, `PatientMixChart.tsx`, `TopPatientsChart.tsx`, `SourceChart.tsx`, `CancelReasonChart.tsx`, `RetentionPanel.tsx`, `ReceivablesPanel.tsx`
- Modify: `frontend/src/app/admin/(panel)/istatistik/page.tsx`

- [ ] **Step 1: Yardımcı bileşenleri çıkar**

`istatistik/page.tsx` içindeki `DeltaChip` (satır 42), `StatTile` (65), `ChartTooltip` (106) ve `ChartCard` (135) tanımlarını kendi dosyalarına taşı. `StatTile` zaten `ui/` altında var — oradakini kullan, yerel tanımı sil. Renk sabitlerini (`EMERALD`, `INDIGO`, `AMBER`, `SLATE`) `frontend/src/components/admin/stats/colors.ts` dosyasına taşı.

- [ ] **Step 2: Grafikleri kendi dosyalarına taşı**

Her `<ChartCard>` bloğunu, ihtiyaç duyduğu `StatsResponse` dilimini prop olarak alan bir bileşene taşı. Örnek imza:

```tsx
export default function RevenueChart({
  monthly,
  from,
  to,
}: {
  monthly: StatsResponse["monthly"];
  from: string;
  to: string;
}) { /* mevcut JSX */ }
```

Sayfa dosyası yalnızca veri çekme, dönem filtresi ve bileşen dizilimi kalacak şekilde küçülür.

- [ ] **Step 3: Alacaklar panelini ekle**

`frontend/src/components/admin/stats/ReceivablesPanel.tsx`:

```tsx
import Link from "next/link";
import { formatTRY } from "@/lib/periods";
import { StatTile } from "@/components/admin/ui";
import type { StatsResponse } from "@/types";

export default function ReceivablesPanel({ stats }: { stats: StatsResponse }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      <h2 className="font-semibold text-gray-900 mb-3">Alacaklar</h2>
      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <StatTile
          label="Bekleyen Alacak"
          value={formatTRY(stats.outstandingReceivables)}
          accent={stats.outstandingReceivables > 0}
        />
        <StatTile label="Seans Geliri" value={formatTRY(stats.sessionRevenue)} />
        <StatTile
          label="Paket Geliri"
          value={formatTRY(stats.packageRevenue)}
          hint="Satış anında yazılır (kasa esası)"
        />
      </div>

      {stats.topDebtors.length > 0 && (
        <div className="divide-y divide-gray-100">
          {stats.topDebtors.map((d) => (
            <div key={d.phone} className="flex justify-between py-2.5 text-sm">
              <span className="text-gray-900">{d.name}</span>
              <span className="text-amber-600 font-medium tabular-nums">
                {formatTRY(d.debt)}
              </span>
            </div>
          ))}
        </div>
      )}

      <Link href="/admin/finans" className="text-sm text-brand-600 hover:underline mt-3 inline-block">
        Finans →
      </Link>
    </div>
  );
}
```

Sayfada Finans Özeti kartının hemen altına yerleştir.

> **Not:** "Paket Geliri" kartındaki ipucu metni bilinçli. Paket bedeli satış anında gelire yazıldığı için, paketten düşen bir seans o gün 0 ₺ gösterir; ayrım olmadan bu yanlış anlaşılıyor.

- [ ] **Step 4: Doğrula ve commit**

Run: `cd frontend && npx tsc --noEmit && npm run lint`

`istatistik/page.tsx` satır sayısını kontrol et — 200 satırın altına inmiş olmalı.

```bash
git add "frontend/src/app/admin/(panel)/istatistik" frontend/src/components/admin/stats
git commit -m "refactor: istatistik ekranı bileşenlere bölündü, alacak paneli eklendi"
```

---

### Task 23: Blog ve SSS ekranlarını uyarla

Fonksiyon değişmiyor; yalnızca ortak bileşen setine geçiyorlar. TipTap editörüne dokunulmuyor.

**Files:**
- Modify: `frontend/src/app/admin/(panel)/blog/page.tsx`, `frontend/src/app/admin/(panel)/blog/[id]/page.tsx`, `frontend/src/app/admin/(panel)/sss/page.tsx`

- [ ] **Step 1: Blog listesini uyarla**

Tabloyu `DataTable` ile değiştir (sütunlar: Başlık, Durum `Badge`, Tarih, işlemler). `confirm()` → `useConfirm`. Butonlar → `Button`.

- [ ] **Step 2: Blog editörünü uyarla**

Form alanlarını `Field` + `INPUT_CLS` ile sar; kaydet/iptal butonlarını `Button` yap. **TipTap `useEditor` bloğuna ve araç çubuğuna dokunma** — çalışıyor.

> Meta başlık / meta açıklama / düzenlenebilir slug alanları bu turda **eklenmiyor**; Spec 2 (public site SEO) kapsamında public tarafla birlikte tasarlanacak.

- [ ] **Step 3: SSS ekranını uyarla**

Aynı dönüşüm: `DataTable`, `Field`, `Button`, `useConfirm`, `EmptyState`.

- [ ] **Step 4: Doğrula ve commit**

Run: `cd frontend && npx tsc --noEmit && npm run lint && npm run build`
Expected: build başarılı

```bash
git add "frontend/src/app/admin/(panel)/blog" "frontend/src/app/admin/(panel)/sss"
git commit -m "refactor: blog ve SSS ekranları ortak bileşen setine geçti"
```

---

## Bitiş Doğrulaması

Son task'tan sonra, kapanış kontrolü:

- [ ] `cd backend && npm test` — tüm süitler geçiyor
- [ ] `cd frontend && npm run build` — derleme başarılı
- [ ] `docker compose down -v && docker compose up -d --build` — temiz başlangıç
- [ ] `docker compose exec backend node src/scripts/seed-admin.js`
- [ ] `docker compose exec backend node src/scripts/seed-demo.js`
- [ ] Elle akış: giriş → Bugün → bir randevuyu "İşle" ile tamamla → Finans > Gelirler'de tahsilatın göründüğünü doğrula → randevuyu sil → tahsilatın da silindiğini doğrula
- [ ] Elle akış: paket sat → taksit gir → danışan detayında kalan borcun doğru olduğunu doğrula
- [ ] 375px genişlikte tüm ekranları gez: yatay kaydırma yok, alt sekme çubuğu çalışıyor, modal'lar bottom sheet
- [ ] `/admin/randevular` ve `/admin/giderler` artık 404 — sidebar'da bağlantı kalmadı

## Plan Öz-Denetimi

Spec'e karşı kontrol edildi:

| Spec bölümü | Karşılayan task |
|---|---|
| Veri modeli — Package / PatientPackage / Payment / AppointmentRequest | 3, 4, 5, 9 |
| `Booking.fee` + `patientPackage` | 7 |
| `Appointment` kaldırma | 10 |
| Backend API (tüm yeni route'lar) | 3, 4, 5, 7, 9, 11 |
| Bug #1 cascade | 7, 8 |
| Bug #2 durum geri alma | 7 |
| Bug #3 visitType | 6 |
| Bug #4, #5 saat dilimi / aralık | 1, 2 |
| Bug #6 telefonla eşleştirme | 5 (Payment.patient zorunlu ref), 15 |
| Bug #7 mobil + aktif vurgu | 14 |
| Bug #8 arama / sayfalama | 8, 19 |
| Bug #9 confirm() | 13, 18, 19, 20, 23 |
| Bug #10 tekrar / ortak bileşen | 13 |
| Bug #11 randevu talepleri | 9, 21 |
| Navigasyon | 14 |
| "Bugün" ekranı | 11, 17 |
| "İşle" modalı | 16 |
| Takvim mobil | 18 |
| Danışan detayı sekmeli | 19 |
| Finans üç sekme | 20 |
| İstatistik bölme + alacak | 22 |
| Blog / SSS uyarlama | 23 |
| Mobil kuralları | 13 (Modal/DataTable), 14 (tab bar), 18 |
| Test stratejisi | 1, 3, 4, 5, 6, 7, 8, 9, 10, 11 |
| seed-demo | 12 |

Kapsam dışı bırakılanlar plana hiç girmedi: public site SEO, blog SEO alanları, Site Ayarları ekranı, rol yönetimi, süre bazlı paket, soft delete.
