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
