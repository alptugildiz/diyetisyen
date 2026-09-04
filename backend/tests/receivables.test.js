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

  it("toplam, satırların toplamına eşittir", async () => {
    const a = await Patient.create({
      firstName: "A",
      lastName: "Bir",
      phone: "05553333333",
    });
    const b = await Patient.create({
      firstName: "B",
      lastName: "İki",
      phone: "05554444444",
    });
    await Booking.create({
      patient: a._id,
      date: new Date("2026-09-01T00:00:00.000Z"),
      status: "geldi",
      fee: 450,
    });
    await Booking.create({
      patient: b._id,
      date: new Date("2026-09-02T00:00:00.000Z"),
      status: "geldi",
      fee: 550,
    });

    const res = await request(app)
      .get("/api/admin/receivables")
      .set("Authorization", `Bearer ${token}`);

    const sum = res.body.rows.reduce((acc, r) => acc + r.debt, 0);
    expect(sum).toBe(res.body.total);
    expect(res.body.total).toBe(1000);
  });
});
