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

  it("randevu başka bir randevunun saatine taşınırsa 409 döner", async () => {
    const a = await makePatient("Ayşe");
    const b = await makePatient("Berk");
    await request(app)
      .post("/api/admin/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ patient: a._id.toString(), date: "2026-09-10", time: "14:00" });
    const second = await request(app)
      .post("/api/admin/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ patient: b._id.toString(), date: "2026-09-10", time: "15:00" });

    const res = await request(app)
      .put(`/api/admin/bookings/${second.body._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ time: "14:00" });

    expect(res.status).toBe(409);
  });
});
