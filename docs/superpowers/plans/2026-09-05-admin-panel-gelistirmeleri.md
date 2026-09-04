# Admin Panel Geliştirmeleri — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Diyetisyenin randevularını takvim üzerinden, gelir-giderini finans ekranından hızlıca takip edebildiği; siteyi SEO açısından güçlendiren ve panelin genel kullanılabilirliğini yükselten bir geliştirme paketi.

**Architecture:** Mevcut mimari korunuyor — Express + Mongoose backend, Next.js App Router frontend, `apiFetch` üzerinden iletişim. Yeni veri modeli eklenmiyor; yalnızca `Post` şemasına SEO alanları ekleniyor. Takvim ekranı tek 340 satırlık dosyadan görünüm bileşenlerine bölünüyor. Finans ve takvim için ortak yardımcılar (`csv.ts`, `whatsapp.ts`, `calendar.ts` eklemeleri) `frontend/src/lib/` altına giriyor.

**Tech Stack:** Express 4, Mongoose, Zod, Jest + Supertest (backend); Next.js 14 App Router, TypeScript, Tailwind (frontend).

**Spec:** Bu plan kendi spec'ini içeriyor — aşağıdaki "Gerekçe ve Kapsam" bölümü. Önceki iki spec ile ilişkili: `docs/superpowers/specs/2026-09-02-admin-panel-yeniden-kurgu-design.md` (veri modeli) ve `docs/icerik/hizmetler/00-SABLON-VE-KURALLAR.md` (hizmet içerikleri).

---

## Gerekçe ve Kapsam

**Panelin amacı:** Diyetisyen (işveren adına çalışan) randevularını takvimden takip edecek, gelir-gider durumunu görecek. Panel klinik takip aracı değil — ölçüm/diyet programı takibi kapsam dışı.

**Kod okumasından çıkan somut eksikler:**

| # | Eksik | Kanıt |
|---|---|---|
| 1 | Haftalık/saat bazlı takvim görünümü yok | `takvim/page.tsx:149` yalnızca ay ızgarası; hücrede en fazla 3 randevu (`items.slice(0, 3)`) |
| 2 | Takvim boş açılıyor | `takvim/page.tsx:35` `selectedDay` başlangıçta `null` |
| 3 | Randevu saati çakışması kontrol edilmiyor | `routes/admin/bookings.js` POST/PUT'ta hiçbir çakışma kontrolü yok |
| 4 | Tekrarlayan randevu yok | Yalnızca tek tek `POST /api/admin/bookings` var |
| 5 | Danışana hatırlatma yolu yok | Telefon `takvim/page.tsx:265`'te yazılı ama tıklanabilir değil |
| 6 | Dışa aktarma yok | Projede hiçbir yerde csv/xlsx üretimi yok |
| 7 | Giderler sekmesinde net yok | `ExpensesTab.tsx:177` tek kutu; `finans/page.tsx:117` üç kutu |
| 8 | Alacaklar Finans'ta liste değil | `lib/receivables.js` hesaplıyor ama yalnızca stats toplamı olarak dönüyor |
| 9 | Blog SEO alanları yok | `models/Post.js` — metaTitle/metaDescription/coverImageAlt yok |
| 10 | `/hizmetler` sayfaları yok | 7 taslak `docs/icerik/hizmetler/` altında hazır, route yok |
| 11 | Panelde tasarım tutarsızlıkları | Her sayfa kendi başlık düzenini kuruyor, yükleniyor durumu düz metin, kayıt geri bildirimi yok |

**Kapsam dışı:** ölçüm/antropometri takibi, diyet programı yükleme, rol yönetimi, Site Ayarları ekranı, soft delete.

---

## Global Constraints

- **Dil:** Tüm kullanıcıya görünen metinler Türkçe.
- **Stil:** Yalnızca Tailwind. CSS module / styled-components yasak.
- **Renk:** Birincil `brand-*` (emerald tabanlı), mevcut paletten sapılmaz.
- **API deseni:** Public `GET /api/<resource>`, korumalı `POST/PUT/DELETE /api/admin/<resource>`. Tüm admin route'ları `protect` middleware kullanır.
- **API çağrıları:** Frontend'den yalnızca `frontend/src/lib/api.ts` üzerinden. Bileşen içinde doğrudan `fetch` yasak.
- **URL çözümü:** SSR `http://backend:5000`, tarayıcı `/api/...`. `NEXT_PUBLIC_API_URL` kullanılmaz.
- **Doğrulama:** Backend'de Zod. Hata yanıtı mevcut biçimde: `{ message: "Validation error", errors: [...] }`.
- **Çakışan durum yanıtı:** Mevcut desen korunur — 409 döner, `?force=true` ile geçilir (`bookings.js` PUT'taki tahsilat uyarısı gibi).
- **Test:** Backend değişikliği olan her task için `backend/tests/` altında Jest + Supertest testi. Komut: `npm --prefix backend test`. Cold start'ta bir kez timeout verebilir; tekrar koşulur.
- **Commit:** Her task sonunda tek commit. Mesaj Türkçe, `feat:` / `fix:` / `refactor:` öneki.
- **Tarih:** Randevu tarihleri UTC gece yarısına normalize edilir (`toUtcMidnight`). Yeni kodda da bu kullanılır.

---

## Dosya Yapısı

### Faz 1 — Takvim

| Dosya | Sorumluluk |
|---|---|
| `backend/src/lib/bookingConflict.js` | YENİ — verilen tarih/saat için çakışan randevuyu bulur |
| `backend/src/routes/admin/bookings.js` | DEĞİŞİR — POST/PUT'a çakışma kontrolü, `/recurring` endpoint'i |
| `backend/tests/bookingConflict.test.js` | YENİ — çakışma davranışı |
| `backend/tests/bookingRecurring.test.js` | YENİ — seri randevu davranışı |
| `frontend/src/lib/calendar.ts` | DEĞİŞİR — `weekGrid`, `weekRange`, `addDaysISO`, `formatWeekTitle`, `HOUR_SLOTS` |
| `frontend/src/lib/whatsapp.ts` | YENİ — TR telefonu `wa.me` linkine çevirir |
| `frontend/src/components/admin/calendar/MonthGrid.tsx` | YENİ — ay ızgarası (mevcut koddan taşınır) |
| `frontend/src/components/admin/calendar/WeekGrid.tsx` | YENİ — haftalık saat ızgarası |
| `frontend/src/components/admin/calendar/DayStrip.tsx` | YENİ — mobil yatay gün seçici (mevcut koddan taşınır) |
| `frontend/src/components/admin/calendar/DayPanel.tsx` | YENİ — seçili günün randevu listesi (mevcut koddan taşınır) |
| `frontend/src/components/admin/calendar/ViewToggle.tsx` | YENİ — Ay / Hafta / Gün geçişi |
| `frontend/src/app/admin/(panel)/takvim/page.tsx` | DEĞİŞİR — ince koordinatör hâline gelir |
| `frontend/src/components/admin/BookingForm.tsx` | DEĞİŞİR — tekrar alanı + çakışma uyarısı |

### Faz 2 — Finans

| Dosya | Sorumluluk |
|---|---|
| `backend/src/routes/admin/receivables.js` | YENİ — danışan bazlı alacak listesi |
| `backend/src/app.js` | DEĞİŞİR — yeni route kaydı |
| `backend/tests/receivables.test.js` | YENİ |
| `frontend/src/lib/csv.ts` | YENİ — `toCsv` + `downloadCsv` (Excel uyumlu BOM) |
| `frontend/src/components/admin/finans/FinanceSummary.tsx` | YENİ — Tahsilat/Gider/Net üçlüsü, iki sekmede ortak |
| `frontend/src/components/admin/finans/ReceivablesTab.tsx` | YENİ |
| `frontend/src/components/admin/finans/ExpensesTab.tsx` | DEĞİŞİR — özet bileşeni + dışa aktar |
| `frontend/src/app/admin/(panel)/finans/page.tsx` | DEĞİŞİR — 4. sekme + dışa aktar |

### Faz 3 — Blog SEO

| Dosya | Sorumluluk |
|---|---|
| `backend/src/models/Post.js` | DEĞİŞİR — `metaTitle`, `metaDescription`, `coverImageAlt` |
| `backend/src/routes/admin/posts.js` | DEĞİŞİR — Zod şemasına yeni alanlar |
| `backend/tests/posts.seo.test.js` | YENİ |
| `frontend/src/types/index.ts` | DEĞİŞİR — `Post` tipine yeni alanlar |
| `frontend/src/app/admin/(panel)/blog/[id]/page.tsx` | DEĞİŞİR — SEO alanları bölümü |
| `frontend/src/app/blog/[slug]/page.tsx` | DEĞİŞİR — metaTitle/metaDescription/alt kullanımı |

### Faz 4 — Hizmet sayfaları

| Dosya | Sorumluluk |
|---|---|
| `frontend/src/content/hizmetler/types.ts` | YENİ — `ServiceContent` tipi |
| `frontend/src/content/hizmetler/index.ts` | YENİ — 7 hizmetin dizisi |
| `frontend/src/content/hizmetler/*.ts` | YENİ — hizmet başına içerik dosyası |
| `frontend/src/app/hizmetler/page.tsx` | YENİ — liste |
| `frontend/src/app/hizmetler/[slug]/page.tsx` | YENİ — detay |
| `frontend/src/lib/seo.ts` | DEĞİŞİR — `serviceSchema()` |
| `frontend/src/app/sitemap.xml/route.ts` | DEĞİŞİR — hizmet URL'leri |
| `frontend/src/components/Services.tsx` | DEĞİŞİR — kartlar sayfalara bağlanır |

### Faz 5 — Tasarım ve kullanılabilirlik

| Dosya | Sorumluluk |
|---|---|
| `frontend/src/components/admin/ui/PageHeader.tsx` | YENİ — başlık + aksiyon yuvası |
| `frontend/src/components/admin/ui/Skeleton.tsx` | YENİ — yükleniyor iskeletleri |
| `frontend/src/components/admin/ui/Toast.tsx` | YENİ — kayıt geri bildirimi |
| `frontend/src/components/admin/ui/index.ts` | DEĞİŞİR — yeni dışa aktarımlar |
| `frontend/src/components/admin/ui/DataTable.tsx` | DEĞİŞİR — yapışkan başlık, satır vurgusu |
| `frontend/src/components/admin/ui/Modal.tsx` | DEĞİŞİR — ESC, odak tuzağı |
| `frontend/src/app/admin/(panel)/layout.tsx` | DEĞİŞİR — ToastProvider |
| Tüm panel sayfaları | DEĞİŞİR — `PageHeader` + `Skeleton` + `Toast` kullanımına geçiş |

---

## Faz 1 — Takvim

### Task 1: Randevu çakışma kontrolü (backend)

**Files:**
- Create: `backend/src/lib/bookingConflict.js`
- Modify: `backend/src/routes/admin/bookings.js`
- Test: `backend/tests/bookingConflict.test.js`

**Interfaces:**
- Consumes: `Booking` modeli, `toUtcMidnight` (`backend/src/lib/dateRange.js`)
- Produces: `findConflict({ date, time, excludeId })` → `Promise<Booking|null>`. `date` bir `Date` (UTC gece yarısı), `time` `"HH:MM"` biçiminde string, `excludeId` opsiyonel string.

- [ ] **Step 1: Testi yaz**

`backend/tests/bookingConflict.test.js`:

```js
const request = require("supertest");
const app = require("../src/app");
const Patient = require("../src/models/Patient");
const Booking = require("../src/models/Booking");
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

async function makePatient(firstName = "Ayşe") {
  return Patient.create({ firstName, lastName: "Yılmaz", phone: "05551234567" });
}

describe("randevu çakışma kontrolü", () => {
  it("aynı gün ve saate ikinci randevuda 409 döner", async () => {
    const a = await makePatient("Ayşe");
    const b = await makePatient("Berk");
    await request(app)
      .post("/api/admin/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ patient: a._id.toString(), date: "2026-09-10", time: "14:00" });

    const res = await request(app)
      .post("/api/admin/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ patient: b._id.toString(), date: "2026-09-10", time: "14:00" });

    expect(res.status).toBe(409);
    expect(res.body.conflict.patient.firstName).toBe("Ayşe");
    expect(await Booking.countDocuments()).toBe(1);
  });

  it("force=true ile çakışmaya rağmen kaydeder", async () => {
    const a = await makePatient("Ayşe");
    const b = await makePatient("Berk");
    await request(app)
      .post("/api/admin/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ patient: a._id.toString(), date: "2026-09-10", time: "14:00" });

    const res = await request(app)
      .post("/api/admin/bookings?force=true")
      .set("Authorization", `Bearer ${token}`)
      .send({ patient: b._id.toString(), date: "2026-09-10", time: "14:00" });

    expect(res.status).toBe(201);
    expect(await Booking.countDocuments()).toBe(2);
  });

  it("saati boş randevular çakışma saymaz", async () => {
    const a = await makePatient("Ayşe");
    const b = await makePatient("Berk");
    await request(app)
      .post("/api/admin/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ patient: a._id.toString(), date: "2026-09-10" });

    const res = await request(app)
      .post("/api/admin/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ patient: b._id.toString(), date: "2026-09-10" });

    expect(res.status).toBe(201);
  });

  it("iptal edilmiş randevu çakışma saymaz", async () => {
    const a = await makePatient("Ayşe");
    const b = await makePatient("Berk");
    await request(app)
      .post("/api/admin/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        patient: a._id.toString(),
        date: "2026-09-10",
        time: "14:00",
        status: "iptal",
        cancelReason: "unuttu",
      });

    const res = await request(app)
      .post("/api/admin/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ patient: b._id.toString(), date: "2026-09-10", time: "14:00" });

    expect(res.status).toBe(201);
  });

  it("randevu güncellenirken kendisiyle çakışmaz", async () => {
    const a = await makePatient("Ayşe");
    const created = await request(app)
      .post("/api/admin/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ patient: a._id.toString(), date: "2026-09-10", time: "14:00" });

    const res = await request(app)
      .put(`/api/admin/bookings/${created.body._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ note: "not güncellendi" });

    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Testi çalıştır, kırmızı olduğunu gör**

