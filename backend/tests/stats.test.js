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
