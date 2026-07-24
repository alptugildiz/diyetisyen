# Danışan/Randevu Veri Zenginleştirme + İstatistik Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add kaynak/süreç durumu to `Patient`, ziyaret tipi/iptal nedeni to `Booking`, and extend `GET /api/admin/stats` + the İstatistik page with four new dashboard sections (aylık özet, devamlılık, kaynak dağılımı, iptal/gelmeme analizi) — all using neutral, non-judgmental language.

**Architecture:** Two new enum-valued fields per existing Mongoose model (`Patient.source`/`processStatus`, `Booking.visitType`/`cancelReason`), server-computed `visitType` (never client input), extended `stats.js` aggregations reusing the existing `from`/`to` date-match pattern, and additive UI sections in the existing İstatistik page reusing its current KPI-tile/chart components.

**Tech Stack:** Express 4 + Mongoose 8 + Zod (backend), Next.js 16 + React 19 + recharts (frontend), Jest + Supertest + mongodb-memory-server (new backend test infra — none existed before this plan).

## Global Constraints

- Kaynak enum: `instagram`, `google`, `dis_hekimi`, `danisan_tavsiyesi`, `web_sitesi`, `klinik_ici`, `diger` (source spec §"Veri Modeli Değişiklikleri").
- Süreç durumu enum: `aktif` (default), `tamamladi`, `birakti`.
- Ziyaret tipi enum: `ilk_gorusme`, `kontrol` — always server-computed from `Booking.countDocuments({patient})`, never accepted from the client.
- İptal nedeni enum: `tarih_uygun_degil`, `ucret`, `unuttu`, `saglik_problemi`, `iletisim_kurulamadi`, `baska_hizmet`, `belirtilmedi` — required exactly when `status` is `iptal` or `gelmedi`, cleared otherwise.
- Tone: no red/alarm color and no evaluative wording ("başarı", "performans puanı") on iptal/gelmeme/devamlılık UI — factual direction arrows only, per spec §"Ton ve Dil Prensipleri".
- No automated frontend tests (none exist in the project; user confirmed out of scope for this plan). Backend gets Jest+Supertest since the new logic is business-rule-bearing.
- Follow existing code style exactly: CommonJS in backend, Zod validation with the existing error-shape (`{message, errors}`), Tailwind utility classes matching existing components, Turkish UI copy.

---

## File Structure

**Backend — modify:**
- `backend/src/models/Patient.js` — add `source`, `processStatus`.
- `backend/src/models/Booking.js` — add `visitType`, `cancelReason`.
- `backend/src/routes/admin/patients.js` — accept `source`/`processStatus` in Zod schema.
- `backend/src/routes/admin/bookings.js` — compute `visitType` server-side, conditionally require `cancelReason`.
- `backend/src/routes/admin/stats.js` — add `monthlySummary`, `retention`, `sourceBreakdown`, `cancelReasonBreakdown` to the response.
- `backend/src/app.js` — skip rate limiting when `NODE_ENV=test`.
- `backend/package.json` — add `jest`, `supertest`, `mongodb-memory-server` devDeps + `test` script.

**Backend — create:**
- `backend/jest.config.js`
- `backend/tests/jestSetup.js` — env vars for the test process.
- `backend/tests/testDb.js` — mongodb-memory-server connect/clear/close helpers.
- `backend/tests/authHelper.js` — signs a test JWT.
- `backend/tests/health.test.js`
- `backend/tests/patients.test.js`
- `backend/tests/bookings.test.js`
- `backend/tests/backfillVisitType.test.js`
- `backend/tests/stats.test.js`
- `backend/src/scripts/backfill-visit-type.js` — one-off migration for existing `Booking` rows.

**Frontend — modify:**
- `frontend/src/types/index.ts` — extend `Patient`, `Booking`, `StatsResponse`; add new union types.
- `frontend/src/lib/api.ts` — add `cancelReason` to the booking payload types.
- `frontend/src/components/admin/BookingForm.tsx` — conditional `cancelReason` field, read-only `visitType` badge.
- `frontend/src/app/admin/(panel)/hastalar/page.tsx` — `source` dropdown on create.
- `frontend/src/app/admin/(panel)/hastalar/[id]/page.tsx` — `processStatus` dropdown, `visitType`/`cancelReason` badges in booking history.
- `frontend/src/app/admin/(panel)/istatistik/page.tsx` — neutral `DeltaChip` variant + four new sections.

**Frontend — create:**
- `frontend/src/lib/patientSource.ts`
- `frontend/src/lib/patientProcessStatus.ts`
- `frontend/src/lib/bookingVisitType.ts`
- `frontend/src/lib/bookingCancelReason.ts`

---

## Task 1: Backend test infrastructure

**Files:**
- Create: `backend/jest.config.js`, `backend/tests/jestSetup.js`, `backend/tests/testDb.js`, `backend/tests/health.test.js`
- Modify: `backend/package.json`, `backend/src/app.js:30-37`

**Interfaces:**
- Produces: `tests/testDb.js` exports `connect()`, `clearDatabase()`, `closeDatabase()` (all `async`, no args) — every later test file uses these three.
- Produces: `tests/jestSetup.js` sets `process.env.JWT_SECRET = "test-secret"` and `process.env.NODE_ENV = "test"` before any test file loads `src/app.js`.

- [ ] **Step 1: Add test tooling to `backend/package.json`**

Modify the `scripts` and `devDependencies` blocks:

```json
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "build": "echo 'No build step required'",
    "test": "jest --runInBand"
  },
```

```json
  "devDependencies": {
    "jest": "^29.7.0",
    "mongodb-memory-server": "^10.1.2",
    "nodemon": "^3.1.4",
    "supertest": "^7.0.0"
  }
```

- [ ] **Step 2: Install the new dependencies**

Run: `cd backend && npm install`
Expected: `jest`, `supertest`, `mongodb-memory-server` appear under `backend/node_modules`, no errors. (First run downloads a local `mongod` binary — may take a minute.)

- [ ] **Step 3: Create `backend/jest.config.js`**

```js
module.exports = {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/tests/jestSetup.js"],
  testTimeout: 20000,
};
```

- [ ] **Step 4: Create `backend/tests/jestSetup.js`**

```js
process.env.JWT_SECRET = "test-secret";
process.env.NODE_ENV = "test";
```

- [ ] **Step 5: Create `backend/tests/testDb.js`**

```js
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongod;

async function connect() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

async function clearDatabase() {
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

async function closeDatabase() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
}

module.exports = { connect, clearDatabase, closeDatabase };
```

- [ ] **Step 6: Skip rate limiting under test — modify `backend/src/app.js:30-37`**

Current code:

```js
// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);
```

New code:

```js
// Rate limiting (disabled in tests — supertest runs far more than 100
// requests per suite against the same in-process app)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
});
app.use("/api", limiter);
```

- [ ] **Step 7: Write the sanity test — `backend/tests/health.test.js`**

```js
const request = require("supertest");
const app = require("../src/app");
const { connect, closeDatabase } = require("./testDb");

beforeAll(async () => {
  await connect();
});

afterAll(async () => {
  await closeDatabase();
});

describe("GET /api/health", () => {
  it("returns ok status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
```

- [ ] **Step 8: Run the test suite**

Run: `cd backend && npm test`
Expected: `1 passed, 1 total` (the health test). If `mongod` download fails, re-run — it's a one-time network fetch.

- [ ] **Step 9: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/jest.config.js backend/tests/jestSetup.js backend/tests/testDb.js backend/tests/health.test.js backend/src/app.js
git commit -m "test: add Jest + Supertest + mongodb-memory-server backend test infra"
```

---

## Task 2: Patient — kaynak & süreç durumu

**Files:**
- Modify: `backend/src/models/Patient.js`, `backend/src/routes/admin/patients.js`
- Test: `backend/tests/patients.test.js`

**Interfaces:**
- Consumes: `tests/testDb.js` (`connect`, `clearDatabase`, `closeDatabase`) from Task 1.
- Produces: `Patient` documents now carry `source: string | null` (one of the 7 enum values or `null`) and `processStatus: "aktif" | "tamamladi" | "birakti"` (default `"aktif"`) — Task 3 and Task 5 read `processStatus`/`source` off `Patient`.

- [ ] **Step 1: Create `backend/tests/authHelper.js`** (shared by every route test from here on)

```js
const jwt = require("jsonwebtoken");