Run: `npm --prefix backend test -- bookingConflict`
Expected: FAIL — 409 yerine 201 dönüyor.

- [ ] **Step 3: Yardımcıyı yaz**

`backend/src/lib/bookingConflict.js`:

```js
const Booking = require("../models/Booking");

// Aynı gün + aynı saatte duran, iptal edilmemiş başka bir randevu var mı?
// Saati boş randevular (time === "") çakışma saymaz — gün içinde saatsiz
// kayıt tutmak meşru bir kullanım.
async function findConflict({ date, time, excludeId }) {
  if (!time) return null;

  const filter = {
    date,
    time,
    status: { $ne: "iptal" },
  };
  if (excludeId) filter._id = { $ne: excludeId };

  return Booking.findOne(filter).populate(
    "patient",
    "firstName lastName phone",
  );
}

module.exports = { findConflict };
```

- [ ] **Step 4: Route'a bağla**

`backend/src/routes/admin/bookings.js` — import satırlarına ekle:

```js
const { findConflict } = require("../../lib/bookingConflict");
```

POST handler'ında `Booking.create` çağrısından **önce** şunu ekle:

```js
    if (req.query.force !== "true") {
      const conflict = await findConflict({
        date: toUtcMidnight(data.date),
        time: data.time,
      });
      if (conflict) {
        return res.status(409).json({
          message: "Bu saatte başka bir randevu var.",
          conflict,
        });
      }
    }
```

PUT handler'ında, mevcut tahsilat 409 kontrolünden **sonra**, `findByIdAndUpdate` çağrısından **önce** şunu ekle:

```js
    const resultingDate = data.date ?? existing.date;
    const resultingTime = data.time !== undefined ? data.time : existing.time;
    if (req.query.force !== "true") {
      const conflict = await findConflict({
        date: resultingDate,
        time: resultingTime,
        excludeId: existing._id,
      });
      if (conflict) {
        return res.status(409).json({
          message: "Bu saatte başka bir randevu var.",
          conflict,
        });
      }
    }
```

- [ ] **Step 5: Testi çalıştır, yeşil olduğunu gör**

Run: `npm --prefix backend test -- bookingConflict`
Expected: PASS — 5 test.

- [ ] **Step 6: Mevcut testlerin kırılmadığını doğrula**

Run: `npm --prefix backend test`
Expected: Tüm süitler geçer. Kırılan varsa çoğunlukla aynı saate iki randevu yazan bir fixture'dır — o testte `?force=true` kullan.

- [ ] **Step 7: Commit**

```bash
git add backend/src/lib/bookingConflict.js backend/src/routes/admin/bookings.js backend/tests/bookingConflict.test.js
git commit -m "feat: aynı saate ikinci randevuda çakışma uyarısı"
```

---

### Task 2: Tekrarlayan randevu (backend)

**Files:**
- Modify: `backend/src/routes/admin/bookings.js`
- Test: `backend/tests/bookingRecurring.test.js`

**Interfaces:**
- Consumes: `findConflict` (Task 1), `toUtcMidnight`, `recalcVisitTypes`
- Produces: `POST /api/admin/bookings/recurring` → `201` ile `{ created: Booking[], skipped: { date: string, reason: string }[] }`

- [ ] **Step 1: Testi yaz**

`backend/tests/bookingRecurring.test.js`:

```js
const request = require("supertest");
const app = require("../src/app");
const Patient = require("../src/models/Patient");
const Booking = require("../src/models/Booking");
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

async function makePatient() {
  return Patient.create({
    firstName: "Ayşe",
    lastName: "Yılmaz",
    phone: "05551234567",
  });
}

describe("POST /api/admin/bookings/recurring", () => {
  it("haftalık 4 randevu oluşturur", async () => {
    const p = await makePatient();
    const res = await request(app)
      .post("/api/admin/bookings/recurring")
      .set("Authorization", `Bearer ${token}`)
      .send({
        patient: p._id.toString(),
        date: "2026-09-10",
        time: "14:00",
        repeatWeeks: 4,
      });

    expect(res.status).toBe(201);
    expect(res.body.created).toHaveLength(4);
    const dates = res.body.created
      .map((b) => b.date.slice(0, 10))
      .sort();
    expect(dates).toEqual([
      "2026-09-10",
      "2026-09-17",
      "2026-09-24",
      "2026-10-01",
    ]);
  });

  it("ilk randevu ilk_gorusme, kalanlar kontrol olur", async () => {
    const p = await makePatient();
    const res = await request(app)
      .post("/api/admin/bookings/recurring")
      .set("Authorization", `Bearer ${token}`)
      .send({
        patient: p._id.toString(),
        date: "2026-09-10",
        time: "14:00",
        repeatWeeks: 3,
      });

    const sorted = res.body.created.sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    expect(sorted[0].visitType).toBe("ilk_gorusme");
    expect(sorted[1].visitType).toBe("kontrol");
    expect(sorted[2].visitType).toBe("kontrol");
  });

  it("çakışan haftayı atlar, kalanları oluşturur", async () => {
    const p = await makePatient();
    const other = await Patient.create({
      firstName: "Berk",
      lastName: "Demir",
      phone: "05559876543",
    });
    await Booking.create({
      patient: other._id,
      date: new Date("2026-09-17T00:00:00.000Z"),
      time: "14:00",
    });

    const res = await request(app)
      .post("/api/admin/bookings/recurring")
      .set("Authorization", `Bearer ${token}`)
      .send({
        patient: p._id.toString(),
        date: "2026-09-10",
        time: "14:00",
        repeatWeeks: 3,
      });

    expect(res.status).toBe(201);
    expect(res.body.created).toHaveLength(2);
    expect(res.body.skipped).toHaveLength(1);
    expect(res.body.skipped[0].date).toBe("2026-09-17");
  });

  it("repeatWeeks 1'den küçükse 400 döner", async () => {
    const p = await makePatient();
    const res = await request(app)
      .post("/api/admin/bookings/recurring")
      .set("Authorization", `Bearer ${token}`)
      .send({ patient: p._id.toString(), date: "2026-09-10", repeatWeeks: 0 });

    expect(res.status).toBe(400);
  });

  it("repeatWeeks 26'dan büyükse 400 döner", async () => {
    const p = await makePatient();
    const res = await request(app)
      .post("/api/admin/bookings/recurring")
      .set("Authorization", `Bearer ${token}`)
      .send({ patient: p._id.toString(), date: "2026-09-10", repeatWeeks: 27 });

    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Testi çalıştır, kırmızı olduğunu gör**

Run: `npm --prefix backend test -- bookingRecurring`
Expected: FAIL — 404, route yok.

- [ ] **Step 3: Endpoint'i yaz**

`backend/src/routes/admin/bookings.js` — `bookingSchema` tanımının altına ekle:

```js
const recurringSchema = bookingSchema
  .omit({ status: true, cancelReason: true })
  .extend({
    repeatWeeks: z.number().int().min(1).max(26),
  });
