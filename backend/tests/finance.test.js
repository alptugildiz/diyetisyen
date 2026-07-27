const request = require("supertest");
const app = require("../src/app");
const Patient = require("../src/models/Patient");
const Booking = require("../src/models/Booking");
const Appointment = require("../src/models/Appointment");
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

describe("admin finance records", () => {
  it("stores an appointment payment method", async () => {
    const res = await request(app)
      .post("/api/admin/appointments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Ayşe",
        lastName: "Yılmaz",
        phone: "0(555)123 45 67",
        amount: 1500,
        paymentMethod: "kart",
        date: "2026-07-27",
      });

    expect(res.status).toBe(201);
    expect(res.body.paymentMethod).toBe("kart");
  });

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
    await request(app).post("/api/admin/appointments").set(auth).send({
      firstName: "Ayşe",
      lastName: "Yılmaz",
      phone: "0(555)123 45 67",
      amount: 1500,
      paymentMethod: "nakit",
      date: "2026-07-27",
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

  it("creates an income record when a booking is completed", async () => {
    const patient = await Patient.create({
      firstName: "Ayşe",
      lastName: "Yılmaz",
      phone: "0(555)123 45 67",
    });
    const booking = await Booking.create({
      patient: patient._id,
      date: new Date("2026-07-27"),
      status: "planlandi",
      visitType: "ilk_gorusme",
    });

    const res = await request(app)
      .put(`/api/admin/bookings/${booking._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        status: "geldi",
        completionPayment: {
          amount: 1750,
          paymentMethod: "kart",
          documentNumber: "F-2026-15",
        },
      });

    expect(res.status).toBe(200);
    const income = await Appointment.findOne({ booking: booking._id });
    expect(income.amount).toBe(1750);
    expect(income.paymentMethod).toBe("kart");
    expect(income.documentNumber).toBe("F-2026-15");
  });
});
