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