```

`POST /` handler'ının **altına**, `POST /:id/complete`'in **üstüne** ekle:

```js
// POST /api/admin/bookings/recurring
// Haftalık seri randevu. Çakışan hafta atlanır, kalanlar oluşturulur —
// tek bir çakışma yüzünden serinin tamamı iptal olmamalı.
router.post("/recurring", async (req, res) => {
  try {
    const data = recurringSchema.parse(req.body);
    const start = toUtcMidnight(data.date);

    const created = [];
    const skipped = [];

    for (let week = 0; week < data.repeatWeeks; week += 1) {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + week * 7);

      const conflict = await findConflict({ date, time: data.time });
      if (conflict) {
        skipped.push({
          date: date.toISOString().slice(0, 10),
          reason: "Bu saatte başka bir randevu var.",
        });
        continue;
      }

      const booking = await Booking.create({
        patient: data.patient,
        date,
        time: data.time ?? "",
        note: data.note ?? "",
      });
      created.push(booking);
    }

    // Ziyaret tipleri seri tamamlandıktan sonra tek seferde hesaplanır.
    await recalcVisitTypes(data.patient);

    const populated = await Booking.find({
      _id: { $in: created.map((b) => b._id) },
    })
      .populate("patient", "firstName lastName phone")
      .sort({ date: 1 });

    res.status(201).json({ created: populated, skipped });
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    console.error("Recurring booking error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
```

**Dikkat:** Bu route `POST /:id/complete`'ten önce tanımlanmalı değil ama `router.post("/recurring")` ile `router.post("/:id/complete")` çakışmaz çünkü path şekilleri farklı. Yine de okunabilirlik için POST `/`'un hemen altına konur.

- [ ] **Step 4: Testi çalıştır, yeşil olduğunu gör**

Run: `npm --prefix backend test -- bookingRecurring`
Expected: PASS — 5 test.

- [ ] **Step 5: Tüm testleri çalıştır**

Run: `npm --prefix backend test`
Expected: Tüm süitler geçer.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/admin/bookings.js backend/tests/bookingRecurring.test.js
git commit -m "feat: haftalık tekrarlayan randevu oluşturma"
```

---

### Task 3: Takvim yardımcıları ve WhatsApp linki (frontend lib)

**Files:**
- Modify: `frontend/src/lib/calendar.ts`
- Create: `frontend/src/lib/whatsapp.ts`

**Interfaces:**
- Consumes: `todayISO`, `DayCell` (mevcut `calendar.ts`)
- Produces:
  - `addDaysISO(iso: string, days: number): string`
  - `weekStartISO(iso: string): string` — pazartesiye çeker
  - `weekGrid(iso: string): DayCell[]` — 7 hücre
  - `weekRange(iso: string): { from: string; to: string }`
  - `formatWeekTitle(iso: string): string` — `"8 – 14 Eylül 2026"`
  - `HOUR_SLOTS: string[]` — `"08:00"` … `"20:00"`
  - `slotOf(time: string): string | null` — randevu saatini en yakın alt saat dilimine oturtur
  - `waLink(phone: string, text: string): string`

- [ ] **Step 1: `calendar.ts`'e eklemeleri yap**

`frontend/src/lib/calendar.ts` dosyasının sonuna ekle:

```ts
/** ISO tarihe gün ekler. Saat dilimi kaymasını önlemek için UTC üzerinden. */
export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Verilen günün içinde bulunduğu haftanın pazartesisi. */
export function weekStartISO(iso: string): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  // getUTCDay: 0 = pazar. Pazartesi başlangıçlı haftaya çeviriyoruz.
  const offset = (d.getUTCDay() + 6) % 7;
  return addDaysISO(iso, -offset);
}

/** Pazartesiden pazara 7 hücre. */
export function weekGrid(iso: string): DayCell[] {
  const start = weekStartISO(iso);
  const today = todayISO();
  return Array.from({ length: 7 }, (_, i) => {
    const cellIso = addDaysISO(start, i);
    return {
      iso: cellIso,
      day: Number(cellIso.slice(8, 10)),
      inMonth: true,
      isToday: cellIso === today,
    };
  });
}

export function weekRange(iso: string): { from: string; to: string } {
  const from = weekStartISO(iso);
  return { from, to: addDaysISO(from, 6) };
}

export function formatWeekTitle(iso: string): string {
  const { from, to } = weekRange(iso);
  const fmt = (s: string, withMonth: boolean) =>
    new Date(`${s}T00:00:00.000Z`).toLocaleDateString("tr-TR", {
      day: "numeric",
      ...(withMonth ? { month: "long", year: "numeric" } : {}),
      timeZone: "UTC",
    });
  return `${fmt(from, false)} – ${fmt(to, true)}`;
}

/** Haftalık ızgaranın satırları. Klinik saatleri dışına taşan randevular
 *  slotOf() ile en yakın uca çekilir; hiçbir randevu görünmez kalmaz. */
export const HOUR_SLOTS = Array.from({ length: 13 }, (_, i) =>
  `${String(i + 8).padStart(2, "0")}:00`,
);

export function slotOf(time: string): string | null {
  if (!time) return null;
  const hour = Number(time.slice(0, 2));
  if (Number.isNaN(hour)) return null;
  const clamped = Math.min(Math.max(hour, 8), 20);
  return `${String(clamped).padStart(2, "0")}:00`;
}
```

**Not:** `DayCell` arayüzü zaten `calendar.ts:26`'da tanımlı; yeniden tanımlama.

- [ ] **Step 2: `whatsapp.ts`'i yaz**

`frontend/src/lib/whatsapp.ts`:

```ts
/**
 * Türkiye telefon numarasını wa.me formatına çevirir.
 * Panelde numaralar "0(555) 123 45 67" gibi biçimli tutuluyor;
 * wa.me yalnızca rakam kabul eder ve ülke kodu ister.
 */
export function normalizeTrPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("5")) return `90${digits}`;
  if (digits.length === 11 && digits.startsWith("05")) return `90${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("90")) return digits;
  if (digits.length === 13 && digits.startsWith("090")) return digits.slice(1);
  return null;
}

export function waLink(phone: string, text: string): string | null {
  const normalized = normalizeTrPhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

/** Randevu hatırlatma metni. Diyetisyen göndermeden önce düzenleyebilir. */
export function reminderText(
  firstName: string,
  dateLabel: string,
  time: string,
): string {
  const when = time ? `${dateLabel} saat ${time}` : dateLabel;
  return `Merhaba ${firstName}, ${when} randevunuzu hatırlatmak istedim. Görüşmek üzere!`;
}
```

- [ ] **Step 3: Derlemeyi doğrula**

Run: `npm --prefix frontend run build`
Expected: Derleme hatasız tamamlanır.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/calendar.ts frontend/src/lib/whatsapp.ts
git commit -m "feat: haftalık takvim ve WhatsApp yardımcıları"
```

---

### Task 4: Takvim ekranını bileşenlere böl

**Files:**
- Create: `frontend/src/components/admin/calendar/MonthGrid.tsx`
- Create: `frontend/src/components/admin/calendar/DayStrip.tsx`
- Create: `frontend/src/components/admin/calendar/DayPanel.tsx`
- Modify: `frontend/src/app/admin/(panel)/takvim/page.tsx`

**Interfaces:**
- Consumes: `Booking` tipi, `STATUS` (`@/lib/bookingStatus`), `monthGrid`, `formatFullDate`
- Produces:
  - `<MonthGrid grid, byDay, selectedDay, onSelectDay />`
  - `<DayStrip grid, byDay, selectedDay, onSelectDay />`
  - `<DayPanel dayIso, bookings, onAdd, onAct, onEdit, onDelete />`

Bu task davranış değiştirmez — saf yeniden düzenleme. Amaç: `takvim/page.tsx`'i Task 5'te haftalık görünüm eklenebilecek kadar küçültmek.

- [ ] **Step 1: `MonthGrid.tsx`'i oluştur**

`takvim/page.tsx:149-204` arasındaki blok, prop alan bir bileşene taşınır:

```tsx
"use client";

import { STATUS } from "@/lib/bookingStatus";
import { WEEKDAY_LABELS, type DayCell } from "@/lib/calendar";
import type { Booking } from "@/types";

export default function MonthGrid({
  grid,
  byDay,
  selectedDay,
  onSelectDay,
}: {
  grid: DayCell[];
  byDay: Record<string, Booking[]>;
  selectedDay: string | null;
  onSelectDay: (iso: string) => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {WEEKDAY_LABELS.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-xs font-semibold text-gray-500 text-center"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map((cell) => {
          const items = byDay[cell.iso] ?? [];
          const selected = selectedDay === cell.iso;
          return (
            <button
              key={cell.iso}
              onClick={() => onSelectDay(cell.iso)}
              className={`min-h-24 border-b border-r border-gray-100 p-1.5 text-left align-top transition-colors ${
                cell.inMonth ? "bg-white" : "bg-gray-50/50"
              } ${selected ? "ring-2 ring-brand-400 ring-inset" : "hover:bg-brand-50/40"}`}
            >
              <div
                className={`text-xs font-medium mb-1 flex items-center justify-center w-6 h-6 rounded-full ${
                  cell.isToday
                    ? "bg-brand-500 text-white"
                    : cell.inMonth
                      ? "text-gray-700"
                      : "text-gray-300"
                }`}
              >
                {cell.day}
              </div>
              <div className="space-y-1">
                {items.slice(0, 3).map((b) => (
                  <div
                    key={b._id}
                    className={`text-[11px] leading-tight px-1.5 py-0.5 rounded truncate ${STATUS[b.status].badge}`}
                    title={`${b.time} ${b.patient.firstName} ${b.patient.lastName}`}
                  >
                    {b.time && <span className="font-medium">{b.time} </span>}
                    {b.patient.lastName}
                  </div>
                ))}
                {items.length > 3 && (
                  <div className="text-[11px] text-gray-400 px-1.5">
                    +{items.length - 3} daha
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

**Not:** `DayCell` tipini `calendar.ts` dışa aktarıyor mu kontrol et; etmiyorsa `export interface DayCell` olarak işaretle.

- [ ] **Step 2: `DayStrip.tsx`'i oluştur**

`takvim/page.tsx:207-234` arasındaki mobil şerit taşınır:

```tsx
"use client";

import type { DayCell } from "@/lib/calendar";
import type { Booking } from "@/types";

export default function DayStrip({
  grid,
  byDay,
  selectedDay,
  onSelectDay,
}: {
  grid: DayCell[];
  byDay: Record<string, Booking[]>;
  selectedDay: string | null;
  onSelectDay: (iso: string) => void;
}) {
  return (
    <div className="-mx-4 px-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {grid
          .filter((c) => c.inMonth)
          .map((cell) => {
            const count = (byDay[cell.iso] ?? []).length;
            const selected = selectedDay === cell.iso;
            return (
              <button
                key={cell.iso}
                onClick={() => onSelectDay(cell.iso)}
                className={`shrink-0 w-14 py-2 rounded-xl text-center border transition-colors ${
                  selected
                    ? "bg-brand-500 border-brand-500 text-white"
                    : cell.isToday
                      ? "border-brand-300 text-brand-600"
                      : "border-gray-200 text-gray-600 bg-white"
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
  );
}
```

- [ ] **Step 3: `DayPanel.tsx`'i oluştur**

`takvim/page.tsx:239-301` arasındaki seçili gün paneli taşınır. WhatsApp butonu Task 6'da eklenecek; şimdilik mevcut davranış birebir korunur:

```tsx
"use client";

import { STATUS } from "@/lib/bookingStatus";
import { formatFullDate } from "@/lib/calendar";
import { Button } from "@/components/admin/ui";
import type { Booking } from "@/types";

export default function DayPanel({
  dayIso,
  bookings,
  onAdd,
  onAct,
  onEdit,
  onDelete,
}: {
  dayIso: string;
  bookings: Booking[];
  onAdd: () => void;
  onAct: (b: Booking) => void;
  onEdit: (b: Booking) => void;
  onDelete: (b: Booking) => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 mt-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="font-semibold text-gray-900">{formatFullDate(dayIso)}</h2>
        <Button size="sm" onClick={onAdd}>
          + Randevu Ekle
        </Button>
      </div>
      {bookings.length === 0 ? (
        <p className="text-gray-400 text-sm">Bu güne randevu yok.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {bookings.map((b) => (
            <div
              key={b._id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 flex-wrap"
            >
              <span className="text-sm font-semibold text-gray-900 tabular-nums w-14 shrink-0">
                {b.time || "—"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {b.patient.firstName} {b.patient.lastName}
                  <span className="text-gray-400 font-normal ml-2">
                    {b.patient.phone}
                  </span>
                </p>
                {b.note && (
                  <p className="text-xs text-gray-500 truncate">{b.note}</p>
                )}
              </div>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS[b.status].badge}`}
              >
                {STATUS[b.status].label}
              </span>
              <div className="flex gap-3 items-center">
                {b.status === "planlandi" && (
                  <Button size="sm" onClick={() => onAct(b)}>
                    İşle
                  </Button>
                )}
                <button
                  onClick={() => onEdit(b)}
                  className="text-brand-600 hover:underline text-sm font-medium"
                >
                  Düzenle
                </button>
                <button
                  onClick={() => onDelete(b)}
                  className="text-red-400 hover:underline text-sm font-medium"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: `takvim/page.tsx`'i bu bileşenleri kullanacak şekilde sadeleştir**

JSX'te ay ızgarası bloğunu `<div className="hidden md:block"><MonthGrid … /></div>`, mobil şeridi `<div className="md:hidden"><DayStrip … /></div>`, seçili gün panelini `{selectedDay && <DayPanel … />}` ile değiştir. Handler'lar (`openNew`, `openEdit`, `handleDelete`, `setActing`) aynı kalır, prop olarak geçilir.

- [ ] **Step 5: Derle ve gözle doğrula**

Run: `npm --prefix frontend run build`
Expected: Hatasız.

Ardından `docker compose up -d --build` ile paneli aç, `/admin/takvim` sayfasının **öncekiyle birebir aynı** göründüğünü doğrula. Bu task davranış değiştirmemeli.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/admin/calendar frontend/src/app/admin/\(panel\)/takvim/page.tsx
git commit -m "refactor: takvim ekranı görünüm bileşenlerine bölündü"
```

---

### Task 5: Haftalık görünüm ve görünüm geçişi

**Files:**
- Create: `frontend/src/components/admin/calendar/WeekGrid.tsx`
- Create: `frontend/src/components/admin/calendar/ViewToggle.tsx`
- Modify: `frontend/src/app/admin/(panel)/takvim/page.tsx`

**Interfaces:**
- Consumes: `weekGrid`, `weekRange`, `formatWeekTitle`, `HOUR_SLOTS`, `slotOf`, `addDaysISO` (Task 3)
- Produces:
  - `type CalendarView = "ay" | "hafta"`
  - `<ViewToggle value, onChange />`
  - `<WeekGrid anchorIso, byDay, selectedDay, onSelectDay, onSelectBooking />`

- [ ] **Step 1: `ViewToggle.tsx`'i yaz**

```tsx
"use client";

export type CalendarView = "ay" | "hafta";

const OPTIONS: { key: CalendarView; label: string }[] = [
  { key: "hafta", label: "Hafta" },
  { key: "ay", label: "Ay" },
];

export default function ViewToggle({
  value,
  onChange,
}: {
  value: CalendarView;
  onChange: (v: CalendarView) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Takvim görünümü"
      className="inline-flex rounded-xl border border-gray-300 p-0.5 bg-white"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          role="tab"
          aria-selected={value === o.key}
          onClick={() => onChange(o.key)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            value === o.key
              ? "bg-brand-500 text-white"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: `WeekGrid.tsx`'i yaz**

Saat satırları × 7 gün sütunu. Randevusu olmayan hücre tıklanınca o gün seçilir; randevu kutusuna tıklanınca randevu açılır.

```tsx
"use client";

import { STATUS } from "@/lib/bookingStatus";
import { HOUR_SLOTS, slotOf, weekGrid, WEEKDAY_LABELS } from "@/lib/calendar";
import type { Booking } from "@/types";

export default function WeekGrid({
  anchorIso,
  byDay,
  selectedDay,
  onSelectDay,
  onSelectBooking,
}: {
  anchorIso: string;
  byDay: Record<string, Booking[]>;
  selectedDay: string | null;
  onSelectDay: (iso: string) => void;
  onSelectBooking: (b: Booking) => void;
}) {
  const days = weekGrid(anchorIso);

  // Saat dilimi × gün → randevular. Saati olmayan randevular ayrı bir
  // "saatsiz" satırında toplanır; aksi hâlde görünmez kalırlar.
  const cellOf = (iso: string, slot: string) =>
    (byDay[iso] ?? []).filter((b) => slotOf(b.time) === slot);
  const untimed = (iso: string) =>
    (byDay[iso] ?? []).filter((b) => !b.time);

  const hasUntimed = days.some((d) => untimed(d.iso).length > 0);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Başlık satırı */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)] bg-gray-50 border-b border-gray-200">
            <div />
            {days.map((d, i) => (
              <button
                key={d.iso}
                onClick={() => onSelectDay(d.iso)}
                className={`px-2 py-2 text-center border-l border-gray-200 transition-colors ${
                  selectedDay === d.iso ? "bg-brand-50" : "hover:bg-gray-100"
                }`}
              >
                <span className="block text-xs font-semibold text-gray-500">
                  {WEEKDAY_LABELS[i]}
                </span>
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 mt-0.5 rounded-full text-xs font-medium ${
                    d.isToday ? "bg-brand-500 text-white" : "text-gray-700"
                  }`}
                >
                  {d.day}
                </span>
              </button>
            ))}
          </div>

          {hasUntimed && (
            <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-gray-200 bg-amber-50/40">
              <div className="px-2 py-1.5 text-[11px] text-gray-500 text-right">
                Saatsiz
              </div>
              {days.map((d) => (
                <div
                  key={d.iso}
                  className="border-l border-gray-100 p-1 space-y-1"
                >
                  {untimed(d.iso).map((b) => (
                    <button
                      key={b._id}
                      onClick={() => onSelectBooking(b)}
                      className={`block w-full text-left text-[11px] leading-tight px-1.5 py-1 rounded truncate ${STATUS[b.status].badge}`}
                    >
                      {b.patient.lastName}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {HOUR_SLOTS.map((slot) => (
            <div
              key={slot}
              className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-gray-100 last:border-b-0"
            >
              <div className="px-2 py-1.5 text-[11px] text-gray-400 text-right tabular-nums">
                {slot}
              </div>
              {days.map((d) => {
                const items = cellOf(d.iso, slot);
                return (
                  <button
                    key={d.iso}
                    onClick={() => items.length === 0 && onSelectDay(d.iso)}
                    className={`min-h-11 border-l border-gray-100 p-1 space-y-1 text-left align-top transition-colors ${
                      selectedDay === d.iso ? "bg-brand-50/40" : "hover:bg-gray-50"
                    }`}
                  >
                    {items.map((b) => (
                      <span
                        key={b._id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectBooking(b);
                        }}
                        className={`block text-[11px] leading-tight px-1.5 py-1 rounded truncate cursor-pointer ${STATUS[b.status].badge}`}
                        title={`${b.time} ${b.patient.firstName} ${b.patient.lastName}`}
                      >
                        <span className="font-medium">{b.time}</span>{" "}
                        {b.patient.lastName}
                      </span>
                    ))}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `takvim/page.tsx`'i görünüm durumuyla güncelle**

Değişiklikler:

1. `selectedDay` başlangıcı `null` yerine `todayISO()`:

```tsx
  const [selectedDay, setSelectedDay] = useState<string>(todayISO());
```

`DayPanel` artık koşulsuz basılır; `selectedDay` tipi `string`, `null` değil. `openNew(day?: string)` içindeki `selectedDay ?? todayISO()` sadeleşir.

2. Görünüm durumu, tarayıcıda kalıcı:

```tsx
  const [view, setView] = useState<CalendarView>("hafta");

  // Diyetisyen hangi görünümü seçtiyse bir sonraki açılışta onu görsün.
  useEffect(() => {
    const saved = window.localStorage.getItem("takvimGorunum");
    if (saved === "ay" || saved === "hafta") setView(saved);
  }, []);

  const changeView = (v: CalendarView) => {
    setView(v);
    window.localStorage.setItem("takvimGorunum", v);
  };
```

3. Veri çekme aralığı görünüme göre değişir:

```tsx
  const fetchBookings = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const range =
        view === "ay" ? monthRange(year, month) : weekRange(selectedDay);
      setBookings(await adminGetBookings(token, range));
    } finally {
      setLoading(false);
    }
  }, [token, view, year, month, selectedDay]);
```

**Dikkat:** Haftalık görünümde `selectedDay` her değiştiğinde yeniden çekim olur. Aynı hafta içinde gün değiştirmek gereksiz istek doğurur — bunu önlemek için bağımlılığa `weekStartISO(selectedDay)` koy:

```tsx
  const weekAnchor = weekStartISO(selectedDay);
  // …
  }, [token, view, year, month, weekAnchor]);
```

4. Ay/hafta ileri-geri gezinme:

```tsx
  const goPrev = () => {
    if (view === "ay") {
      if (month === 0) {
        setYear((y) => y - 1);
        setMonth(11);
      } else setMonth((m) => m - 1);
    } else {
      setSelectedDay((d) => addDaysISO(d, -7));
    }
  };

  const goNext = () => {
    if (view === "ay") {
      if (month === 11) {
        setYear((y) => y + 1);
        setMonth(0);
      } else setMonth((m) => m + 1);
    } else {
      setSelectedDay((d) => addDaysISO(d, 7));
    }
  };

  const goToday = () => {
    const n = new Date();
    setYear(n.getFullYear());
    setMonth(n.getMonth());
    setSelectedDay(todayISO());
  };
```

5. Başlık görünüme göre:

```tsx
  const title =
    view === "ay" ? formatMonthTitle(year, month) : formatWeekTitle(selectedDay);
```

6. JSX'te ızgara seçimi:

```tsx
      <div className="hidden md:block">
        {view === "ay" ? (
          <MonthGrid
            grid={grid}
            byDay={byDay}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />
        ) : (
          <WeekGrid
            anchorIso={selectedDay}
            byDay={byDay}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            onSelectBooking={(b) =>
              b.status === "planlandi" ? setActing(b) : openEdit(b)
            }
          />
        )}
      </div>
```

Mobilde `DayStrip` korunur; ay ızgarası mobilde zaten gizli, haftalık ızgara da öyle (`hidden md:block`).

7. `ViewToggle`, ay navigasyon satırının sağına eklenir.

- [ ] **Step 4: Derle**

Run: `npm --prefix frontend run build`
Expected: Hatasız.

- [ ] **Step 5: Elle doğrula**

Panel açıkken `/admin/takvim`:
- Sayfa haftalık görünümde ve bugün seçili açılıyor
- `›` haftayı bir ileri alıyor, başlık `"15 – 21 Eylül 2026"` biçiminde
- "Ay" düğmesine basınca ay ızgarası geliyor; sayfa yenilenince ay görünümü korunuyor
- Haftalık ızgarada bir randevu kutusuna tıklamak İşle modalını açıyor
- Saati olmayan randevu "Saatsiz" satırında görünüyor

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/admin/calendar frontend/src/app/admin/\(panel\)/takvim/page.tsx
git commit -m "feat: takvimde haftalık saat görünümü ve görünüm hafızası"
```

---

### Task 6: Randevu formunda tekrar, çakışma uyarısı ve WhatsApp

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/components/admin/BookingForm.tsx`
- Modify: `frontend/src/components/admin/calendar/DayPanel.tsx`
- Modify: `frontend/src/types/index.ts`

**Interfaces:**
- Consumes: `POST /api/admin/bookings/recurring` (Task 2), 409 çakışma yanıtı (Task 1), `waLink`/`reminderText` (Task 3)
- Produces:
  - `adminCreateRecurringBookings(data, token)` → `Promise<{ created: Booking[]; skipped: { date: string; reason: string }[] }>`
  - `ApiConflictError` — `status` ve `body` taşıyan hata sınıfı

- [ ] **Step 1: `api.ts`'e çakışmayı ayırt eden hata ve yeni fonksiyonu ekle**

`apiFetch` şu an hata gövdesini nasıl işliyorsa (`api.ts` başındaki yardımcı), 409 durumunda gövdeyi taşıyan bir hata fırlatmalı. `api.ts`'in üst kısmına ekle:

```ts
export class ApiConflictError extends Error {
  body: unknown;
  constructor(message: string, body: unknown) {
    super(message);
    this.name = "ApiConflictError";
    this.body = body;
  }
}
```

`apiFetch` içindeki hata yolunda, `res.status === 409` ise `ApiConflictError` fırlat; diğer durumlarda mevcut davranış korunur.

`adminCreateBooking` ve `adminUpdateBooking` imzalarına `force?: boolean` ekle; `true` ise URL'ye `?force=true` eklenir.

Yeni fonksiyon:

```ts
export function adminCreateRecurringBookings(
  data: {
    patient: string;
    date: string;
    time?: string;
    note?: string;
    repeatWeeks: number;
  },
  token: string,
): Promise<{
  created: Booking[];
  skipped: { date: string; reason: string }[];
}> {
  return apiFetch("/api/admin/bookings/recurring", {
    method: "POST",
    body: JSON.stringify(data),
    token,
  });
}
```

- [ ] **Step 2: `BookingForm.tsx`'e tekrar alanını ekle**

Yalnızca **yeni** randevuda görünür (`initial` yoksa). Durum:

```tsx
  const [repeatWeeks, setRepeatWeeks] = useState(1);
```

Form alanı, not alanının altına:

```tsx
      {!initial && (
        <Field
          label="Tekrar"
          hint="Aynı saatte haftalık seri oluşturur"
        >
          <SelectInput
            value={String(repeatWeeks)}
            onChange={(v) => setRepeatWeeks(Number(v))}
            inputClassName={INPUT_CLS}
            options={[
              { value: "1", label: "Tekrar yok" },
              { value: "4", label: "4 hafta" },
              { value: "8", label: "8 hafta" },
              { value: "12", label: "12 hafta" },
            ]}
          />
        </Field>
      )}
```

Kaydetme akışı: `repeatWeeks > 1` ise `adminCreateRecurringBookings`, değilse `adminCreateBooking`. Seri sonucunda atlanan hafta varsa kullanıcıya göster:

```tsx
      if (repeatWeeks > 1) {
        const result = await adminCreateRecurringBookings(
          { patient, date, time, note, repeatWeeks },
          token,
        );
        if (result.skipped.length > 0) {
          setNotice(
            `${result.created.length} randevu oluşturuldu. ${result.skipped
              .map((s) => s.date)
              .join(", ")} tarihleri dolu olduğu için atlandı.`,
          );
        }
        onSaved();
        return;
      }
```

- [ ] **Step 3: Çakışma uyarısını ekle**

Tek randevu kaydında `ApiConflictError` yakalanır, kullanıcıya kimin randevusu olduğu gösterilir ve "Yine de kaydet" seçeneği sunulur:

```tsx
  const [conflict, setConflict] = useState<{
    message: string;
    patientName: string;
  } | null>(null);

  const save = async (force = false) => {
    setSaving(true);
    setError("");
    try {
      // …
      await adminCreateBooking({ patient, date, time, note }, token, force);
      onSaved();
    } catch (err) {
      if (err instanceof ApiConflictError) {
        const body = err.body as {
          message: string;
          conflict: { patient: { firstName: string; lastName: string } };
        };
        setConflict({
          message: body.message,
          patientName: `${body.conflict.patient.firstName} ${body.conflict.patient.lastName}`,
        });
        return;
      }
      setError(err instanceof Error ? err.message : "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  };
```

Uyarı bloğu:

```tsx
      {conflict && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="text-amber-800">
            Bu saatte <strong>{conflict.patientName}</strong> randevusu var.
          </p>
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => save(true)}>
              Yine de kaydet
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setConflict(null)}
            >
              Saati değiştir
            </Button>
          </div>
        </div>
      )}
```

- [ ] **Step 4: `DayPanel.tsx`'e WhatsApp butonunu ekle**

Telefonun yanına, yalnızca numara geçerliyse:

```tsx
import { waLink, reminderText } from "@/lib/whatsapp";
import { formatFullDate } from "@/lib/calendar";
```

Randevu satırında, "Düzenle"nin solunda:

```tsx
                {(() => {
                  const href = waLink(
                    b.patient.phone,
                    reminderText(
                      b.patient.firstName,
                      formatFullDate(dayIso),
                      b.time,
                    ),
                  );
                  if (!href) return null;
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="WhatsApp'tan hatırlat"
                      className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                    >
                      Hatırlat
                    </a>
                  );
                })()}
```

- [ ] **Step 5: Derle**

Run: `npm --prefix frontend run build`
Expected: Hatasız.

- [ ] **Step 6: Elle doğrula**

- Yeni randevu → Tekrar "4 hafta" → 4 randevu oluşuyor, takvimde dört hafta üst üste görünüyor
- Dolu bir saate randevu → sarı uyarı, "Yine de kaydet" çalışıyor
- "Hatırlat" WhatsApp'ı hazır mesajla açıyor

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/components/admin frontend/src/types/index.ts
git commit -m "feat: seri randevu, çakışma uyarısı ve WhatsApp hatırlatma"
```

---

## Faz 2 — Finans

### Task 7: Alacaklar endpoint'i

**Files:**
- Create: `backend/src/routes/admin/receivables.js`
- Modify: `backend/src/app.js`
- Test: `backend/tests/receivables.test.js`

**Interfaces:**
- Consumes: `backend/src/lib/receivables.js` — `{ total, byPatient }` döndüren mevcut hesaplayıcı (`byPatient` bir `Map<patientId, debt>`)
- Produces: `GET /api/admin/receivables` → `{ total: number, rows: { patient: { _id, firstName, lastName, phone }, debt: number }[] }`, borç büyükten küçüğe sıralı

- [ ] **Step 1: Mevcut hesaplayıcının imzasını oku**

Run: `cat backend/src/lib/receivables.js`

Dışa aktardığı fonksiyonun adını ve parametrelerini not al — `stats.js` onu nasıl çağırıyorsa aynı şekilde çağrılacak. `stats.js` içinde `receivables` değişkenini üreten satırı bul:

Run: `grep -n "receivables" backend/src/routes/admin/stats.js`

- [ ] **Step 2: Testi yaz**

`backend/tests/receivables.test.js`:

```js
const request = require("supertest");
const app = require("../src/app");
const Patient = require("../src/models/Patient");
const Booking = require("../src/models/Booking");
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

describe("GET /api/admin/receivables", () => {
  it("token olmadan 401 döner", async () => {
    const res = await request(app).get("/api/admin/receivables");
    expect(res.status).toBe(401);
  });

  it("borcu olmayan danışan listede yer almaz", async () => {
    const p = await Patient.create({
      firstName: "Ayşe",
      lastName: "Yılmaz",
      phone: "05551234567",
    });
    const b = await Booking.create({
      patient: p._id,
      date: new Date("2026-09-01T00:00:00.000Z"),
      status: "geldi",
      fee: 500,
    });
    await Payment.create({
      patient: p._id,
      source: "booking",
      booking: b._id,
      amount: 500,
      method: "nakit",
      date: b.date,
    });

    const res = await request(app)
      .get("/api/admin/receivables")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.rows).toHaveLength(0);
  });

  it("eksik tahsilatı alacak olarak listeler", async () => {
    const p = await Patient.create({
      firstName: "Berk",
      lastName: "Demir",
      phone: "05559876543",
    });
    const b = await Booking.create({
      patient: p._id,
      date: new Date("2026-09-01T00:00:00.000Z"),
      status: "geldi",
      fee: 800,
    });
    await Payment.create({
      patient: p._id,
      source: "booking",
      booking: b._id,
      amount: 300,
      method: "nakit",
      date: b.date,
    });

    const res = await request(app)
      .get("/api/admin/receivables")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(500);
    expect(res.body.rows).toHaveLength(1);
    expect(res.body.rows[0].debt).toBe(500);
    expect(res.body.rows[0].patient.firstName).toBe("Berk");
    expect(res.body.rows[0].patient.phone).toBe("05559876543");
  });

  it("borcu büyükten küçüğe sıralar", async () => {
    const az = await Patient.create({
      firstName: "Az",
      lastName: "Borç",
      phone: "05551111111",
    });
    const cok = await Patient.create({
      firstName: "Çok",
      lastName: "Borç",
      phone: "05552222222",
    });
    await Booking.create({
      patient: az._id,
      date: new Date("2026-09-01T00:00:00.000Z"),
      status: "geldi",
      fee: 200,
    });
    await Booking.create({
      patient: cok._id,
      date: new Date("2026-09-01T00:00:00.000Z"),
      status: "geldi",
      fee: 900,
    });

    const res = await request(app)
      .get("/api/admin/receivables")
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.rows.map((r) => r.debt)).toEqual([900, 200]);
  });
});
```

- [ ] **Step 3: Testi çalıştır, kırmızı olduğunu gör**

Run: `npm --prefix backend test -- receivables`
Expected: FAIL — 404.

- [ ] **Step 4: Route'u yaz**

`backend/src/routes/admin/receivables.js`. **Step 1'de bulduğun fonksiyon adını kullan** — aşağıda `computeReceivables` olarak yazıldı; gerçek ad farklıysa onu koy:

```js
const express = require("express");
const Patient = require("../../models/Patient");
const { protect } = require("../../middleware/auth");
const computeReceivables = require("../../lib/receivables");

const router = express.Router();
router.use(protect);

// GET /api/admin/receivables
// Danışan bazlı bekleyen alacak. İstatistik ekranındaki toplamla aynı
// hesaplayıcıyı kullanır — iki ekran arasında tutarsızlık olmasın.
router.get("/", async (req, res) => {
  try {
    const { total, byPatient } = await computeReceivables();

    const entries = [...byPatient.entries()]
      .filter(([, debt]) => debt > 0)
      .sort((a, b) => b[1] - a[1]);

    const patients = await Patient.find({
      _id: { $in: entries.map(([id]) => id) },
    }).select("firstName lastName phone");
    const byId = new Map(patients.map((p) => [String(p._id), p]));

    const rows = entries
      .map(([id, debt]) => {
        const patient = byId.get(id);
        if (!patient) return null;
        return { patient, debt };
      })
      .filter(Boolean);

    res.json({ total, rows });
  } catch (err) {
    console.error("Receivables error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
```

`backend/src/app.js`'e kaydı ekle (diğer admin route kayıtlarının yanına):

```js
app.use("/api/admin/receivables", require("./routes/admin/receivables"));
```

- [ ] **Step 5: Testi çalıştır, yeşil olduğunu gör**

Run: `npm --prefix backend test -- receivables`
Expected: PASS — 4 test.

- [ ] **Step 6: Tüm testler**

Run: `npm --prefix backend test`
Expected: Tüm süitler geçer.

- [ ] **Step 7: Commit**

```bash
git add backend/src/routes/admin/receivables.js backend/src/app.js backend/tests/receivables.test.js
git commit -m "feat: danışan bazlı alacak listesi endpoint'i"
```

---

### Task 8: CSV dışa aktarma yardımcısı

**Files:**
- Create: `frontend/src/lib/csv.ts`

**Interfaces:**
- Produces:
  - `toCsv<T>(rows: T[], columns: { header: string; value: (row: T) => string | number }[]): string`
  - `downloadCsv(filename: string, csv: string): void`

- [ ] **Step 1: Yardımcıyı yaz**

`frontend/src/lib/csv.ts`:

```ts
/**
 * Basit CSV üretimi. Excel'in Türkçe karakterleri doğru okuması için
 * dosyanın başına UTF-8 BOM konur; ayraç olarak noktalı virgül kullanılır
 * çünkü Türkçe yerelde Excel virgülü ondalık ayracı sayar.
 */

const SEPARATOR = ";";

function escapeCell(value: string | number): string {
  const s = String(value ?? "");
  if (s.includes('"') || s.includes(SEPARATOR) || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv<T>(
  rows: T[],
  columns: { header: string; value: (row: T) => string | number }[],
): string {
  const head = columns.map((c) => escapeCell(c.header)).join(SEPARATOR);
  const body = rows.map((row) =>
    columns.map((c) => escapeCell(c.value(row))).join(SEPARATOR),
  );
  return [head, ...body].join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** "gelirler-2026-09-01_2026-09-30.csv" gibi dosya adı üretir. */
export function rangeFilename(
  prefix: string,
  range: { from: string; to: string } | null,
): string {
  if (!range) return `${prefix}.csv`;
  return `${prefix}-${range.from}_${range.to}.csv`;
}
```

- [ ] **Step 2: Derle**

Run: `npm --prefix frontend run build`
Expected: Hatasız.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/csv.ts
git commit -m "feat: CSV dışa aktarma yardımcısı"
```

---

### Task 9: Finans ekranı — ortak özet, dışa aktarma, alacaklar sekmesi

**Files:**
- Create: `frontend/src/components/admin/finans/FinanceSummary.tsx`
- Create: `frontend/src/components/admin/finans/ReceivablesTab.tsx`
- Modify: `frontend/src/components/admin/finans/ExpensesTab.tsx`
- Modify: `frontend/src/app/admin/(panel)/finans/page.tsx`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/types/index.ts`

**Interfaces:**
- Consumes: `GET /api/admin/receivables` (Task 7), `toCsv`/`downloadCsv`/`rangeFilename` (Task 8), `waLink` (Task 3)
- Produces:
  - `adminGetReceivables(token)` → `Promise<ReceivablesResponse>`
  - `type ReceivablesResponse = { total: number; rows: { patient: Patient; debt: number }[] }`
  - `<FinanceSummary income, expense />`

- [ ] **Step 1: Tipi ve API fonksiyonunu ekle**

`frontend/src/types/index.ts`:

```ts
export interface ReceivableRow {
  patient: Pick<Patient, "_id" | "firstName" | "lastName" | "phone">;
  debt: number;
}

export interface ReceivablesResponse {
  total: number;
  rows: ReceivableRow[];
}
```

`frontend/src/lib/api.ts`:

```ts
export function adminGetReceivables(
  token: string,
): Promise<ReceivablesResponse> {
  return apiFetch("/api/admin/receivables", { token });
}
```

- [ ] **Step 2: `FinanceSummary.tsx`'i yaz**

```tsx
"use client";

import { formatTRY } from "@/lib/periods";
import { StatTile } from "@/components/admin/ui";

/** Dönemin tahsilat / gider / net üçlüsü. Gelirler ve Giderler
 *  sekmelerinde aynı görünsün diye tek yerde tutuluyor. */
export default function FinanceSummary({
  income,
  expense,
}: {
  income: number;
  expense: number;
}) {
  const net = income - expense;
  return (
    <div className="grid sm:grid-cols-3 gap-4 mb-6">
      <StatTile label="Toplam Tahsilat" value={formatTRY(income)} accent />
      <StatTile label="Toplam Gider" value={formatTRY(expense)} />
      <StatTile
        label="Net"
        value={formatTRY(net)}
        accent={net < 0}
      />
    </div>
  );
}
```

- [ ] **Step 3: `ReceivablesTab.tsx`'i yaz**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminGetReceivables } from "@/lib/api";
import { formatTRY } from "@/lib/periods";
import { toCsv, downloadCsv } from "@/lib/csv";
import { waLink } from "@/lib/whatsapp";
import {
  Button,
  DataTable,
  EmptyState,
  StatTile,
  type Column,
} from "@/components/admin/ui";
import type { ReceivableRow, ReceivablesResponse } from "@/types";

export default function ReceivablesTab({ token }: { token: string }) {
  const [data, setData] = useState<ReceivablesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    adminGetReceivables(token)
      .then(setData)
      .finally(() => setLoading(false));
  }, [token]);

  const columns: Column<ReceivableRow>[] = [
    {
      key: "patient",
      header: "Danışan",
      render: (r) => (
        <Link
          href={`/admin/hastalar/${r.patient._id}`}
          className="text-gray-900 font-medium hover:text-brand-600"
        >
          {r.patient.firstName} {r.patient.lastName}
        </Link>
      ),
    },
    { key: "phone", header: "Telefon", render: (r) => r.patient.phone },
    {
      key: "debt",
      header: "Borç",
      align: "right",
      render: (r) => (
        <span className="font-medium tabular-nums text-amber-600">
          {formatTRY(r.debt)}
        </span>
      ),
    },
    {
      key: "action",
      header: "",
      render: (r) => {
        const href = waLink(
          r.patient.phone,
          `Merhaba ${r.patient.firstName}, bekleyen ${formatTRY(r.debt)} tutarındaki ödemenizi hatırlatmak istedim.`,
        );
        if (!href) return null;
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
          >
            Hatırlat
          </a>
        );
      },
    },
  ];

  const exportCsv = () => {
    if (!data) return;
    const csv = toCsv(data.rows, [
      { header: "Danışan", value: (r) => `${r.patient.firstName} ${r.patient.lastName}` },
      { header: "Telefon", value: (r) => r.patient.phone },
      { header: "Borç", value: (r) => r.debt },
    ]);
    downloadCsv("alacaklar.csv", csv);
  };

  return (
    <>
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatTile
          label="Bekleyen Alacak"
          value={formatTRY(data?.total ?? 0)}
          accent={(data?.total ?? 0) > 0}
        />
        <StatTile
          label="Borçlu Danışan"
          value={String(data?.rows.length ?? 0)}
        />
      </div>

      <div className="flex justify-end mb-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={exportCsv}
          disabled={!data || data.rows.length === 0}
        >
          Dışa aktar
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-400">Yükleniyor…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={data?.rows ?? []}
          keyOf={(r) => r.patient._id}
          empty={
            <EmptyState
              title="Bekleyen alacak yok"
              description="Tahakkuk eden her ücret tahsil edilmiş görünüyor."
            />
          }
        />
      )}
    </>
  );
}
```

**Not:** `Column` tipinin `align` ve `render` alanları `DataTable.tsx`'te tanımlı; `finans/page.tsx:59-97`'deki kullanımla aynı şekil.

- [ ] **Step 4: `finans/page.tsx`'i güncelle**

1. `Tab` tipine `"alacaklar"` ekle, `Tabs` items'a `{ key: "alacaklar", label: "Alacaklar" }` ekle.
2. Gelirler sekmesindeki üç `StatTile` bloğunu `<FinanceSummary income={incomeTotal} expense={expenseTotal} />` ile değiştir.
3. `{tab === "alacaklar" && <ReceivablesTab token={token} />}` ekle.
4. `tab !== "paketler"` koşulunu `tab === "gelirler" || tab === "giderler"` yap — alacaklar dönemsel değil, `PeriodFilter` orada gösterilmez.
5. Gelirler tablosunun üstüne dışa aktar düğmesi:

```tsx
          <div className="flex justify-end mb-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const csv = toCsv(payments, [
                  {
                    header: "Danışan",
                    value: (p) => `${p.patient.firstName} ${p.patient.lastName}`,
                  },
                  { header: "Kaynak", value: sourceLabel },
                  { header: "Tutar", value: (p) => p.amount },
                  { header: "Yöntem", value: (p) => PAYMENT_METHOD[p.method].label },
                  {
                    header: "Tarih",
                    value: (p) => new Date(p.date).toLocaleDateString("tr-TR"),
                  },
                ]);
                downloadCsv(rangeFilename("gelirler", range), csv);
              }}
              disabled={payments.length === 0}
            >
              Dışa aktar
            </Button>
          </div>
```

- [ ] **Step 5: `ExpensesTab.tsx`'i güncelle**

1. Tek `StatTile` yerine `<FinanceSummary income={incomeTotal} expense={total} />`. Gelir toplamı prop olarak gelmeli — `finans/page.tsx` zaten `incomeTotal` tutuyor, `<ExpensesTab token={token} range={range} incomeTotal={incomeTotal} />` olarak geçir ve bileşen imzasına ekle.
2. Gider tablosunun üstüne aynı desende dışa aktar düğmesi ekle; sütunlar: Başlık, Kategori, Tutar, Tarih. `ExpensesTab.tsx`'teki mevcut sütun tanımlarına bak, aynı alan adlarını kullan.

- [ ] **Step 6: Derle**

Run: `npm --prefix frontend run build`
Expected: Hatasız.

- [ ] **Step 7: Elle doğrula**

- Finans'ta 4 sekme var
- Giderler sekmesinde de Net kutusu görünüyor ve Gelirler'dekiyle aynı sayıyı veriyor
- "Dışa aktar" indirilen dosya Excel'de Türkçe karakterlerle doğru açılıyor
- Alacaklar sekmesi borçluları büyükten küçüğe listeliyor, toplam "Bugün" ekranındaki "Bekleyen Alacak" ile aynı

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/admin/finans frontend/src/app/admin/\(panel\)/finans/page.tsx frontend/src/lib/api.ts frontend/src/types/index.ts
git commit -m "feat: finansta alacaklar sekmesi, net özeti ve CSV dışa aktarma"
```

---

## Faz 3 — Blog SEO alanları

### Task 10: Post şemasına SEO alanları

**Files:**
- Modify: `backend/src/models/Post.js`
- Modify: `backend/src/routes/admin/posts.js`
- Test: `backend/tests/posts.seo.test.js`

**Interfaces:**
- Produces: `Post` belgesinde `metaTitle: string`, `metaDescription: string`, `coverImageAlt: string` (hepsi opsiyonel, varsayılan `""`)

- [ ] **Step 1: Testi yaz**

`backend/tests/posts.seo.test.js`:

```js
const request = require("supertest");
const app = require("../src/app");
const Post = require("../src/models/Post");
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

const base = {
  title: "Kilo verirken protein",
  slug: "kilo-verirken-protein",
  excerpt: "Kısa özet",
  content: "<p>İçerik</p>",
};

describe("blog SEO alanları", () => {
  it("SEO alanlarını kaydeder ve geri döner", async () => {
    const res = await request(app)
      .post("/api/admin/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...base,
        metaTitle: "Kilo Verirken Protein | Dyt. Beyza Şule",
        metaDescription: "Kilo verirken protein ihtiyacı nasıl hesaplanır?",
        coverImageAlt: "Tabakta ızgara tavuk ve sebze",
      });

    expect(res.status).toBe(201);
    expect(res.body.metaTitle).toBe("Kilo Verirken Protein | Dyt. Beyza Şule");
    expect(res.body.metaDescription).toBe(
      "Kilo verirken protein ihtiyacı nasıl hesaplanır?",
    );
    expect(res.body.coverImageAlt).toBe("Tabakta ızgara tavuk ve sebze");
  });

  it("SEO alanları verilmezse boş string olur", async () => {
    const res = await request(app)
      .post("/api/admin/posts")
      .set("Authorization", `Bearer ${token}`)
      .send(base);

    expect(res.status).toBe(201);
    expect(res.body.metaTitle).toBe("");
    expect(res.body.metaDescription).toBe("");
    expect(res.body.coverImageAlt).toBe("");
  });

  it("güncellemede SEO alanları değişir", async () => {
    const created = await Post.create(base);
    const res = await request(app)
      .put(`/api/admin/posts/${created._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ metaTitle: "Yeni başlık" });

    expect(res.status).toBe(200);
    expect(res.body.metaTitle).toBe("Yeni başlık");
    expect(res.body.title).toBe(base.title);
  });

  it("metaTitle 70 karakteri aşarsa 400 döner", async () => {
    const res = await request(app)
      .post("/api/admin/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...base, metaTitle: "x".repeat(71) });

    expect(res.status).toBe(400);
  });

  it("metaDescription 200 karakteri aşarsa 400 döner", async () => {
    const res = await request(app)
      .post("/api/admin/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...base, metaDescription: "x".repeat(201) });

    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Testi çalıştır, kırmızı olduğunu gör**

Run: `npm --prefix backend test -- posts.seo`
Expected: FAIL.

- [ ] **Step 3: Modeli güncelle**

`backend/src/models/Post.js` — `coverImage` satırının altına:

```js
    coverImageAlt: { type: String, default: "", trim: true },
    // SEO alanları boşsa frontend title/excerpt'e düşer (bkz. lib/seo.ts).
    metaTitle: { type: String, default: "", trim: true },
    metaDescription: { type: String, default: "", trim: true },
```

- [ ] **Step 4: Zod şemasını güncelle**

`backend/src/routes/admin/posts.js` içindeki post şemasına ekle:

```js
  coverImageAlt: z.string().max(200).optional(),
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(200).optional(),
```

**Dikkat:** Sınırlar Google'ın kırpma eşiklerinin biraz üstünde tutuldu — 60/160 hedef, 70/200 sert sınır. Panelde sayaç 60/160'ta sararacak (Task 11).

- [ ] **Step 5: Testi çalıştır, yeşil olduğunu gör**

Run: `npm --prefix backend test -- posts.seo`
Expected: PASS — 5 test.

- [ ] **Step 6: Tüm testler**

Run: `npm --prefix backend test`
Expected: Tüm süitler geçer.

- [ ] **Step 7: Commit**

```bash
git add backend/src/models/Post.js backend/src/routes/admin/posts.js backend/tests/posts.seo.test.js
git commit -m "feat: blog yazılarına meta başlık, açıklama ve görsel alt metni"
```

---

### Task 11: Panelde SEO alanları ve public sayfada kullanımı

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/app/admin/(panel)/blog/[id]/page.tsx`
- Modify: `frontend/src/app/blog/[slug]/page.tsx`

**Interfaces:**
- Consumes: Task 10'un alanları
- Produces: `<CharCounter value, ideal, max />` — `blog/[id]/page.tsx` içinde yerel yardımcı bileşen

- [ ] **Step 1: Tipi güncelle**

`frontend/src/types/index.ts` — `Post` arayüzüne:

```ts
  coverImageAlt?: string;
  metaTitle?: string;
  metaDescription?: string;
```

- [ ] **Step 2: Panele SEO bölümünü ekle**

`frontend/src/app/admin/(panel)/blog/[id]/page.tsx` — form durumuna üç alan ekle, kaydetme gövdesine dahil et, ve içerik alanının altına katlanabilir bir bölüm koy:

```tsx
function CharCounter({
  value,
  ideal,
  max,
}: {
  value: string;
  ideal: number;
  max: number;
}) {
  const len = value.length;
  const tone =
    len === 0
      ? "text-gray-400"
      : len > max
        ? "text-red-500"
        : len > ideal
          ? "text-amber-600"
          : "text-emerald-600";
  return (
    <span className={`text-xs tabular-nums ${tone}`}>
      {len}/{ideal}
    </span>
  );
}
```

Bölüm:

```tsx
      <details className="bg-white border border-gray-200 rounded-2xl p-6">
        <summary className="font-semibold text-gray-900 cursor-pointer">
          SEO ayarları
        </summary>
        <p className="text-sm text-gray-500 mt-2 mb-4">
          Boş bırakılırsa yazının başlığı ve özeti kullanılır.
        </p>

        <Field
          label={
            <span className="flex items-center justify-between">
              Meta başlık
              <CharCounter value={metaTitle} ideal={60} max={70} />
            </span>
          }
          hint="Google'da görünen başlık. 60 karakteri aşarsa kırpılır."
        >
          <input
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            maxLength={70}
            className={INPUT_CLS}
          />
        </Field>

        <Field
          label={
            <span className="flex items-center justify-between">
              Meta açıklama
              <CharCounter value={metaDescription} ideal={160} max={200} />
            </span>
          }
          hint="Arama sonucundaki açıklama. 160 karakteri aşarsa kırpılır."
        >
          <textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            maxLength={200}
            rows={3}
            className={INPUT_CLS}
          />
        </Field>

        <Field
          label="Kapak görseli alt metni"
          hint="Görseli göremeyenler ve Google için görselin tarifi."
        >
          <input
            value={coverImageAlt}
            onChange={(e) => setCoverImageAlt(e.target.value)}
            maxLength={200}
            className={INPUT_CLS}
          />
        </Field>
      </details>
```

**Dikkat:** `Field` bileşeninin `label` prop'u `string` bekliyor olabilir. `frontend/src/components/admin/ui/Field.tsx`'i aç; `label: string` ise `React.ReactNode` olarak genişlet.

- [ ] **Step 3: Public blog sayfasında kullan**

`frontend/src/app/blog/[slug]/page.tsx`:

`generateMetadata` içinde, `buildMetadata` çağrısına giden değerleri değiştir:

```ts
  return buildMetadata({
    title: post.metaTitle || post.title,
    description: post.metaDescription || truncate(stripHtml(post.excerpt), 160),
    path: `/blog/${post.slug}`,
    image: post.coverImage,
  });
```

`next/image` çağrısında:

```tsx
        alt={post.coverImageAlt || post.title}
```

Aynı `alt` düzeltmesini `frontend/src/app/blog/page.tsx`'teki liste görselinde de yap.

- [ ] **Step 4: Derle**

Run: `npm --prefix frontend run build`
Expected: Hatasız.

- [ ] **Step 5: Elle doğrula**

- Panelde bir yazıyı aç, "SEO ayarları" bölümünü genişlet, meta başlığı 65 karakter yap → sayaç sarı
- Kaydet, public yazıya git, sayfa kaynağında `<title>` ve `<meta name="description">` girilen değerleri gösteriyor
- Alt metni girilmiş bir kapak görselinin `alt` özniteliği doğru

- [ ] **Step 6: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/app/admin frontend/src/app/blog
git commit -m "feat: panelde blog SEO alanları, public sayfada kullanımı"
```

---

## Faz 4 — Hizmet sayfaları

> **Ön koşul:** `docs/icerik/hizmetler/*.md` içindeki `[ONAY: ...]` işaretleri diyetisyen tarafından çözülmüş olmalı. Çözülmeden sayfa **yayına alınmamalı**. Bu fazın kodu yazılabilir; içerik dosyalarına taşınırken `[ONAY]` kalan yerler için Task 12'de açık bir kontrol var.

### Task 12: Hizmet içerik veri katmanı

**Files:**
- Create: `frontend/src/content/hizmetler/types.ts`
- Create: `frontend/src/content/hizmetler/index.ts`
- Create: `frontend/src/content/hizmetler/<slug>.ts` × 7

**Interfaces:**
- Produces:

```ts
export interface ServiceFaq {
  question: string;
  answer: string;
}

export interface ServiceSection {
  heading: string;
  /** Paragraflar. HTML değil düz metin — sayfada <p> olarak basılır. */
  paragraphs?: string[];
  /** Madde listesi. */
  bullets?: string[];
  /** Numaralı alt adımlar (Süreç bölümü için). */
  steps?: { heading: string; body: string }[];
}

export interface ServiceContent {
  slug: string;
  /** Services.tsx'teki başlıkla birebir aynı olmalı. */
  title: string;
  emoji: string;
  /** Kart açıklaması — Services.tsx'ten taşınır. */
  cardDescription: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string[];
  audience: string[];
  sections: ServiceSection[];
  faqs: ServiceFaq[];
  /** İlgili diğer hizmetlerin slug'ları. En az 2. */
  related: string[];
}
```

- [ ] **Step 1: `types.ts`'i yukarıdaki içerikle oluştur**

- [ ] **Step 2: Yedi içerik dosyasını oluştur**

Kaynak: `docs/icerik/hizmetler/01…07`. Her dosya için:

- `docs/icerik/hizmetler/0N-<slug>.md` dosyasını oku
- "Meta bilgiler" bölümündeki meta başlık, meta açıklama ve H1'i al
- "Giriş" paragraflarını `intro` dizisine
- "Kimler için uygun?" maddelerini `audience` dizisine
- "Süreç nasıl işliyor?" alt başlıklarını `sections[0].steps`'e
- "Yaklaşımım" paragraflarını `sections[1].paragraphs`'a
- SSS'leri `faqs`'a
- "İç bağlantılar" listesindeki `/hizmetler/...` slug'larını `related`'a

Dosya adları: `kilo-verme-danismanligi.ts`, `kilo-alma-danismanligi.ts`, `sporcu-beslenmesi.ts`, `hastaliklara-ozel-beslenme.ts`, `arinma-ve-beslenme-duzenleme.ts`, `gebelikte-beslenme.ts`, `emzirme-doneminde-beslenme.ts`.

Örnek (`kilo-alma-danismanligi.ts` başlangıcı):

```ts
import type { ServiceContent } from "./types";

const content: ServiceContent = {
  slug: "kilo-alma-danismanligi",
  title: "Kilo Alma Danışmanlığı",
  emoji: "📈",
  cardDescription:
    "Sağlıklı ve kontrollü kilo artışını hedefleyen, vücudun enerji ve besin ihtiyacını gözeterek planlanan bireysel programlar.",
  metaTitle: "Lüleburgaz Kilo Alma Danışmanlığı | Diyetisyen Beyza Şule",
  metaDescription:
    "Lüleburgaz'da sağlıklı kilo alma danışmanlığı. Diyetisyen Beyza Şule Kahraman ile kas ağırlıklı, kontrollü kilo artışı için kişiye özel plan. Randevu alın.",
  h1: "Lüleburgaz Kilo Alma Danışmanlığı",
  intro: [
    "Kilo alamamak, çoğu zaman hafife alınan bir sorundur. …",
    "Lüleburgaz'daki kilo alma danışmanlığımda önce nedeni arıyorum. …",
  ],
  audience: [
    "Uzun süredir kilo alamayan, iştahı düşük olan kişiler",
    // …
  ],
  sections: [
    {
      heading: "Süreç nasıl işliyor?",
      steps: [
        {
          heading: "Nedenin araştırılması",
          body: "İlk görüşmede beslenme geçmişinizi… ",
        },
        // …
      ],
    },
    {
      heading: "Yaklaşımım",
      paragraphs: ["Kırklareli Üniversitesi Beslenme ve Diyetetik mezunuyum…"],
    },
  ],
  faqs: [
    {
      question: "Ayda kaç kilo alabilirim?",
      answer: "Kas ağırlıklı ve korunabilir bir artış genellikle…",
    },
    // …
  ],
  related: ["sporcu-beslenmesi", "hastaliklara-ozel-beslenme"],
};

export default content;
```

- [ ] **Step 3: `[ONAY]` kalmadığını doğrula**

Run: `grep -rn "ONAY" frontend/src/content/hizmetler/`
Expected: **Hiçbir sonuç dönmemeli.** Sonuç dönerse o metin henüz onaylanmamış demektir — diyetisyene sor, kodda bırakma.

- [ ] **Step 4: `index.ts`'i oluştur**

```ts
import type { ServiceContent } from "./types";
import kiloVerme from "./kilo-verme-danismanligi";
import kiloAlma from "./kilo-alma-danismanligi";
import sporcu from "./sporcu-beslenmesi";
import hastalik from "./hastaliklara-ozel-beslenme";
import arinma from "./arinma-ve-beslenme-duzenleme";
import gebelik from "./gebelikte-beslenme";
import emzirme from "./emzirme-doneminde-beslenme";

/** Sıra, ana sayfadaki Services.tsx kart sırasıyla aynı. */
export const SERVICES: ServiceContent[] = [
  kiloVerme,
  kiloAlma,
  sporcu,
  hastalik,
  arinma,
  gebelik,
  emzirme,
];

export function getService(slug: string): ServiceContent | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

export type { ServiceContent, ServiceFaq, ServiceSection } from "./types";
```

- [ ] **Step 5: Derle**

Run: `npm --prefix frontend run build`
Expected: Hatasız.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/content/hizmetler
git commit -m "feat: hizmet sayfası içerikleri veri katmanına taşındı"
```

---

### Task 13: `/hizmetler` sayfaları ve yapısal veri

**Files:**
- Modify: `frontend/src/lib/seo.ts`
- Create: `frontend/src/app/hizmetler/page.tsx`
- Create: `frontend/src/app/hizmetler/[slug]/page.tsx`
- Modify: `frontend/src/app/sitemap.xml/route.ts`
- Modify: `frontend/src/components/Services.tsx`

**Interfaces:**
- Consumes: `SERVICES`, `getService` (Task 12); `buildMetadata`, `breadcrumbSchema`, `faqPageSchema`, `SITE` (mevcut `lib/seo.ts`)
- Produces: `serviceSchema({ name, description, url }): object`

- [ ] **Step 1: `serviceSchema`'yı ekle**

`frontend/src/lib/seo.ts` — mevcut üreticilerin yanına:

```ts
/** Service şeması. provider, root layout'taki LocalBusiness'a @id ile bağlanır. */
export function serviceSchema({
  name,
  description,
  url,
}: {
  name: string;
  description: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    serviceType: name,
    url: `${SITE.url}${url}`,
    provider: { "@id": `${SITE.url}/#localbusiness` },
    areaServed: [
      { "@type": "City", name: "Lüleburgaz" },
      { "@type": "AdministrativeArea", name: "Kırklareli" },
    ],
  };
}
```

**Dikkat:** `provider["@id"]` değeri, root layout'taki `@graph` içindeki LocalBusiness düğümünün `@id`'siyle **birebir aynı** olmalı. `frontend/src/app/layout.tsx`'i açıp gerçek `@id` değerini oku ve buraya onu yaz.

- [ ] **Step 2: Liste sayfasını oluştur**

`frontend/src/app/hizmetler/page.tsx`:

```tsx
import Link from "next/link";
import { SERVICES } from "@/content/hizmetler";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";

export const metadata = buildMetadata({
  title: "Hizmetler | Lüleburgaz Diyetisyen Beyza Şule Kahraman",
  description:
    "Kilo verme, kilo alma, sporcu beslenmesi, hastalıklara özel beslenme, gebelik ve emzirme dönemi danışmanlığı. Lüleburgaz'da yüz yüze görüşme.",
  path: "/hizmetler",
});

export default function HizmetlerPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Ana Sayfa", path: "/" },
          { name: "Hizmetler", path: "/hizmetler" },
        ])}
      />
      <main className="max-w-5xl mx-auto px-4 py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          Hizmetler
        </h1>
        <p className="mt-3 text-gray-600 max-w-2xl">
          Her danışman süreci kişiye özel planlanıyor. Aşağıdaki başlıklardan
          size uygun olanı seçip ayrıntıları okuyabilirsiniz.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
          {SERVICES.map((s) => (
            <Link
              key={s.slug}
              href={`/hizmetler/${s.slug}`}
              className="group block rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-emerald-300 hover:bg-emerald-50/30"
            >
              <span className="text-3xl" aria-hidden="true">
                {s.emoji}
              </span>
              <h2 className="mt-3 font-semibold text-gray-900 group-hover:text-emerald-700">
                {s.title}
              </h2>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                {s.cardDescription}
              </p>
              <span className="mt-4 inline-block text-sm font-medium text-emerald-600">
                Ayrıntılar →
              </span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
```

**Dikkat:** `breadcrumbSchema`'nın gerçek imzasını `lib/seo.ts`'ten kontrol et; `{ name, path }` dizisi almıyorsa çağrıyı mevcut imzaya uydur.

- [ ] **Step 3: Detay sayfasını oluştur**

`frontend/src/app/hizmetler/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { SERVICES, getService } from "@/content/hizmetler";
import {
  buildMetadata,
  breadcrumbSchema,
  faqPageSchema,
  serviceSchema,
  SITE,
} from "@/lib/seo";
import JsonLd from "@/components/JsonLd";

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const service = getService(params.slug);
  if (!service) return {};
  return buildMetadata({
    title: service.metaTitle,
    description: service.metaDescription,
    path: `/hizmetler/${service.slug}`,
  });
}

export default function HizmetPage({ params }: { params: { slug: string } }) {
  const service = getService(params.slug);
  if (!service) notFound();

  const related = service.related
    .map((slug) => getService(slug))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  return (
    <>
      <JsonLd
        data={serviceSchema({
          name: service.title,
          description: service.metaDescription,
          url: `/hizmetler/${service.slug}`,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Ana Sayfa", path: "/" },
          { name: "Hizmetler", path: "/hizmetler" },
          { name: service.title, path: `/hizmetler/${service.slug}` },
        ])}
      />
      <JsonLd data={faqPageSchema(service.faqs)} />

      <main className="max-w-3xl mx-auto px-4 py-16">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-emerald-600">
            Ana Sayfa
          </Link>
          {" › "}
          <Link href="/hizmetler" className="hover:text-emerald-600">
            Hizmetler
          </Link>
          {" › "}
          <span className="text-gray-700">{service.title}</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          {service.h1}
        </h1>

        <div className="mt-6 space-y-4 text-gray-700 leading-relaxed">
          {service.intro.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <h2 className="mt-12 text-2xl font-semibold text-gray-900">
          Kimler için uygun?
        </h2>
        <ul className="mt-4 space-y-2">
          {service.audience.map((item, i) => (
            <li key={i} className="flex gap-3 text-gray-700">
              <span className="text-emerald-600 shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {service.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="mt-12 text-2xl font-semibold text-gray-900">
              {section.heading}
            </h2>
            {section.paragraphs?.map((p, i) => (
              <p key={i} className="mt-4 text-gray-700 leading-relaxed">
                {p}
              </p>
            ))}
            {section.bullets && (
              <ul className="mt-4 space-y-2">
                {section.bullets.map((b, i) => (
                  <li key={i} className="flex gap-3 text-gray-700">
                    <span className="text-emerald-600 shrink-0">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {section.steps && (
              <ol className="mt-6 space-y-6">
                {section.steps.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {step.heading}
                      </h3>
                      <p className="mt-1 text-gray-700 leading-relaxed">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}

        <h2 className="mt-12 text-2xl font-semibold text-gray-900">
          Sık sorulan sorular
        </h2>
        <div className="mt-4 divide-y divide-gray-200">
          {service.faqs.map((faq) => (
            <details key={faq.question} className="group py-4">
              <summary className="font-medium text-gray-900 cursor-pointer list-none flex justify-between gap-4">
                {faq.question}
                <span className="text-emerald-600 group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>
              <p className="mt-3 text-gray-700 leading-relaxed">{faq.answer}</p>
            </details>
          ))}
        </div>

        {related.length > 0 && (
          <>
            <h2 className="mt-12 text-2xl font-semibold text-gray-900">
              İlgili hizmetler
            </h2>
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/hizmetler/${r.slug}`}
                  className="rounded-2xl border border-gray-200 p-4 hover:border-emerald-300 hover:bg-emerald-50/30"
                >
                  <span className="text-2xl" aria-hidden="true">
                    {r.emoji}
                  </span>
                  <p className="mt-2 font-medium text-gray-900">{r.title}</p>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="mt-12 rounded-2xl bg-emerald-50 border border-emerald-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">Randevu</h2>
          <p className="mt-2 text-gray-700">
            Lüleburgaz'da yüz yüze görüşmek için randevu oluşturabilir ya da
            doğrudan arayabilirsiniz.
          </p>
          <p className="mt-4 font-semibold text-gray-900">{SITE.name}</p>
          <p className="text-gray-700">{SITE.address}</p>
          <a
            href={`tel:${SITE.phone.replace(/\s/g, "")}`}
            className="mt-1 inline-block text-emerald-700 font-medium hover:underline"
          >
            {SITE.phone}
          </a>
        </div>

        <p className="mt-8 text-sm text-gray-500 border-l-2 border-gray-200 pl-4">
          Bu sayfadaki bilgiler genel bilgilendirme amaçlıdır ve kişiye özel bir
          beslenme danışmanlığının yerine geçmez.
        </p>
      </main>
    </>
  );
}
```

**Dikkat:** `SITE` sabitinin gerçek alan adlarını (`name`, `address`, `phone`) `lib/seo.ts`'ten doğrula; farklıysa uyarlayın. `faqPageSchema`'nın beklediği şekil `{ question, answer }[]` değilse çağrıyı uyarla.

- [ ] **Step 4: Sitemap'e ekle**

`frontend/src/app/sitemap.xml/route.ts` — statik URL listesine `/hizmetler` ve her hizmetin URL'sini ekle:

```ts
import { SERVICES } from "@/content/hizmetler";

// … statik url dizisine:
  "/hizmetler",
  ...SERVICES.map((s) => `/hizmetler/${s.slug}`),
```

Mevcut dosyanın URL üretim biçimine uydur (`changefreq`/`priority` alanları varsa aynı desende ekle).

- [ ] **Step 5: `Services.tsx` kartlarını bağla**

Her hizmet kartına `/hizmetler/<slug>` bağlantısı ekle. `services` dizisine `slug` alanı ekle (`content/hizmetler`'deki slug'larla birebir aynı) ve kart gövdesini `<Link>` ile sar. Kaydırmalı carousel davranışı bozulmasın — link kartın içindeki başlık ve "Ayrıntılar" bağlantısına verilmeli, sürükleme alanına değil.

**Alternatif ve tercih edilen:** `Services.tsx`'teki `services` dizisini tamamen kaldır, `SERVICES`'ten türet:

```tsx
import { SERVICES } from "@/content/hizmetler";

const services = SERVICES.map((s) => ({
  emoji: s.emoji,
  title: s.title,
  desc: s.cardDescription,
  href: `/hizmetler/${s.slug}`,
}));
```

Böylece hizmet listesi tek kaynaktan yönetilir.

- [ ] **Step 6: Derle**

Run: `npm --prefix frontend run build`
Expected: Hatasız; build çıktısında `/hizmetler/[slug]` için 7 statik sayfa üretildiği görünür.

- [ ] **Step 7: Yapısal veriyi doğrula**

Panel/site ayaktayken `http://localhost/hizmetler/kilo-verme-danismanligi` sayfa kaynağında üç `application/ld+json` bloğu olmalı: Service, BreadcrumbList, FAQPage. İçeriklerini [Rich Results Test](https://search.google.com/test/rich-results)'e yapıştırıp hatasız olduğunu doğrula.

`curl http://localhost/sitemap.xml | grep hizmetler` → 8 satır (liste + 7 detay).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/hizmetler frontend/src/lib/seo.ts frontend/src/app/sitemap.xml frontend/src/components/Services.tsx
git commit -m "feat: hizmet sayfaları, Service/FAQPage yapısal verisi ve sitemap kaydı"
```

---

## Faz 5 — Tasarım ve kullanılabilirlik

> **REQUIRED SUB-SKILL:** Bu fazı uygularken `frontend-design:frontend-design` skill'ini yükle. Amaç şablon görünümünden kaçınmak ve panelin kendi görsel dilini tutarlı kılmak.

### Task 14: Ortak sayfa başlığı ve iskelet yükleme

**Files:**
- Create: `frontend/src/components/admin/ui/PageHeader.tsx`
- Create: `frontend/src/components/admin/ui/Skeleton.tsx`
- Modify: `frontend/src/components/admin/ui/index.ts`
- Modify: Tüm panel sayfaları

**Interfaces:**
- Produces:
  - `<PageHeader title, subtitle?, action? />`
  - `<Skeleton className? />`, `<SkeletonRows count />`, `<SkeletonTiles count />`

- [ ] **Step 1: `PageHeader.tsx`'i yaz**

Şu an her sayfa kendi başlık düzenini kuruyor: `Bugün` başlık + alt metin (`page.tsx:50-51`), `Takvim` başlık + sağda düğme (`takvim/page.tsx:119-122`), `Finans` yalnız başlık (`finans/page.tsx:101`). Tek bileşende topla:

```tsx
export default function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 2: `Skeleton.tsx`'i yaz**

`"Yükleniyor…"` düz metni yerine düzeni koruyan iskelet. Sayfa yüklenirken içeriğin zıplamasını önler:

```tsx
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200/70 ${className}`}
      aria-hidden="true"
    />
  );
}

/** Liste/tablo satırları için. */
export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-gray-100" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="h-4 w-12 shrink-0" />
          <Skeleton className="h-4 flex-1 max-w-48" />
          <Skeleton className="h-6 w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** StatTile ızgarası için. */
export function SkeletonTiles({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-24" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: `ui/index.ts`'ten dışa aktar**

```ts
export { default as PageHeader } from "./PageHeader";
export { Skeleton, SkeletonRows, SkeletonTiles } from "./Skeleton";
```

- [ ] **Step 4: Sayfaları geçir**

Her panel sayfasında:
- `<h1>` bloğunu `<PageHeader …>` ile değiştir
- `{loading ? <p className="text-gray-400">Yükleniyor…</p> : …}` kalıplarını uygun iskeletle değiştir

Sayfalar: `page.tsx` (Bugün), `takvim/page.tsx`, `hastalar/page.tsx`, `hastalar/[id]/page.tsx`, `finans/page.tsx`, `istatistik/page.tsx`, `talepler/page.tsx`, `blog/page.tsx`, `sss/page.tsx`.

`Bugün` örneği:

```tsx
      <PageHeader title="Bugün" subtitle={todayLabel} />

      {loading ? (
        <div className="mb-8">
          <SkeletonTiles count={4} />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* mevcut StatTile'lar — artık loading kontrolü yok */}
        </div>
      )}
```

`Takvim` örneği:

```tsx
      <PageHeader
        title="Takvim"
        action={<Button onClick={() => openNew()}>+ Yeni Randevu</Button>}
      />
```

- [ ] **Step 5: Derle ve gözle doğrula**

Run: `npm --prefix frontend run build`

Panelde her sayfayı aç: başlıklar aynı hizada, yükleme sırasında düzen zıplamıyor.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/admin/ui frontend/src/app/admin
git commit -m "refactor: ortak sayfa başlığı ve iskelet yükleme durumları"
```

---

### Task 15: Kayıt geri bildirimi (toast)

**Files:**
- Create: `frontend/src/components/admin/ui/Toast.tsx`
- Modify: `frontend/src/components/admin/ui/index.ts`
- Modify: `frontend/src/app/admin/(panel)/layout.tsx`
- Modify: Kaydetme yapan bileşenler

**Interfaces:**
- Produces:
  - `<ToastProvider>` — `ConfirmProvider` ile aynı desende (bkz. `ui/ConfirmDialog.tsx:21`)
  - `useToast()` → `{ success(msg: string): void; error(msg: string): void }`

- [ ] **Step 1: `Toast.tsx`'i yaz**

`ConfirmDialog.tsx`'teki context desenini birebir izle — aynı projede iki farklı desen olmasın:

```tsx
"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastTone = "success" | "error";
type ToastItem = { id: number; tone: ToastTone; message: string };

const ToastContext = createContext<{
  success: (m: string) => void;
  error: (m: string) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, tone, message }]);
    // Hata mesajları daha uzun kalsın; kullanıcı okuyup karar verecek.
    const ttl = tone === "error" ? 6000 : 3000;
    window.setTimeout(
      () => setItems((prev) => prev.filter((t) => t.id !== id)),
      ttl,
    );
  }, []);

  const api = {
    success: useCallback((m: string) => push("success", m), [push]),
    error: useCallback((m: string) => push("error", m), [push]),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 pointer-events-none"
        role="status"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium shadow-lg border ${
              t.tone === "success"
                ? "bg-emerald-600 border-emerald-700 text-white"
                : "bg-red-600 border-red-700 text-white"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast, ToastProvider içinde kullanılmalı.");
  return ctx;
}
```

**Not:** `bottom-20` mobilde `MobileTabBar`'ın üstünde kalması için.

- [ ] **Step 2: Layout'a ekle**

`frontend/src/app/admin/(panel)/layout.tsx` — `ConfirmProvider` neredeyse onun içine/yanına `ToastProvider` ekle.

- [ ] **Step 3: Kaydetme noktalarını bağla**

Şu bileşenlerde başarılı kayıttan sonra `toast.success(...)`, hata durumunda `toast.error(...)`:

| Bileşen | Başarı mesajı |
|---|---|
| `BookingActionSheet.tsx` | `"Randevu işlendi."` |
| `BookingForm.tsx` | `"Randevu kaydedildi."` / seri için `"N randevu oluşturuldu."` |
| `AddPaymentModal.tsx` | `"Tahsilat kaydedildi."` |
| `SellPackageModal.tsx` | `"Paket satıldı."` |
| `finans/ExpensesTab.tsx` | `"Gider kaydedildi."` |
| `blog/[id]/page.tsx` | `"Yazı kaydedildi."` |
| `sss/page.tsx` | `"Soru kaydedildi."` |
| `hastalar/[id]/page.tsx` (notlar) | Mevcut `"Kaydedildi ✓"` satır içi göstergesi korunsun — otomatik kaydediyor, toast gürültü yaratır |

- [ ] **Step 4: Derle ve doğrula**

Run: `npm --prefix frontend run build`

Panelde bir randevu işle → sağ altta yeşil bildirim; ağı kesip tekrar dene → kırmızı bildirim.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/admin frontend/src/app/admin
git commit -m "feat: panelde kayıt geri bildirimi"
```

---

### Task 16: Tablo, modal ve navigasyon cilası

**Files:**
- Modify: `frontend/src/components/admin/ui/DataTable.tsx`
- Modify: `frontend/src/components/admin/ui/Modal.tsx`
- Modify: `frontend/src/components/admin/AdminNav.tsx`
- Modify: `frontend/src/components/admin/MobileTabBar.tsx`

- [ ] **Step 1: `DataTable`'a yapışkan başlık ve satır vurgusu**

Uzun listelerde başlık satırı kaydırılınca kaybolmasın:

```tsx
  <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
```

Satırlara `hover:bg-gray-50/70 transition-colors` ekle. Sayısal sütunlarda (`align: "right"`) `tabular-nums` zorunlu olsun — hücre sınıfına ekle.

- [ ] **Step 2: `Modal`'a ESC ve odak yönetimi**

Mevcut `Modal.tsx`'i oku. Eksikse ekle:

```tsx
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Modal açıkken arka plan kaymasın.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
```

Ayrıca `role="dialog"` ve `aria-modal="true"` ekle; başlığa `id` verip `aria-labelledby` ile bağla.

- [ ] **Step 3: Navigasyonda aktif durum ve rozet**

`AdminNav.tsx`'te aktif bağlantı şu an yalnızca renkle ayrışıyorsa, solunda 2px'lik `bg-brand-500` şerit ekle — göz tarama hızını artırır.

`MobileTabBar.tsx` şu an `mobile: true` işaretli 4 öğeyi gösteriyor (`Bugün`, `Takvim`, `Danışanlar`, `Finans`). `Talepler` bekleyen talep varken mobilde de erişilebilir olmalı; `useBadges.ts` zaten sayıyı çekiyor. Alt çubuğa beşinci öğe eklemek yerine `Bugün` ekranındaki "Bekleyen randevu talebi" satırı zaten bağlantı — bu yeterli, değişiklik yapma.

Rozet: `AdminNav`'da `Talepler` ve varsa diğer sayaçlı öğelerde `useBadges` sayısını küçük bir daire içinde göster.

- [ ] **Step 4: Derle ve doğrula**

Run: `npm --prefix frontend run build`

- Uzun bir tabloda (Finans → Gelirler) kaydırınca başlık sabit kalıyor
- Modal ESC ile kapanıyor, açıkken arka plan kaymıyor
- Bekleyen talep varsa yan menüde sayı görünüyor

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/admin
git commit -m "feat: tablo, modal ve navigasyon kullanılabilirlik iyileştirmeleri"
```

---

### Task 17: Uçtan uca doğrulama

Bu task kod yazmaz — Spec 1'den beri **hiç yapılmamış** olan canlı doğrulamayı kapatır.

- [ ] **Step 1: Temiz kurulum**

```bash
docker compose down -v
docker compose up -d --build
docker compose exec backend node src/scripts/seed-admin.js
docker compose exec backend node src/scripts/seed-demo.js
```

- [ ] **Step 2: Backend testlerini son bir kez koş**

Run: `npm --prefix backend test`
Expected: Tüm süitler yeşil. Sayıyı not al (Spec 1 sonunda 12 süit / 65 testti; bu planla 4 yeni süit eklendi).

- [ ] **Step 3: Randevu → para akışını doğrula**

1. `/admin/takvim` — haftalık görünüm, bugün seçili açılıyor
2. Yeni randevu, tekrar "4 hafta" → 4 hafta üst üste randevu görünüyor
3. Aynı saate ikinci randevu → sarı çakışma uyarısı
4. Randevuyu işle, ücret gir, "Tahsil edildi" → `/admin/finans` Gelirler'de görünüyor
5. Randevuyu sil → tahsilat da gitti, Gelirler'de yok
6. Ücret gir, "Sonra" → `/admin/finans` Alacaklar sekmesinde danışan listeleniyor, tutar doğru
7. "Bugün" ekranındaki "Bekleyen Alacak" ile Alacaklar sekmesindeki toplam aynı

- [ ] **Step 4: Paket akışını doğrula**

1. Paket sat → Gelirler'de satış tutarı görünüyor
2. Taksit gir → kalan borç azalıyor
3. Paketten düşen randevu işle → Gelirler'e ikinci kez yazılmıyor

- [ ] **Step 5: Dışa aktarmayı doğrula**

Gelirler → "Dışa aktar" → indirilen CSV'yi Excel'de aç. Türkçe karakterler doğru, sütunlar ayrı hücrelerde.

- [ ] **Step 6: SEO çıktısını doğrula**

```bash
curl -s http://localhost/sitemap.xml | grep -c "<url>"
curl -s http://localhost/hizmetler/kilo-verme-danismanligi | grep -c "application/ld+json"
```

Expected: sitemap'te hizmet sayfaları var; hizmet sayfasında 3 JSON-LD bloğu.

- [ ] **Step 7: Mobil doğrulama**

Tarayıcıyı 390px genişliğe al:
- Alt sekme çubuğu görünüyor, aktif sekme belli
- Takvim gün şeridi kaydırılabiliyor
- İşle modalı alt sayfa (bottom sheet) olarak açılıyor ve ESC/dışarı tıklama ile kapanıyor
- Toast bildirimi alt çubuğun üstünde çıkıyor

- [ ] **Step 8: Bulguları yaz**

Doğrulamada çıkan her sorun için `docs/superpowers/plans/` altına not düş veya doğrudan düzelt. Doğrulama geçmeden bu plan "tamam" sayılmaz.

---

## Yayın Öncesi Kontrol Listesi

- [ ] `grep -rn "ONAY" frontend/src/` → sonuç yok
- [ ] `npm --prefix backend test` → tüm süitler yeşil
- [ ] `npm --prefix frontend run build` → hatasız
- [ ] Task 17'deki 7 doğrulama adımı geçti
- [ ] `git log --oneline origin/main..main` ile push edilmemiş commit listesi gözden geçirildi
- [ ] Google Search Console'a `sitemap.xml` yeniden gönderildi (hizmet sayfaları için)
- [ ] `CLAUDE.md`'deki "nginx" ifadesi "caddy" olarak düzeltildi (`docker-compose.yml` caddy kullanıyor)

---

## Bilinen Açık Noktalar

1. **Hizmet metinleri diyetisyen onayı bekliyor.** 41 `[ONAY]` işareti var. Faz 4 kodu onaysız metinle de derlenir ama **yayına alınmamalı**.
2. **05 numaralı hizmetin (Arınma) çerçevesi karara bağlanmadı.** "Detoks" iddiası mevzuat riski taşıyor; taslakta "Beslenme Düzenleme" olarak yeniden adlandırma önerisi var. Karar `Services.tsx` ve `content/hizmetler` slug'ını etkiler.
3. **04 numaralı hizmet (Hastalıklara Özel) 693 kelime** — diğerlerinden kısa, genişletilebilir.
4. **`main` origin'e push edilmedi.** Spec 1'den beri biriken commit'ler + bu plan.
