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