function makeToken() {
  return jwt.sign({ id: "test-admin-id" }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
}

module.exports = { makeToken };
```

- [ ] **Step 2: Write the failing tests — `backend/tests/patients.test.js`**

```js
const request = require("supertest");
const app = require("../src/app");
const Patient = require("../src/models/Patient");
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

describe("POST /api/admin/patients", () => {
  it("stores source and defaults processStatus to aktif", async () => {
    const res = await request(app)
      .post("/api/admin/patients")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Ayşe",
        lastName: "Yılmaz",
        phone: "0(555)123 45 67",
        source: "instagram",
      });
    expect(res.status).toBe(201);
    expect(res.body.source).toBe("instagram");
    expect(res.body.processStatus).toBe("aktif");
  });

  it("rejects an invalid source value", async () => {
    const res = await request(app)
      .post("/api/admin/patients")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Ayşe",
        lastName: "Yılmaz",
        phone: "0(555)123 45 67",
        source: "unknown",
      });
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/admin/patients/:id", () => {
  it("updates processStatus", async () => {
    const patient = await Patient.create({
      firstName: "Ayşe",
      lastName: "Yılmaz",
      phone: "0(555)123 45 67",
    });
    const res = await request(app)
      .put(`/api/admin/patients/${patient._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ processStatus: "tamamladi" });
    expect(res.status).toBe(200);
    expect(res.body.processStatus).toBe("tamamladi");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && npm test -- patients.test.js`
Expected: FAIL — `source`/`processStatus` are stripped by the current Zod schema (not in the whitelist), so the first test's assertions on `res.body.source`/`processStatus` fail, and the invalid-source test gets `201` instead of `400`.

- [ ] **Step 4: Add the fields to `backend/src/models/Patient.js`**

Full new file:

```js
const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    source: {
      type: String,
      enum: [
        "instagram",
        "google",
        "dis_hekimi",
        "danisan_tavsiyesi",
        "web_sitesi",
        "klinik_ici",
        "diger",
      ],
      default: null,
    },
    processStatus: {
      type: String,
      enum: ["aktif", "tamamladi", "birakti"],
      default: "aktif",
    },
    note: { type: String, default: "", trim: true }, // genel/kalıcı not
  },
  { timestamps: true },
);

module.exports = mongoose.model("Patient", patientSchema);
```

- [ ] **Step 5: Update the Zod schema in `backend/src/routes/admin/patients.js:12-17`**

Current code:

```js
const patientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().regex(PHONE_RE, "Geçersiz telefon formatı"),
  note: z.string().optional(),
});
```

New code:

```js
const SOURCES = [
  "instagram",
  "google",
  "dis_hekimi",
  "danisan_tavsiyesi",
  "web_sitesi",
  "klinik_ici",
  "diger",
];
const PROCESS_STATUSES = ["aktif", "tamamladi", "birakti"];

const patientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().regex(PHONE_RE, "Geçersiz telefon formatı"),
  source: z.enum(SOURCES).optional().nullable(),
  processStatus: z.enum(PROCESS_STATUSES).optional(),
  note: z.string().optional(),
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && npm test -- patients.test.js`
Expected: `3 passed, 3 total`

- [ ] **Step 7: Commit**

```bash
git add backend/src/models/Patient.js backend/src/routes/admin/patients.js backend/tests/patients.test.js backend/tests/authHelper.js
git commit -m "feat: add patient source and processStatus fields"
```

---

## Task 3: Booking — ziyaret tipi & iptal nedeni

**Files:**
- Modify: `backend/src/models/Booking.js`, `backend/src/routes/admin/bookings.js`
- Test: `backend/tests/bookings.test.js`

**Interfaces:**
- Consumes: `tests/testDb.js`, `tests/authHelper.js` (Tasks 1–2).
- Produces: `Booking` documents carry `visitType: "ilk_gorusme" | "kontrol" | null` (server-computed on create, never updated after) and `cancelReason: string | null` (non-null iff `status` is `iptal`/`gelmedi`) — Task 4 (backfill) and Task 5 (stats) read both fields.

- [ ] **Step 1: Write the failing tests — `backend/tests/bookings.test.js`**

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

async function createPatient() {
  return Patient.create({
    firstName: "Ayşe",
    lastName: "Yılmaz",
    phone: "0(555)123 45 67",
  });
}

describe("POST /api/admin/bookings", () => {
  it("marks a patient's first booking as ilk_gorusme", async () => {
    const patient = await createPatient();
    const res = await request(app)
      .post("/api/admin/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        patient: patient._id.toString(),
        date: "2026-08-01",
        status: "planlandi",
      });
    expect(res.status).toBe(201);
    expect(res.body.visitType).toBe("ilk_gorusme");
  });

  it("marks a patient's second booking as kontrol", async () => {
    const patient = await createPatient();
    await Booking.create({
      patient: patient._id,
      date: new Date("2026-07-01"),
      visitType: "ilk_gorusme",
    });
    const res = await request(app)
      .post("/api/admin/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        patient: patient._id.toString(),
        date: "2026-08-01",
        status: "planlandi",
      });
    expect(res.status).toBe(201);
    expect(res.body.visitType).toBe("kontrol");
  });

  it("rejects status=iptal without a cancelReason", async () => {
    const patient = await createPatient();
    const res = await request(app)
      .post("/api/admin/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        patient: patient._id.toString(),
        date: "2026-08-01",
        status: "iptal",
      });
    expect(res.status).toBe(400);
  });

  it("accepts status=iptal with a cancelReason", async () => {
    const patient = await createPatient();
    const res = await request(app)
      .post("/api/admin/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        patient: patient._id.toString(),
        date: "2026-08-01",
        status: "iptal",
        cancelReason: "ucret",
      });
    expect(res.status).toBe(201);
    expect(res.body.cancelReason).toBe("ucret");
  });
});

