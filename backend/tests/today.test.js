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

  it("reports the same receivable total as the stats endpoint", async () => {
    const patient = await createPatient();
    await Booking.create({
      patient: patient._id,
      date: toUtcMidnight(today()),
      status: "geldi",
      fee: 1500,
      visitType: "ilk_gorusme",
    });

    const todayRes = await request(app)
      .get("/api/admin/today")
      .set("Authorization", `Bearer ${token}`);
    const statsRes = await request(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${token}`);

    expect(todayRes.body.outstandingReceivables).toBe(1500);
    expect(statsRes.body.outstandingReceivables).toBe(1500);
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
