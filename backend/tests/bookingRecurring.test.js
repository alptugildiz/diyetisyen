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
    const dates = res.body.created.map((b) => b.date.slice(0, 10)).sort();
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

    const sorted = res.body.created.sort((a, b) => a.date.localeCompare(b.date));
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

  it("saatsiz seri randevu da oluşturulabilir", async () => {
    const p = await makePatient();
    const res = await request(app)
      .post("/api/admin/bookings/recurring")
      .set("Authorization", `Bearer ${token}`)
      .send({ patient: p._id.toString(), date: "2026-09-10", repeatWeeks: 2 });

    expect(res.status).toBe(201);
    expect(res.body.created).toHaveLength(2);
    expect(res.body.skipped).toHaveLength(0);
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

  it("token olmadan 401 döner", async () => {
    const res = await request(app)
      .post("/api/admin/bookings/recurring")
      .send({ patient: "x", date: "2026-09-10", repeatWeeks: 2 });

    expect(res.status).toBe(401);
  });
});