describe("PUT /api/admin/bookings/:id", () => {
  it("requires a cancelReason when updating status to gelmedi", async () => {
    const patient = await createPatient();
    const booking = await Booking.create({
      patient: patient._id,
      date: new Date("2026-08-01"),
      status: "planlandi",
      visitType: "ilk_gorusme",
    });
    const res = await request(app)
      .put(`/api/admin/bookings/${booking._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "gelmedi" });
    expect(res.status).toBe(400);
  });

  it("clears cancelReason when status moves back to planlandi", async () => {
    const patient = await createPatient();
    const booking = await Booking.create({
      patient: patient._id,
      date: new Date("2026-08-01"),
      status: "iptal",
      cancelReason: "unuttu",
      visitType: "ilk_gorusme",
    });
    const res = await request(app)
      .put(`/api/admin/bookings/${booking._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "planlandi" });
    expect(res.status).toBe(200);
    expect(res.body.cancelReason).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npm test -- bookings.test.js`
Expected: FAIL on every case — `visitType` doesn't exist yet, `cancelReason` isn't validated or stored.

- [ ] **Step 3: Add the fields to `backend/src/models/Booking.js`**

Full new file:

```js
const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    date: { type: Date, required: true, index: true }, // randevu günü (UTC gece yarısı)
    time: { type: String, default: "" }, // "HH:MM"
    status: {
      type: String,
      enum: ["planlandi", "geldi", "gelmedi", "iptal"],
      default: "planlandi",
    },
    // Sunucu tarafında hesaplanır (bkz. routes/admin/bookings.js) — client
    // tarafından gönderilse bile Zod şeması tarafından yok sayılır.
    visitType: {
      type: String,
      enum: ["ilk_gorusme", "kontrol"],
      default: null,
    },
    // Sadece status "iptal" veya "gelmedi" olduğunda anlamlıdır.
    cancelReason: {
      type: String,
      enum: [
        "tarih_uygun_degil",
        "ucret",
        "unuttu",
        "saglik_problemi",
        "iletisim_kurulamadi",
        "baska_hizmet",
        "belirtilmedi",
      ],
      default: null,
    },
    note: { type: String, default: "", trim: true }, // randevuya özel not
  },
  { timestamps: true },
);

module.exports = mongoose.model("Booking", bookingSchema);
```

- [ ] **Step 4: Rewrite `backend/src/routes/admin/bookings.js`**

Full new file:

```js
const express = require("express");
const { z } = require("zod");
const Booking = require("../../models/Booking");
const { protect } = require("../../middleware/auth");

const router = express.Router();
router.use(protect);

const CANCEL_REASONS = [
  "tarih_uygun_degil",
  "ucret",
  "unuttu",
  "saglik_problemi",
  "iletisim_kurulamadi",
  "baska_hizmet",
  "belirtilmedi",
];

const bookingSchema = z.object({
  patient: z.string().min(1),
  date: z.string().min(1),
  time: z.string().optional(),
  status: z.enum(["planlandi", "geldi", "gelmedi", "iptal"]).optional(),
  cancelReason: z.enum(CANCEL_REASONS).optional().nullable(),
  note: z.string().optional(),
});

function needsCancelReason(status) {
  return status === "iptal" || status === "gelmedi";
}

// Build a { date: { $gte, $lte } } filter from ?from&to query params
function buildDateFilter(query) {
  const filter = {};
  if (query.from || query.to) {
    filter.date = {};
    if (query.from) filter.date.$gte = new Date(query.from);
    if (query.to) filter.date.$lte = new Date(query.to);
  }
  return filter;
}

// GET /api/admin/bookings?from=&to=
router.get("/", async (req, res) => {
  try {
    const filter = buildDateFilter(req.query);
    const bookings = await Booking.find(filter)
      .populate("patient", "firstName lastName phone")
      .sort({ date: 1, time: 1 });
    res.json(bookings);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/admin/bookings
router.post("/", async (req, res) => {
  try {
    const data = bookingSchema.parse(req.body);
    const status = data.status ?? "planlandi";

    if (needsCancelReason(status) && !data.cancelReason) {
      return res.status(400).json({
        message: "Validation error",
        errors: [
          {
            path: ["cancelReason"],
            message: "İptal veya gelmeme durumunda neden zorunludur.",
          },
        ],
      });
    }

    // Ziyaret tipi her zaman sunucuda hesaplanır: hastanın bu klinikteki
    // ilk kaydıysa "ilk_gorusme", aksi halde "kontrol".
    const priorCount = await Booking.countDocuments({ patient: data.patient });
    const visitType = priorCount === 0 ? "ilk_gorusme" : "kontrol";

    const created = await Booking.create({
      ...data,
      date: new Date(data.date),
      cancelReason: needsCancelReason(status) ? data.cancelReason : null,
      visitType,
    });
    const booking = await created.populate(
      "patient",
      "firstName lastName phone",
    );
    res.status(201).json(booking);
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    console.error("Booking POST error:", err);
    res.status(500).json({ message: "Server error", detail: err.message });
  }
});

// PUT /api/admin/bookings/:id
router.put("/:id", async (req, res) => {
  try {
    const data = bookingSchema.partial().parse(req.body);
    if (data.date) data.date = new Date(data.date);

    const existing = await Booking.findById(req.params.id);
    if (!existing)
      return res.status(404).json({ message: "Booking not found" });

    const resultingStatus = data.status ?? existing.status;
    const resultingReason =
      data.cancelReason !== undefined ? data.cancelReason : existing.cancelReason;

    if (needsCancelReason(resultingStatus) && !resultingReason) {
      return res.status(400).json({
        message: "Validation error",
        errors: [
          {
            path: ["cancelReason"],
            message: "İptal veya gelmeme durumunda neden zorunludur.",
          },
        ],
      });
    }
    // Durum artık iptal/gelmedi değilse eski nedeni temizle.
    if (!needsCancelReason(resultingStatus)) data.cancelReason = null;

    const booking = await Booking.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    }).populate("patient", "firstName lastName phone");
    res.json(booking);
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/admin/bookings/:id
router.delete("/:id", async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking)
      return res.status(404).json({ message: "Booking not found" });
    res.json({ message: "Booking deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npm test -- bookings.test.js`
Expected: `6 passed, 6 total`

- [ ] **Step 6: Commit**

```bash
git add backend/src/models/Booking.js backend/src/routes/admin/bookings.js backend/tests/bookings.test.js
git commit -m "feat: auto-compute booking visitType and require cancelReason on iptal/gelmedi"
```

---

## Task 4: Geriye dönük visitType backfill script

**Files:**
- Create: `backend/src/scripts/backfill-visit-type.js`
- Test: `backend/tests/backfillVisitType.test.js`

**Interfaces:**
- Consumes: `Booking` model (Task 3), `tests/testDb.js` (Task 1).
- Produces: `module.exports = backfillVisitType` — an `async () => Promise<number>` (returns count of updated bookings) that Task 11's manual run invokes against the live dev database.

- [ ] **Step 1: Write the failing test — `backend/tests/backfillVisitType.test.js`**

```js
const Patient = require("../src/models/Patient");
const Booking = require("../src/models/Booking");
const backfillVisitType = require("../src/scripts/backfill-visit-type");
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

it("assigns ilk_gorusme to the earliest booking and kontrol to the rest", async () => {
  const patient = await Patient.create({
    firstName: "Ayşe",
    lastName: "Yılmaz",
    phone: "0(555)123 45 67",
  });
  const second = await Booking.create({
    patient: patient._id,
    date: new Date("2026-02-01"),
  });
  const first = await Booking.create({
    patient: patient._id,
    date: new Date("2026-01-01"),
  });
  const third = await Booking.create({
    patient: patient._id,
    date: new Date("2026-03-01"),
  });

  const updated = await backfillVisitType();

  expect(updated).toBe(3);
  expect((await Booking.findById(first._id)).visitType).toBe("ilk_gorusme");
  expect((await Booking.findById(second._id)).visitType).toBe("kontrol");
  expect((await Booking.findById(third._id)).visitType).toBe("kontrol");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- backfillVisitType.test.js`
Expected: FAIL — `Cannot find module '../src/scripts/backfill-visit-type'`

- [ ] **Step 3: Create `backend/src/scripts/backfill-visit-type.js`**

```js
/**
 * One-off migration: assigns visitType to Booking rows created before this
 * field existed. Per patient, the earliest booking (by date) becomes
 * "ilk_gorusme"; every later one becomes "kontrol". Idempotent — re-running
 * is safe, already-correct rows are left untouched.
 *
 * Standalone run:
 *   node src/scripts/backfill-visit-type.js
 */
const mongoose = require("mongoose");
const Booking = require("../models/Booking");

async function backfillVisitType() {
  const patientIds = await Booking.distinct("patient", {});
  let updated = 0;

  for (const patientId of patientIds) {
    const bookings = await Booking.find({ patient: patientId }).sort({
      date: 1,
      createdAt: 1,
    });
    for (let i = 0; i < bookings.length; i++) {
      const visitType = i === 0 ? "ilk_gorusme" : "kontrol";
      if (bookings[i].visitType !== visitType) {
        await Booking.updateOne({ _id: bookings[i]._id }, { visitType });
        updated++;
      }
    }
  }

  return updated;
}

module.exports = backfillVisitType;

if (require.main === module) {
  require("dotenv").config();
  mongoose
    .connect(process.env.MONGO_URI)
    .then(async () => {
      const updated = await backfillVisitType();
      console.log(`visitType backfill complete: ${updated} booking(s) updated.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Backfill error:", err);
      process.exit(1);
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- backfillVisitType.test.js`
Expected: `1 passed, 1 total`

- [ ] **Step 5: Commit**

```bash
git add backend/src/scripts/backfill-visit-type.js backend/tests/backfillVisitType.test.js
git commit -m "feat: add visitType backfill script for pre-existing bookings"
```

---

## Task 5: Stats endpoint — yeni dashboard metrikleri

**Files:**
- Modify: `backend/src/routes/admin/stats.js`
- Test: `backend/tests/stats.test.js`

**Interfaces:**
- Consumes: `Patient.source`/`processStatus` (Task 2), `Booking.visitType`/`cancelReason` (Task 3).
- Produces: `GET /api/admin/stats` response gains `monthlySummary`, `retention`, `sourceBreakdown`, `cancelReasonBreakdown` — Task 9/10 (frontend) render these directly.

- [ ] **Step 1: Write the failing tests — `backend/tests/stats.test.js`**

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

describe("GET /api/admin/stats — monthlySummary", () => {
  it("counts bookings by status and visit type within range", async () => {
    const patient = await Patient.create({
      firstName: "A",
      lastName: "B",
      phone: "0(555)111 11 11",
    });
    await Booking.create([
      {
        patient: patient._id,
        date: new Date("2026-08-05"),
        status: "geldi",
        visitType: "ilk_gorusme",
      },
      {
        patient: patient._id,
        date: new Date("2026-08-10"),
        status: "geldi",
        visitType: "kontrol",
      },
      {
        patient: patient._id,
        date: new Date("2026-08-15"),
        status: "iptal",
        cancelReason: "ucret",
        visitType: "kontrol",
      },
      {
        patient: patient._id,
        date: new Date("2026-08-20"),
        status: "gelmedi",
        cancelReason: "unuttu",
        visitType: "kontrol",
      },
    ]);

    const res = await request(app)
      .get("/api/admin/stats?from=2026-08-01&to=2026-08-31")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.monthlySummary.totalBookings).toBe(4);
    expect(res.body.monthlySummary.completed).toBe(2);
    expect(res.body.monthlySummary.cancelled).toBe(1);
    expect(res.body.monthlySummary.noShow).toBe(1);
    expect(res.body.monthlySummary.newPatients).toBe(1);
    expect(res.body.monthlySummary.followUps).toBe(3);
  });
});

describe("GET /api/admin/stats — retention", () => {
  it("computes firstToSecondRate for the first-visit cohort", async () => {
    const withFollowUp = await Patient.create({
      firstName: "A",
      lastName: "B",
      phone: "0(555)111 11 11",
    });
    const withoutFollowUp = await Patient.create({
      firstName: "C",
      lastName: "D",
      phone: "0(555)222 22 22",
    });
    await Booking.create([
      {
        patient: withFollowUp._id,
        date: new Date("2026-08-01"),
        status: "geldi",
        visitType: "ilk_gorusme",
      },
      {
        patient: withFollowUp._id,
        date: new Date("2026-08-15"),
        status: "geldi",
        visitType: "kontrol",
      },
      {
        patient: withoutFollowUp._id,
        date: new Date("2026-08-02"),
        status: "geldi",
        visitType: "ilk_gorusme",
      },
    ]);

    const res = await request(app)
      .get("/api/admin/stats?from=2026-08-01&to=2026-08-31")
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.retention.firstToSecondRate).toBe(50);
  });
});

describe("GET /api/admin/stats — breakdowns", () => {
  it("groups new patients by source and cancellations by reason", async () => {
    const p1 = await Patient.create({
      firstName: "A",
      lastName: "B",
      phone: "0(555)111 11 11",
      source: "instagram",
    });
    const p2 = await Patient.create({
      firstName: "C",
      lastName: "D",
      phone: "0(555)222 22 22",
    });
    await Booking.create([
      {
        patient: p1._id,
        date: new Date("2026-08-01"),
        status: "geldi",
        visitType: "ilk_gorusme",
      },
      {
        patient: p2._id,
        date: new Date("2026-08-02"),
        status: "iptal",
        cancelReason: "ucret",
        visitType: "ilk_gorusme",
      },
    ]);

    const res = await request(app)
      .get("/api/admin/stats?from=2026-08-01&to=2026-08-31")
      .set("Authorization", `Bearer ${token}`);

    const instagram = res.body.sourceBreakdown.find(
      (s) => s.source === "instagram",
    );
    const unspecified = res.body.sourceBreakdown.find(
      (s) => s.source === "belirtilmemis",
    );
    expect(instagram.count).toBe(1);
    expect(unspecified.count).toBe(1);

    const ucret = res.body.cancelReasonBreakdown.find(
      (r) => r.reason === "ucret",
    );
    expect(ucret.count).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npm test -- stats.test.js`
Expected: FAIL — `res.body.monthlySummary`, `res.body.retention`, `res.body.sourceBreakdown`, `res.body.cancelReasonBreakdown` are all `undefined`.

- [ ] **Step 3: Rewrite `backend/src/routes/admin/stats.js`**

Full new file:

```js
const express = require("express");
const Appointment = require("../../models/Appointment");
const Booking = require("../../models/Booking");
const Patient = require("../../models/Patient");
const { protect } = require("../../middleware/auth");

const router = express.Router();
router.use(protect);

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const SOURCES = [
  "instagram",
  "google",
  "dis_hekimi",
  "danisan_tavsiyesi",
  "web_sitesi",
  "klinik_ici",
  "diger",
  "belirtilmemis",
];
const CANCEL_REASONS = [
  "tarih_uygun_degil",
  "ucret",
  "unuttu",
  "saglik_problemi",
  "iletisim_kurulamadi",
  "baska_hizmet",
  "belirtilmedi",
];
const PROCESS_STATUSES = ["aktif", "tamamladi", "birakti"];

// Build a { date: { $gte, $lte } } match from ?from&to query params
function buildMatch(query) {
  const match = {};
  if (query.from || query.to) {
    match.date = {};
    if (query.from) match.date.$gte = new Date(query.from);
    if (query.to) match.date.$lte = new Date(query.to);
  }
  return match;
}

function pct(cur, old) {
  return old > 0 ? Math.round(((cur - old) / old) * 100) : null;
}

async function summarize(match) {
  const res = await Appointment.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        revenue: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);
  return { revenue: res[0]?.revenue ?? 0, count: res[0]?.count ?? 0 };
}

async function summarizeBookings(match) {
  const res = await Booking.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ["$status", "geldi"] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ["$status", "iptal"] }, 1, 0] } },
        noShow: { $sum: { $cond: [{ $eq: ["$status", "gelmedi"] }, 1, 0] } },
        newPatients: {
          $sum: { $cond: [{ $eq: ["$visitType", "ilk_gorusme"] }, 1, 0] },
        },
        followUps: {
          $sum: { $cond: [{ $eq: ["$visitType", "kontrol"] }, 1, 0] },
        },
      },
    },
  ]);
  const r = res[0] ?? {};
  return {
    totalBookings: r.totalBookings ?? 0,
    completed: r.completed ?? 0,
    cancelled: r.cancelled ?? 0,
    noShow: r.noShow ?? 0,
    newPatients: r.newPatients ?? 0,
    followUps: r.followUps ?? 0,
  };
}

// Retention metrics for the cohort of patients whose first-ever visit
// (visitType=ilk_gorusme) falls inside the selected period.
async function retentionStats(match) {
  const firstVisits = await Booking.find({
    ...match,
    visitType: "ilk_gorusme",
  }).select("patient");
  const patientIds = firstVisits.map((b) => b.patient);

  if (patientIds.length === 0) {
    return {
      firstToSecondRate: null,
      avgFollowUpCount: 0,
      avgFollowUpSpanDays: 0,
      processStatusBreakdown: PROCESS_STATUSES.map((status) => ({
        status,
        count: 0,
      })),
    };
  }

  const perPatient = await Booking.aggregate([
    { $match: { patient: { $in: patientIds } } },
    {
      $group: {
        _id: "$patient",
        total: { $sum: 1 },
        completedCount: {
          $sum: { $cond: [{ $eq: ["$status", "geldi"] }, 1, 0] },
        },
        firstDate: { $min: "$date" },
        lastDate: { $max: "$date" },
      },
    },
  ]);

  const withSecondVisit = perPatient.filter((p) => p.total > 1).length;
  const firstToSecondRate = Math.round(
    (withSecondVisit / patientIds.length) * 100,
  );

  const avgFollowUpCount =
    Math.round(
      (perPatient.reduce((sum, p) => sum + p.completedCount, 0) /
        perPatient.length) *
        10,
    ) / 10;

  const spans = perPatient
    .filter((p) => p.total > 1)
    .map((p) => (p.lastDate - p.firstDate) / (1000 * 60 * 60 * 24));
  const avgFollowUpSpanDays = spans.length
    ? Math.round(spans.reduce((a, b) => a + b, 0) / spans.length)
    : 0;

  const processStatusRaw = await Patient.aggregate([
    { $match: { _id: { $in: patientIds } } },
    { $group: { _id: "$processStatus", count: { $sum: 1 } } },
  ]);
  const processStatusBreakdown = PROCESS_STATUSES.map((status) => ({
    status,
    count: processStatusRaw.find((r) => r._id === status)?.count ?? 0,
  }));

  return {
    firstToSecondRate,
    avgFollowUpCount,
    avgFollowUpSpanDays,
    processStatusBreakdown,
  };
}

// New-patient source mix for the same first-visit cohort as retentionStats.
async function sourceBreakdown(match) {
  const patientIds = await Booking.distinct("patient", {
    ...match,
    visitType: "ilk_gorusme",
  });
  const raw = await Patient.aggregate([
    { $match: { _id: { $in: patientIds } } },
    {
      $group: {
        _id: { $ifNull: ["$source", "belirtilmemis"] },
        count: { $sum: 1 },
      },
    },
  ]);
  return SOURCES.map((source) => ({
    source,
    count: raw.find((r) => r._id === source)?.count ?? 0,
  }));
}

async function cancelReasonBreakdown(match) {
  const raw = await Booking.aggregate([
    { $match: { ...match, status: { $in: ["iptal", "gelmedi"] } } },
    { $group: { _id: "$cancelReason", count: { $sum: 1 } } },
  ]);
  return CANCEL_REASONS.map((reason) => ({
    reason,
    count: raw.find((r) => r._id === reason)?.count ?? 0,
  }));
}

// GET /api/admin/stats?from=&to=
router.get("/", async (req, res) => {
  try {
    const match = buildMatch(req.query);
    const fromDate = match.date?.$gte ?? null;
    const toDate = match.date?.$lte ?? null;

    const [
      current,
      monthlyRaw,
      weekdayRaw,
      perPhone,
      topRaw,
      currentBookings,
      retention,
      sourceMix,
      cancelReasons,
    ] = await Promise.all([
      summarize(match),
      Appointment.aggregate([
        { $match: match },
        {
          $group: {
            _id: { y: { $year: "$date" }, m: { $month: "$date" } },
            revenue: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.y": 1, "_id.m": 1 } },
      ]),
      Appointment.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dayOfWeek: "$date" }, // 1=Sun … 7=Sat
            count: { $sum: 1 },
            revenue: { $sum: "$amount" },
          },
        },
      ]),
      Appointment.aggregate([
        { $match: match },
        { $group: { _id: "$phone", count: { $sum: 1 } } },
      ]),
      Appointment.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$phone",
            revenue: { $sum: "$amount" },
            visits: { $sum: 1 },
            firstName: { $last: "$firstName" },
            lastName: { $last: "$lastName" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 6 },
      ]),
      summarizeBookings(match),
      retentionStats(match),
      sourceBreakdown(match),
      cancelReasonBreakdown(match),
    ]);

    const totalRevenue = current.revenue;
    const totalAppointments = current.count;

    const returningPatients = perPhone.filter((p) => p.count > 1).length;
    const newPatients = perPhone.filter((p) => p.count === 1).length;
    const uniquePatients = perPhone.length;

    const avgPerAppointment = totalAppointments
      ? Math.round(totalRevenue / totalAppointments)
      : 0;
    const avgPerPatient = uniquePatients
      ? Math.round(totalRevenue / uniquePatients)
      : 0;

    let revenueChangePct = null;
    let appointmentsChangePct = null;
    let monthlySummary = {
      totalBookings: currentBookings.totalBookings,
      totalBookingsChangePct: null,
      completed: currentBookings.completed,
      completedChangePct: null,
      cancelled: currentBookings.cancelled,
      cancelledChangePct: null,
      noShow: currentBookings.noShow,
      noShowChangePct: null,
      newPatients: currentBookings.newPatients,
      newPatientsChangePct: null,
      followUps: currentBookings.followUps,
      followUpsChangePct: null,
      revenue: totalRevenue,
      revenueChangePct: null,
    };

    // Trend vs previous equal-length window (only when a range is set)
    if (fromDate && toDate) {
      const len = toDate.getTime() - fromDate.getTime();
      const prevMatch = {
        date: { $gte: new Date(fromDate.getTime() - len), $lt: fromDate },
      };
      const [prev, prevBookings] = await Promise.all([
        summarize(prevMatch),
        summarizeBookings(prevMatch),
      ]);
      revenueChangePct = pct(totalRevenue, prev.revenue);
      appointmentsChangePct = pct(totalAppointments, prev.count);
      monthlySummary = {
        totalBookings: currentBookings.totalBookings,
        totalBookingsChangePct: pct(
          currentBookings.totalBookings,
          prevBookings.totalBookings,
        ),
        completed: currentBookings.completed,
        completedChangePct: pct(
          currentBookings.completed,
          prevBookings.completed,
        ),
        cancelled: currentBookings.cancelled,
        cancelledChangePct: pct(
          currentBookings.cancelled,
          prevBookings.cancelled,
        ),
        noShow: currentBookings.noShow,
        noShowChangePct: pct(currentBookings.noShow, prevBookings.noShow),
        newPatients: currentBookings.newPatients,
        newPatientsChangePct: pct(
          currentBookings.newPatients,
          prevBookings.newPatients,
        ),
        followUps: currentBookings.followUps,
        followUpsChangePct: pct(
          currentBookings.followUps,
          prevBookings.followUps,
        ),
        revenue: totalRevenue,
        revenueChangePct,
      };
    }

    const monthly = monthlyRaw.map((m) => ({
      month: `${m._id.y}-${String(m._id.m).padStart(2, "0")}`,
      revenue: m.revenue,
      count: m.count,
    }));

    // Weekday distribution, Monday-first
    const weekday = WEEKDAYS.map((day, i) => {
      const dow = i === 6 ? 1 : i + 2; // Mon(idx0)→2 … Sat(idx5)→7, Sun(idx6)→1
      const row = weekdayRaw.find((w) => w._id === dow);
      return { day, count: row?.count ?? 0, revenue: row?.revenue ?? 0 };
    });

    const topPatients = topRaw.map((p) => ({
      name: `${p.firstName} ${p.lastName}`,
      phone: p._id,
      revenue: p.revenue,
      visits: p.visits,
    }));

    res.json({
      totalRevenue,
      totalAppointments,
      uniquePatients,
      avgPerAppointment,
      avgPerPatient,
      newPatients,
      returningPatients,
      revenueChangePct,
      appointmentsChangePct,
      monthly,
      weekday,
      topPatients,
      monthlySummary,
      retention,
      sourceBreakdown: sourceMix,
      cancelReasonBreakdown: cancelReasons,
    });
  } catch (err) {
    console.error("Stats GET error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npm test -- stats.test.js`
Expected: `3 passed, 3 total`

- [ ] **Step 5: Run the full backend suite**

Run: `cd backend && npm test`
Expected: all test files pass (health, patients, bookings, backfillVisitType, stats).

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/admin/stats.js backend/tests/stats.test.js
git commit -m "feat: add monthlySummary/retention/sourceBreakdown/cancelReasonBreakdown to stats endpoint"
```

---

## Task 6: Frontend types & constants

**Files:**
- Modify: `frontend/src/types/index.ts`, `frontend/src/lib/api.ts:288-319`
- Create: `frontend/src/lib/patientSource.ts`, `frontend/src/lib/patientProcessStatus.ts`, `frontend/src/lib/bookingVisitType.ts`, `frontend/src/lib/bookingCancelReason.ts`

**Interfaces:**
- Consumes: backend response shapes from Tasks 2, 3, 5 (field names/enum values must match exactly).
- Produces: `PatientSource`, `PatientProcessStatus`, `BookingVisitType`, `BookingCancelReason` types + `PATIENT_SOURCE`, `PATIENT_SOURCE_OPTIONS`, `PROCESS_STATUS`, `PROCESS_STATUS_OPTIONS`, `VISIT_TYPE`, `CANCEL_REASON`, `CANCEL_REASON_OPTIONS` constants — Tasks 7–10 import all of these.

- [ ] **Step 1: Extend `frontend/src/types/index.ts`**

Replace the `Patient` interface (current lines 48-56):

```ts
export type PatientSource =
  | "instagram"
  | "google"
  | "dis_hekimi"
  | "danisan_tavsiyesi"
  | "web_sitesi"
  | "klinik_ici"
  | "diger";

export type PatientSourceKey = PatientSource | "belirtilmemis";

export type PatientProcessStatus = "aktif" | "tamamladi" | "birakti";

export interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  source: PatientSource | null;
  processStatus: PatientProcessStatus;
  note: string;
  createdAt: string;
  updatedAt: string;
}
```

Replace the `Booking`-related block (current lines 58-69):

```ts
export type BookingStatus = "planlandi" | "geldi" | "gelmedi" | "iptal";
export type BookingVisitType = "ilk_gorusme" | "kontrol";
export type BookingCancelReason =
  | "tarih_uygun_degil"
  | "ucret"
  | "unuttu"
  | "saglik_problemi"
  | "iletisim_kurulamadi"
  | "baska_hizmet"
  | "belirtilmedi";

export interface Booking {
  _id: string;
  patient: Pick<Patient, "_id" | "firstName" | "lastName" | "phone">;
  date: string;
  time: string;
  status: BookingStatus;
  visitType: BookingVisitType | null;
  cancelReason: BookingCancelReason | null;
  note: string;
  createdAt: string;
  updatedAt: string;
}
```

Replace the `StatsResponse` interface (current lines 76-94):

```ts
export interface StatsResponse {
  totalRevenue: number;
  totalAppointments: number;
  uniquePatients: number;
  avgPerAppointment: number;
  avgPerPatient: number;
  newPatients: number;
  returningPatients: number;
  revenueChangePct: number | null;
  appointmentsChangePct: number | null;
  monthly: { month: string; revenue: number; count: number }[];
  weekday: { day: string; count: number; revenue: number }[];
  topPatients: {
    name: string;
    phone: string;
    revenue: number;
    visits: number;
  }[];
  monthlySummary: {
    totalBookings: number;
    totalBookingsChangePct: number | null;
    completed: number;
    completedChangePct: number | null;
    cancelled: number;
    cancelledChangePct: number | null;
    noShow: number;
    noShowChangePct: number | null;
    newPatients: number;
    newPatientsChangePct: number | null;
    followUps: number;
    followUpsChangePct: number | null;
    revenue: number;
    revenueChangePct: number | null;
  };
  retention: {
    firstToSecondRate: number | null;
    avgFollowUpCount: number;
    avgFollowUpSpanDays: number;
    processStatusBreakdown: {
      status: PatientProcessStatus;
      count: number;
    }[];
  };
  sourceBreakdown: { source: PatientSourceKey; count: number }[];
  cancelReasonBreakdown: {
    reason: BookingCancelReason;
    count: number;
  }[];
}
```

- [ ] **Step 2: Add `cancelReason` to the booking payload types in `frontend/src/lib/api.ts:288-319`**

Current code:

```ts
// data.patient = patientId (string)
export function adminCreateBooking(
  data: {
    patient: string;
    date: string;
    time?: string;
    status?: string;
    note?: string;
  },
  token: string,
) {
  return adminFetch<Booking>("/api/admin/bookings", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function adminUpdateBooking(
  id: string,
  data: {
    patient?: string;
    date?: string;
    time?: string;
    status?: string;
    note?: string;
  },
  token: string,
) {
  return adminFetch<Booking>(`/api/admin/bookings/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
```

New code:

```ts
// data.patient = patientId (string)
export function adminCreateBooking(
  data: {
    patient: string;
    date: string;
    time?: string;
    status?: string;
    cancelReason?: string | null;
    note?: string;
  },
  token: string,
) {
  return adminFetch<Booking>("/api/admin/bookings", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function adminUpdateBooking(
  id: string,
  data: {
    patient?: string;
    date?: string;
    time?: string;
    status?: string;
    cancelReason?: string | null;
    note?: string;
  },
  token: string,
) {
  return adminFetch<Booking>(`/api/admin/bookings/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
```

- [ ] **Step 3: Create `frontend/src/lib/patientSource.ts`**

```ts
import type { PatientSource, PatientSourceKey } from "@/types";

export const PATIENT_SOURCE: Record<PatientSourceKey, { label: string }> = {
  instagram: { label: "Instagram" },
  google: { label: "Google" },
  dis_hekimi: { label: "Diş Hekimi Yönlendirmesi" },
  danisan_tavsiyesi: { label: "Mevcut Danışan Tavsiyesi" },
  web_sitesi: { label: "Web Sitesi" },
  klinik_ici: { label: "Klinik İçi Yönlendirme" },
  diger: { label: "Diğer" },
  belirtilmemis: { label: "Belirtilmemiş" },
};

// Selectable in forms — "belirtilmemis" is a report-only bucket, not a
// choice the dietitian picks.
export const PATIENT_SOURCE_OPTIONS: PatientSource[] = [
  "instagram",
  "google",
  "dis_hekimi",
  "danisan_tavsiyesi",
  "web_sitesi",
  "klinik_ici",
  "diger",
];
```

- [ ] **Step 4: Create `frontend/src/lib/patientProcessStatus.ts`**

```ts
import type { PatientProcessStatus } from "@/types";

// Neutral badge colors on purpose — this reflects where a patient is in
// their process, not a performance judgment.
export const PROCESS_STATUS: Record<
  PatientProcessStatus,
  { label: string; badge: string }
> = {
  aktif: { label: "Aktif", badge: "bg-brand-50 text-brand-700" },
  tamamladi: {
    label: "Süreci Tamamladı",
    badge: "bg-emerald-50 text-emerald-700",
  },
  birakti: {
    label: "Ara Verdi / Bıraktı",
    badge: "bg-gray-100 text-gray-500",
  },
};

export const PROCESS_STATUS_OPTIONS: PatientProcessStatus[] = [
  "aktif",
  "tamamladi",
  "birakti",
];
```

- [ ] **Step 5: Create `frontend/src/lib/bookingVisitType.ts`**

```ts
import type { BookingVisitType } from "@/types";

export const VISIT_TYPE: Record<
  BookingVisitType,
  { label: string; badge: string }
> = {
  ilk_gorusme: { label: "İlk Görüşme", badge: "bg-indigo-50 text-indigo-700" },
  kontrol: { label: "Kontrol", badge: "bg-gray-100 text-gray-500" },
};
```

- [ ] **Step 6: Create `frontend/src/lib/bookingCancelReason.ts`**

```ts
import type { BookingCancelReason } from "@/types";

export const CANCEL_REASON: Record<BookingCancelReason, { label: string }> = {
  tarih_uygun_degil: { label: "Tarih/saat uygun değildi" },
  ucret: { label: "Ücret nedeniyle" },
  unuttu: { label: "Unuttu" },
  saglik_problemi: { label: "Sağlık problemi" },
  iletisim_kurulamadi: { label: "İletişim kurulamadı" },
  baska_hizmet: { label: "Başka bir hizmet tercih etti" },
  belirtilmedi: { label: "Belirtilmedi" },
};

export const CANCEL_REASON_OPTIONS: BookingCancelReason[] = [
  "tarih_uygun_degil",
  "ucret",
  "unuttu",
  "saglik_problemi",
  "iletisim_kurulamadi",
  "baska_hizmet",
  "belirtilmedi",
];
```

- [ ] **Step 7: Typecheck**

Run: `cd frontend && npx tsc -p . --noEmit`
Expected: no errors. (`StatTile`/chart usages elsewhere in `istatistik/page.tsx` still compile because Tasks 9–10 haven't touched that file yet — this step only proves the new types/constants themselves are well-formed and existing `Patient`/`Booking`/`StatsResponse` consumers still typecheck against the widened shapes.)

- [ ] **Step 8: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts frontend/src/lib/patientSource.ts frontend/src/lib/patientProcessStatus.ts frontend/src/lib/bookingVisitType.ts frontend/src/lib/bookingCancelReason.ts
git commit -m "feat: add frontend types and label constants for source/processStatus/visitType/cancelReason"
```

---

## Task 7: BookingForm — iptal nedeni & ziyaret tipi rozeti

**Files:**
- Modify: `frontend/src/components/admin/BookingForm.tsx`

**Interfaces:**
- Consumes: `CANCEL_REASON`, `CANCEL_REASON_OPTIONS` (`@/lib/bookingCancelReason`), `VISIT_TYPE` (`@/lib/bookingVisitType`), `BookingCancelReason` type — all from Task 6.

- [ ] **Step 1: Add imports — modify `frontend/src/components/admin/BookingForm.tsx:1-17`**

Current code:

```tsx
"use client";

import { useState } from "react";
import {
  adminCreateBooking,
  adminUpdateBooking,
  adminCreatePatient,
} from "@/lib/api";
import { STATUS, STATUS_OPTIONS } from "@/lib/bookingStatus";
import {
  DateInput,
  TimeInput,
  SelectInput,
} from "@/components/admin/DateTimeInput";
import PhoneInput from "@/components/admin/PhoneInput";
import { isValidPhone } from "@/lib/phone";
import type { Booking, BookingStatus, Patient } from "@/types";
```

New code:

```tsx
"use client";

import { useState } from "react";
import {
  adminCreateBooking,
  adminUpdateBooking,
  adminCreatePatient,
} from "@/lib/api";
import { STATUS, STATUS_OPTIONS } from "@/lib/bookingStatus";
import { CANCEL_REASON, CANCEL_REASON_OPTIONS } from "@/lib/bookingCancelReason";
import { VISIT_TYPE } from "@/lib/bookingVisitType";
import {
  DateInput,
  TimeInput,
  SelectInput,
} from "@/components/admin/DateTimeInput";
import PhoneInput from "@/components/admin/PhoneInput";
import { isValidPhone } from "@/lib/phone";
import type { Booking, BookingCancelReason, BookingStatus, Patient } from "@/types";
```

- [ ] **Step 2: Add `cancelReason` state and a status-needs-reason helper — modify `frontend/src/components/admin/BookingForm.tsx:54-57`**

Current code:

```tsx
  const [status, setStatus] = useState<BookingStatus>(
    initial?.status ?? "planlandi",
  );
  const [note, setNote] = useState(initial?.note ?? "");
```

New code:

```tsx
  const [status, setStatus] = useState<BookingStatus>(
    initial?.status ?? "planlandi",
  );
  const [cancelReason, setCancelReason] = useState<BookingCancelReason | "">(
    initial?.cancelReason ?? "",
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const needsCancelReason = status === "iptal" || status === "gelmedi";
```

- [ ] **Step 3: Include `cancelReason` in the save payload — modify `frontend/src/components/admin/BookingForm.tsx:97`**

Current code:

```tsx
      const payload = { patient: pid, date, time, status, note };
```

New code:

```tsx
      const payload = {
        patient: pid,
        date,
        time,
        status,
        cancelReason: needsCancelReason ? cancelReason || null : null,
        note,
      };
```

- [ ] **Step 4: Add the conditional dropdown and the read-only visit-type badge — modify `frontend/src/components/admin/BookingForm.tsx:190-201`**

Current code:

```tsx
      <div>
        <label className={labelCls}>Durum</label>
        <SelectInput
          value={status}
          onChange={(v) => setStatus(v as BookingStatus)}
          inputClassName={inputCls}
          options={STATUS_OPTIONS.map((s) => ({
            value: s,
            label: STATUS[s].label,
          }))}
        />
      </div>
```

New code:

```tsx
      <div>
        <label className={labelCls}>Durum</label>
        <SelectInput
          value={status}
          onChange={(v) => setStatus(v as BookingStatus)}
          inputClassName={inputCls}
          options={STATUS_OPTIONS.map((s) => ({
            value: s,
            label: STATUS[s].label,
          }))}
        />
      </div>

      {needsCancelReason && (
        <div>
          <label className={labelCls}>Neden</label>
          <SelectInput
            value={cancelReason}
            onChange={(v) => setCancelReason(v as BookingCancelReason)}
            inputClassName={inputCls}
            placeholder="Neden seçin"
            options={CANCEL_REASON_OPTIONS.map((r) => ({
              value: r,
              label: CANCEL_REASON[r].label,
            }))}
          />
        </div>
      )}

      {initial?.visitType && (
        <div>
          <span className={labelCls}>Ziyaret Tipi</span>
          <span
            className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${VISIT_TYPE[initial.visitType].badge}`}
          >
            {VISIT_TYPE[initial.visitType].label}
          </span>
        </div>
      )}
```

- [ ] **Step 5: Require a reason before saving — modify `frontend/src/components/admin/BookingForm.tsx:61-65`**

Current code:

```tsx
  const handleSave = async () => {
    if (!date) {
      setError("Tarih zorunludur.");
      return;
    }
```

New code:

```tsx
  const handleSave = async () => {
    if (!date) {
      setError("Tarih zorunludur.");
      return;
    }
    if (needsCancelReason && !cancelReason) {
      setError("İptal veya gelmeme durumunda neden seçmelisiniz.");
      return;
    }
```

- [ ] **Step 6: Typecheck**

Run: `cd frontend && npx tsc -p . --noEmit`
Expected: no errors.

- [ ] **Step 7: Manual verification**

Run: `cd frontend && npm run dev` (or use the already-running `diyet_frontend` Docker container on port 3001)
1. Navigate to `/admin/hastalar/<bir hasta id>` (giriş: `admin@diyet.com` / `Admin1234!`), open "Randevu Ekle".
2. Set "Durum" to "İptal" — confirm a "Neden" dropdown appears and is required (try saving without selecting one → error message shown).
3. Select a reason and save → booking is created.
4. Edit that same booking → confirm the "Neden" dropdown is pre-filled and a "Ziyaret Tipi" badge is visible.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/admin/BookingForm.tsx
git commit -m "feat: add conditional cancelReason field and read-only visitType badge to BookingForm"
```

---

## Task 8: Hastalar sayfaları — kaynak & süreç durumu

**Files:**
- Modify: `frontend/src/app/admin/(panel)/hastalar/page.tsx`, `frontend/src/app/admin/(panel)/hastalar/[id]/page.tsx`

**Interfaces:**
- Consumes: `PATIENT_SOURCE`, `PATIENT_SOURCE_OPTIONS` (`@/lib/patientSource`), `PROCESS_STATUS`, `PROCESS_STATUS_OPTIONS` (`@/lib/patientProcessStatus`), `VISIT_TYPE` (`@/lib/bookingVisitType`), `CANCEL_REASON` (`@/lib/bookingCancelReason`) — all from Task 6.

- [ ] **Step 1: Add `source` to the quick-create form — modify `frontend/src/app/admin/(panel)/hastalar/page.tsx:1-17`**

Current code:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  adminGetPatients,
  adminCreatePatient,
  adminDeletePatient,
} from "@/lib/api";
import { isValidPhone } from "@/lib/phone";
import PhoneInput from "@/components/admin/PhoneInput";
import type { Patient } from "@/types";

const inputCls =
  "w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";
```

New code:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  adminGetPatients,
  adminCreatePatient,
  adminDeletePatient,
} from "@/lib/api";
import { isValidPhone } from "@/lib/phone";
import PhoneInput from "@/components/admin/PhoneInput";
import { SelectInput } from "@/components/admin/DateTimeInput";
import { PATIENT_SOURCE, PATIENT_SOURCE_OPTIONS } from "@/lib/patientSource";
import type { Patient, PatientSource } from "@/types";

const inputCls =
  "w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";
```

- [ ] **Step 2: Add `source` state — modify `frontend/src/app/admin/(panel)/hastalar/page.tsx:28-31`**

Current code:

```tsx
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
```

New code:

```tsx
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<PatientSource | "">("");
  const [note, setNote] = useState("");
```

- [ ] **Step 3: Reset and submit `source` — modify `frontend/src/app/admin/(panel)/hastalar/page.tsx:49-81`**

Current code:

```tsx
  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setPhone("");
    setNote("");
    setShowForm(false);
    setError("");
  };

  const handleSave = async () => {
    if (!firstName || !lastName || !phone) {
      setError("Ad, soyad ve telefon zorunludur.");
      return;
    }
    if (!isValidPhone(phone)) {
      setError("Geçerli bir telefon girin: 0(5xx)xxx xx xx");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const created = await adminCreatePatient(
        { firstName, lastName, phone, note },
        token,
      );
      setPatients((prev) => [created, ...prev]);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  };
```

New code:

```tsx
  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setPhone("");
    setSource("");
    setNote("");
    setShowForm(false);
    setError("");
  };

  const handleSave = async () => {
    if (!firstName || !lastName || !phone) {
      setError("Ad, soyad ve telefon zorunludur.");
      return;
    }
    if (!isValidPhone(phone)) {
      setError("Geçerli bir telefon girin: 0(5xx)xxx xx xx");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const created = await adminCreatePatient(
        { firstName, lastName, phone, source: source || null, note },
        token,
      );
      setPatients((prev) => [created, ...prev]);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  };
```

- [ ] **Step 4: Add the dropdown to the form UI — modify `frontend/src/app/admin/(panel)/hastalar/page.tsx:126-147`**

Current code:

```tsx
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Ad</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Soyad</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Telefon</label>
              <PhoneInput value={phone} onChange={setPhone} inputClassName={inputCls} />
            </div>
          </div>
```

New code:

```tsx
          <div className="grid sm:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>Ad</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Soyad</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Telefon</label>
              <PhoneInput value={phone} onChange={setPhone} inputClassName={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Kaynak (opsiyonel)</label>
              <SelectInput
                value={source}
                onChange={(v) => setSource(v as PatientSource)}
                inputClassName={inputCls}
                placeholder="Nereden geldi?"
                options={PATIENT_SOURCE_OPTIONS.map((s) => ({
                  value: s,
                  label: PATIENT_SOURCE[s].label,
                }))}
              />
            </div>
          </div>
```

- [ ] **Step 5: Add `processStatus` editing + `visitType`/`cancelReason` badges to the detail page — modify `frontend/src/app/admin/(panel)/hastalar/[id]/page.tsx:1-16`**

Current code:

```tsx
"use client";

import { use, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  adminGetPatient,
  adminUpdatePatient,
  adminDeleteBooking,
} from "@/lib/api";
import { STATUS } from "@/lib/bookingStatus";
import BookingForm from "@/components/admin/BookingForm";
import type { Booking, Patient } from "@/types";

const inputCls =
  "w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400";
```

New code:

```tsx
"use client";

import { use, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  adminGetPatient,
  adminUpdatePatient,
  adminDeleteBooking,
} from "@/lib/api";
import { STATUS } from "@/lib/bookingStatus";
import { VISIT_TYPE } from "@/lib/bookingVisitType";
import { CANCEL_REASON } from "@/lib/bookingCancelReason";
import { PROCESS_STATUS, PROCESS_STATUS_OPTIONS } from "@/lib/patientProcessStatus";
import { SelectInput } from "@/components/admin/DateTimeInput";
import BookingForm from "@/components/admin/BookingForm";
import type { Booking, Patient, PatientProcessStatus } from "@/types";

const inputCls =
  "w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400";
```

- [ ] **Step 6: Add a `processStatus` save handler — modify `frontend/src/app/admin/(panel)/hastalar/[id]/page.tsx:59-70`**

Current code:

```tsx
  const saveNote = async () => {
    if (!patient) return;
    setSavingNote(true);
    setNoteSaved(false);
    try {
      await adminUpdatePatient(patient._id, { note }, token);
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } finally {
      setSavingNote(false);
    }
  };
```

New code:

```tsx
  const saveNote = async () => {
    if (!patient) return;
    setSavingNote(true);
    setNoteSaved(false);
    try {
      await adminUpdatePatient(patient._id, { note }, token);
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } finally {
      setSavingNote(false);
    }
  };

  const changeProcessStatus = async (status: PatientProcessStatus) => {
    if (!patient) return;
    const updated = await adminUpdatePatient(
      patient._id,
      { processStatus: status },
      token,
    );
    setPatient(updated);
  };
```

- [ ] **Step 7: Render the `processStatus` dropdown next to the patient name — modify `frontend/src/app/admin/(panel)/hastalar/[id]/page.tsx:100-116`**

Current code:

```tsx
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-gray-500 mt-1">☎ {patient.phone}</p>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            + Randevu Ekle
          </button>
        </div>
```

New code:

```tsx
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-gray-500 mt-1">☎ {patient.phone}</p>
          </div>
          <div className="flex items-center gap-3">
            <SelectInput
              value={patient.processStatus}
              onChange={(v) => changeProcessStatus(v as PatientProcessStatus)}
              inputClassName="border border-gray-300 rounded-xl px-3 py-2 text-sm"
              options={PROCESS_STATUS_OPTIONS.map((s) => ({
                value: s,
                label: PROCESS_STATUS[s].label,
              }))}
            />
            <button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              + Randevu Ekle
            </button>
          </div>
        </div>
```

- [ ] **Step 8: Show `visitType`/`cancelReason` in the booking history rows — modify `frontend/src/app/admin/(panel)/hastalar/[id]/page.tsx:154-176`**

Current code:

```tsx
              <div key={b._id} className="flex items-center gap-4 py-3">
                <div className="w-32">
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(b.date).toLocaleDateString("tr-TR")}
                  </p>
                  <p className="text-xs text-gray-400 tabular-nums">
                    {b.time || "—"}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  {b.note ? (
                    <p className="text-sm text-gray-600 truncate">{b.note}</p>
                  ) : (
                    <p className="text-sm text-gray-300">not yok</p>
                  )}
                </div>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS[b.status].badge}`}
                >
                  {STATUS[b.status].label}
                </span>
```

New code:

```tsx
              <div key={b._id} className="flex items-center gap-4 py-3">
                <div className="w-32">
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(b.date).toLocaleDateString("tr-TR")}
                  </p>
                  <p className="text-xs text-gray-400 tabular-nums">
                    {b.time || "—"}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  {b.note ? (
                    <p className="text-sm text-gray-600 truncate">{b.note}</p>
                  ) : (
                    <p className="text-sm text-gray-300">not yok</p>
                  )}
                  {b.cancelReason && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Neden: {CANCEL_REASON[b.cancelReason].label}
                    </p>
                  )}
                </div>
                {b.visitType && (
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${VISIT_TYPE[b.visitType].badge}`}
                  >
                    {VISIT_TYPE[b.visitType].label}
                  </span>
                )}
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS[b.status].badge}`}
                >
                  {STATUS[b.status].label}
                </span>
```

- [ ] **Step 9: Typecheck**

Run: `cd frontend && npx tsc -p . --noEmit`
Expected: no errors.

- [ ] **Step 10: Manual verification**

1. Go to `/admin/hastalar`, click "+ Yeni Hasta", pick a "Kaynak" value, save → confirm the new patient appears (kaynak isn't shown in the list table, that's fine — verify via network tab or the patient detail page in a later step if a badge is added there).
2. Open the new patient's detail page → confirm the "Süreç Durumu" dropdown next to the name shows "Aktif" and can be changed to "Süreci Tamamladı" (page should reflect the change immediately, no reload needed).
3. On a booking created with an "İptal" status and a reason, confirm the reason text ("Neden: …") appears under the note in the booking history row, and the "İlk Görüşme"/"Kontrol" badge shows next to the status badge.

- [ ] **Step 11: Commit**

```bash
git add "frontend/src/app/admin/(panel)/hastalar/page.tsx" "frontend/src/app/admin/(panel)/hastalar/[id]/page.tsx"
git commit -m "feat: add patient source/processStatus editing and visitType/cancelReason display"
```

---

## Task 9: İstatistik — nötr DeltaChip & Aylık Özet

**Files:**
- Modify: `frontend/src/app/admin/(panel)/istatistik/page.tsx`

**Interfaces:**
- Consumes: `stats.monthlySummary` (Task 5/6).
- Produces: `DeltaChip` gains a `neutral` prop — Task 10 reuses it for the devamlılık/kaynak/iptal sections.

- [ ] **Step 1: Add a neutral variant to `DeltaChip` — modify `frontend/src/app/admin/(panel)/istatistik/page.tsx:34-46`**

Current code:

```tsx
function DeltaChip({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
        up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
      }`}
    >
      {up ? "▲" : "▼"} %{Math.abs(pct)}
    </span>
  );
}
```

New code:

```tsx
// `neutral` renders a plain gray chip (direction + magnitude only, no
// good/bad color) — used for metrics like iptal/gelmedi where a colored
// up/down arrow would read as a judgment rather than information.
function DeltaChip({
  pct,
  neutral,
}: {
  pct: number | null;
  neutral?: boolean;
}) {
  if (pct === null) return null;
  const up = pct >= 0;
  const tone = neutral
    ? "bg-gray-100 text-gray-600"
    : up
      ? "bg-emerald-50 text-emerald-700"
      : "bg-red-50 text-red-600";
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${tone}`}
    >
      {up ? "▲" : "▼"} %{Math.abs(pct)}
    </span>
  );
}
```

- [ ] **Step 2: Let `StatTile` pass `neutral` through — modify `frontend/src/app/admin/(panel)/istatistik/page.tsx:48-77`**

Current code:

```tsx
function StatTile({
  label,
  value,
  delta,
  caption,
  accent,
}: {
  label: string;
  value: string;
  delta?: number | null;
  caption?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-500">{label}</p>
        {delta !== undefined && <DeltaChip pct={delta ?? null} />}
      </div>
      <p
        className={`text-2xl font-bold mt-2 tabular-nums ${
          accent ? "text-brand-600" : "text-gray-900"
        }`}
      >
        {value}
      </p>
      {caption && <p className="text-xs text-gray-400 mt-1">{caption}</p>}
    </div>
  );
}
```

New code:

```tsx
function StatTile({
  label,
  value,
  delta,
  deltaNeutral,
  caption,
  accent,
}: {
  label: string;
  value: string;
  delta?: number | null;
  deltaNeutral?: boolean;
  caption?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-500">{label}</p>
        {delta !== undefined && (
          <DeltaChip pct={delta ?? null} neutral={deltaNeutral} />
        )}
      </div>
      <p
        className={`text-2xl font-bold mt-2 tabular-nums ${
          accent ? "text-brand-600" : "text-gray-900"
        }`}
      >
        {value}
      </p>
      {caption && <p className="text-xs text-gray-400 mt-1">{caption}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Add the "Aylık Özet" section — modify `frontend/src/app/admin/(panel)/istatistik/page.tsx:226-229`**

Current code:

```tsx
          </div>

          {/* Revenue trend + patient split */}
          <div className="grid lg:grid-cols-3 gap-6">
```

New code:

```tsx
          </div>

          {/* Monthly summary (Booking-based) */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Aylık Özet</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatTile
                label="Toplam Randevu"
                value={String(stats.monthlySummary.totalBookings)}
                delta={stats.monthlySummary.totalBookingsChangePct}
                caption="önceki döneme göre"
              />
              <StatTile
                label="Gerçekleşen"
                value={String(stats.monthlySummary.completed)}
                delta={stats.monthlySummary.completedChangePct}
                caption="önceki döneme göre"
              />
              <StatTile
                label="İptal"
                value={String(stats.monthlySummary.cancelled)}
                delta={stats.monthlySummary.cancelledChangePct}
                deltaNeutral
                caption="önceki döneme göre"
              />
              <StatTile
                label="Gelmedi"
                value={String(stats.monthlySummary.noShow)}
                delta={stats.monthlySummary.noShowChangePct}
                deltaNeutral
                caption="önceki döneme göre"
              />
              <StatTile
                label="Yeni Danışan"
                value={String(stats.monthlySummary.newPatients)}
                delta={stats.monthlySummary.newPatientsChangePct}
                caption="önceki döneme göre"
              />
              <StatTile
                label="Kontrol Randevusu"
                value={String(stats.monthlySummary.followUps)}
                delta={stats.monthlySummary.followUpsChangePct}
                caption="önceki döneme göre"
              />
              <StatTile
                label="Toplam Gelir"
                value={formatTRY(stats.monthlySummary.revenue)}
                delta={stats.monthlySummary.revenueChangePct}
                caption="önceki döneme göre"
                accent
              />
            </div>
          </div>

          {/* Revenue trend + patient split */}
          <div className="grid lg:grid-cols-3 gap-6">
```

(The rest of the original `ChartCard`/`AreaChart` block that follows is untouched — this insertion only adds the new block above it.)

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npx tsc -p . --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run the dev server (or use the running `diyet_frontend` container), go to `/admin/istatistik`, confirm:
1. A new "Aylık Özet" heading with 7 tiles appears above the existing "Aylık Kazanç" chart.
2. "İptal" and "Gelmedi" tiles show a gray (not red/green) delta chip; the others show the existing emerald/red chip.

- [ ] **Step 6: Commit**

```bash
git add "frontend/src/app/admin/(panel)/istatistik/page.tsx"
git commit -m "feat: add neutral DeltaChip variant and Aylık Özet section to istatistik page"
```

---

## Task 10: İstatistik — Devamlılık, Kaynak Dağılımı, İptal & Gelmeme Analizi

**Files:**
- Modify: `frontend/src/app/admin/(panel)/istatistik/page.tsx`

**Interfaces:**
- Consumes: `stats.retention`, `stats.sourceBreakdown`, `stats.cancelReasonBreakdown` (Task 5/6), `PATIENT_SOURCE` (`@/lib/patientSource`), `PROCESS_STATUS` (`@/lib/patientProcessStatus`), `CANCEL_REASON` (`@/lib/bookingCancelReason`), `DeltaChip`/`StatTile`/`ChartCard`/`ChartTooltip`/`axisTick` (this file, Task 9).

- [ ] **Step 1: Add the new imports — modify `frontend/src/app/admin/(panel)/istatistik/page.tsx:19-27`**

Current code:

```tsx
import { adminGetStats } from "@/lib/api";
import {
  formatTRY,
  formatK,
  formatMonthLabel,
  monthsBetween,
} from "@/lib/periods";
import PeriodFilter, { type Range } from "@/components/admin/PeriodFilter";
import type { StatsResponse } from "@/types";
```

New code:

```tsx
import { adminGetStats } from "@/lib/api";
import {
  formatTRY,
  formatK,
  formatMonthLabel,
  monthsBetween,
} from "@/lib/periods";
import PeriodFilter, { type Range } from "@/components/admin/PeriodFilter";
import { PATIENT_SOURCE } from "@/lib/patientSource";
import { PROCESS_STATUS } from "@/lib/patientProcessStatus";
import { CANCEL_REASON } from "@/lib/bookingCancelReason";
import type { StatsResponse } from "@/types";
```

- [ ] **Step 2: Add two more chart colors — modify `frontend/src/app/admin/(panel)/istatistik/page.tsx:29-30`**

Current code:

```tsx
const EMERALD = "#10b981";
const INDIGO = "#6366f1";
```

New code:

```tsx
const EMERALD = "#10b981";
const INDIGO = "#6366f1";
const AMBER = "#f59e0b";
const SLATE = "#94a3b8";
```

- [ ] **Step 3: Build the derived chart data — modify `frontend/src/app/admin/(panel)/istatistik/page.tsx`, right after the existing `patientSplit`/`maxTopRevenue` derivations (current lines 175-182)**

Current code:

```tsx
  const patientSplit = stats
    ? [
        { name: "Yeni Hasta", value: stats.newPatients, color: EMERALD },
        { name: "Tekrar Eden", value: stats.returningPatients, color: INDIGO },
      ]
    : [];

  const maxTopRevenue = stats?.topPatients[0]?.revenue ?? 1;
```

New code:

```tsx
  const patientSplit = stats
    ? [
        { name: "Yeni Hasta", value: stats.newPatients, color: EMERALD },
        { name: "Tekrar Eden", value: stats.returningPatients, color: INDIGO },
      ]
    : [];

  const maxTopRevenue = stats?.topPatients[0]?.revenue ?? 1;

  const PROCESS_STATUS_COLOR = {
    aktif: INDIGO,
    tamamladi: EMERALD,
    birakti: SLATE,
  } as const;
  const processSplit =
    stats?.retention.processStatusBreakdown
      .filter((r) => r.count > 0)
      .map((r) => ({
        name: PROCESS_STATUS[r.status].label,
        value: r.count,
        color: PROCESS_STATUS_COLOR[r.status],
      })) ?? [];

  const sourceData =
    stats?.sourceBreakdown
      .filter((r) => r.count > 0)
      .map((r) => ({
        name: PATIENT_SOURCE[r.source].label,
        count: r.count,
      })) ?? [];

  const cancelReasonData =
    stats?.cancelReasonBreakdown
      .filter((r) => r.count > 0)
      .map((r) => ({
        name: CANCEL_REASON[r.reason].label,
        count: r.count,
      })) ?? [];
```

- [ ] **Step 4: Add the three new sections — modify `frontend/src/app/admin/(panel)/istatistik/page.tsx:472-477`**

Current code (end of the "Top patients" `ChartCard` and the page's closing tags):

```tsx
          </ChartCard>
        </div>
      )}
    </div>
  );
}
```

New code:

```tsx
          </ChartCard>

          {/* Retention */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Devamlılık</h2>
            <div className="grid lg:grid-cols-3 gap-4 mb-6">
              <StatTile
                label="İlk → İkinci Geçiş Oranı"
                value={
                  stats.retention.firstToSecondRate === null
                    ? "—"
                    : `%${stats.retention.firstToSecondRate}`
                }
                caption="dönemde ilk görüşmesi olan danışanlar arasında"
              />
              <StatTile
                label="Ortalama Görüşme Sayısı"
                value={String(stats.retention.avgFollowUpCount)}
                caption="hasta başına, gerçekleşen randevular"
              />
              <StatTile
                label="Ortalama Takip Süresi"
                value={`${stats.retention.avgFollowUpSpanDays} gün`}
                caption="ilk ve son randevu arasında"
              />
            </div>
            {processSplit.length > 0 && (
              <ChartCard
                title="Süreç Durumu Dağılımı"
                subtitle="Dönemde ilk görüşmesi olan danışanların güncel durumu"
              >
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={processSplit}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={2}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {processSplit.map((e) => (
                        <Cell key={e.name} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} isAnimationActive={false} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {processSplit.map((e) => (
                    <div
                      key={e.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-2 text-gray-600">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ background: e.color }}
                        />
                        {e.name}
                      </span>
                      <span className="font-semibold text-gray-900 tabular-nums">
                        {e.value}
                      </span>
                    </div>
                  ))}
                </div>
              </ChartCard>
            )}
          </div>

          {/* Source + cancellation breakdown */}
          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard
              title="Kaynak Dağılımı"
              subtitle="Dönemde ilk görüşmesi olan danışanlar nereden geldi"
            >
              {sourceData.length === 0 ? (
                <p className="text-gray-400 text-sm">Bu dönemde veri yok.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={sourceData}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f1f5f9"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={axisTick}
                      tickLine={false}
                      axisLine={{ stroke: "#e5e7eb" }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={axisTick}
                      tickLine={false}
                      axisLine={false}
                      width={140}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: "#f8fafc" }}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="count"
                      name="Danışan"
                      fill={INDIGO}
                      radius={[0, 4, 4, 0]}
                      maxBarSize={22}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard
              title="İptal & Gelmeme Analizi"
              subtitle="Dönemdeki iptal/gelmeme kayıtları, nedene göre"
            >
              {cancelReasonData.length === 0 ? (
                <p className="text-gray-400 text-sm">Bu dönemde veri yok.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={cancelReasonData}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f1f5f9"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={axisTick}
                      tickLine={false}
                      axisLine={{ stroke: "#e5e7eb" }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={axisTick}
                      tickLine={false}
                      axisLine={false}
                      width={140}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: "#f8fafc" }}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="count"
                      name="Kayıt"
                      fill={AMBER}
                      radius={[0, 4, 4, 0]}
                      maxBarSize={22}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Typecheck**

Run: `cd frontend && npx tsc -p . --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification**

At `/admin/istatistik`:
1. Confirm "Devamlılık" section renders 3 KPI tiles + (if any patient has a non-zero `processStatus` count in the cohort) a "Süreç Durumu Dağılımı" pie chart.
2. Confirm "Kaynak Dağılımı" and "İptal & Gelmeme Analizi" horizontal bar charts render below it, each showing "Bu dönemde veri yok." when empty instead of a broken empty chart.
3. Confirm no console errors in the browser dev tools on this page.

- [ ] **Step 7: Commit**

```bash
git add "frontend/src/app/admin/(panel)/istatistik/page.tsx"
git commit -m "feat: add retention, source distribution, and cancellation analysis sections to istatistik page"
```

---

## Task 11: Uçtan uca doğrulama (Docker)

**Files:** none (verification only)

- [ ] **Step 1: Run the full backend test suite one more time**

Run: `cd backend && npm test`
Expected: all suites pass.

- [ ] **Step 2: Rebuild and restart the Docker stack**

Run: `docker compose up -d --build`
Expected: `diyet_mongo`, `diyet_backend`, `diyet_frontend`, `diyet_caddy` all `Up`.

- [ ] **Step 3: Run the backfill script against the dev database**

Run: `docker compose exec backend node src/scripts/backfill-visit-type.js`
Expected: `visitType backfill complete: N booking(s) updated.` (N may be 0 on a fresh DB — that's fine.)

- [ ] **Step 4: Full manual walkthrough in the browser**

1. Log into `https://localhost/admin/login`.
2. Create a patient with a `Kaynak` selected.
3. Add two bookings for that patient: confirm the first is auto-badged "İlk Görüşme" and the second "Kontrol".
4. Set one booking's status to "İptal" and confirm a reason is required and gets saved.
5. Change the patient's "Süreç Durumu" to "Süreci Tamamladı" on the detail page.
6. Open `/admin/istatistik`, select a period covering the bookings just created, and confirm all four new sections (Aylık Özet, Devamlılık, Kaynak Dağılımı, İptal & Gelmeme Analizi) render with the expected counts and no console errors.

- [ ] **Step 5: Report results to the user**

No commit for this task — it's a verification pass. Summarize what was checked and any issues found.

