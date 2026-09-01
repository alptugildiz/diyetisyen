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

describe("admin finance records", () => {
  it("creates and totals expenses in a date range", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).post("/api/admin/expenses").set(auth).send({
      category: "vergi",
      amount: 1200,
      date: "2026-07-10",
      note: "Temmuz vergisi",
    });
    await request(app).post("/api/admin/expenses").set(auth).send({
      category: "muhasebe",
      amount: 800,
      date: "2026-06-10",
    });

    const res = await request(app)
      .get("/api/admin/expenses?from=2026-07-01&to=2026-07-31")
      .set(auth);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.total).toBe(1200);
    expect(res.body.expenses[0].category).toBe("vergi");
  });

  it("includes expenses and net revenue in statistics", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const patient = await createPatient();
    await Payment.create({
      patient: patient._id,
      source: "booking",
      amount: 1500,
      method: "nakit",
      date: new Date("2026-07-27"),
    });
    await request(app).post("/api/admin/expenses").set(auth).send({
      category: "bagkur",
      amount: 500,
      date: "2026-07-27",
    });

    const res = await request(app)
      .get("/api/admin/stats?from=2026-07-01&to=2026-07-31")
      .set(auth);

    expect(res.status).toBe(200);
    expect(res.body.totalRevenue).toBe(1500);
    expect(res.body.totalExpenses).toBe(500);
    expect(res.body.netRevenue).toBe(1000);
  });

  it("creates a payment record when a booking is completed", async () => {
    const patient = await createPatient();
    const booking = await Booking.create({
      patient: patient._id,
      date: new Date("2026-07-27"),
      status: "planlandi",
      visitType: "ilk_gorusme",
    });

    const res = await request(app)
      .post(`/api/admin/bookings/${booking._id}/complete`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        status: "geldi",
        fee: 1750,
        payment: {
          amount: 1750,
          method: "kart",
          documentNumber: "F-2026-15",
        },
      });

    expect(res.status).toBe(200);
    const income = await Payment.findOne({ booking: booking._id });
    expect(income.amount).toBe(1750);
    expect(income.method).toBe("kart");
    expect(income.documentNumber).toBe("F-2026-15");
  });

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
    expect(res.body.topDebtors[0].name).toBe("Ayşe Yılmaz");
    expect(res.body.topDebtors[0].debt).toBe(1500);
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
    expect(res.body.sessionRevenue).toBe(0);
    expect(res.body.outstandingReceivables).toBe(6000);
  });
});
