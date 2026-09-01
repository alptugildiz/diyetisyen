const request = require("supertest");
const app = require("../src/app");
const Patient = require("../src/models/Patient");
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

describe("POST /api/admin/patients", () => {
  it("stores source and defaults processStatus to aktif", async () => {
    const res = await request(app)
      .post("/api/admin/patients")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Ayşe",
        lastName: "Yılmaz",
        phone: "0(555)123 45 67",
        source: "instagram",
      });
    expect(res.status).toBe(201);
    expect(res.body.source).toBe("instagram");
    expect(res.body.processStatus).toBe("aktif");
  });

  it("rejects an invalid source value", async () => {
    const res = await request(app)
      .post("/api/admin/patients")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Ayşe",
        lastName: "Yılmaz",
        phone: "0(555)123 45 67",
        source: "unknown",
      });
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/admin/patients/:id", () => {
  it("updates processStatus", async () => {
    const patient = await Patient.create({
      firstName: "Ayşe",
      lastName: "Yılmaz",
      phone: "0(555)123 45 67",
    });
    const res = await request(app)
      .put(`/api/admin/patients/${patient._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ processStatus: "tamamladi" });
    expect(res.status).toBe(200);
    expect(res.body.processStatus).toBe("tamamladi");
  });
});

const PatientPackage = require("../src/models/PatientPackage");
const Payment = require("../src/models/Payment");

describe("patient cascade and listing", () => {
  it("deletes bookings, packages and payments with the patient", async () => {
    const patient = await Patient.create({
      firstName: "Ayşe",
      lastName: "Yılmaz",
      phone: "0(555)123 45 67",
    });
    const sale = await PatientPackage.create({
      patient: patient._id,
      name: "4 Seans",
      sessionCount: 4,
      price: 8000,
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
      .delete(`/api/admin/patients/${patient._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(await PatientPackage.countDocuments()).toBe(0);
    expect(await Payment.countDocuments()).toBe(0);
  });

  it("paginates the list", async () => {
    for (let i = 0; i < 5; i++) {
      await Patient.create({
        firstName: `Ad${i}`,
        lastName: "Soyad",
        phone: `0(555)000 00 0${i}`,
      });
    }
    const res = await request(app)
      .get("/api/admin/patients?page=2&limit=2")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.patients).toHaveLength(2);
    expect(res.body.total).toBe(5);
    expect(res.body.totalPages).toBe(3);
    expect(res.body.page).toBe(2);
  });

  it("searches by name and phone", async () => {
    await Patient.create({
      firstName: "Zeynep",
      lastName: "Ak",
      phone: "0(555)111 22 33",
    });
    await Patient.create({
      firstName: "Mehmet",
      lastName: "Kaya",
      phone: "0(555)444 55 66",
    });

    const byName = await request(app)
      .get("/api/admin/patients?q=zeynep")
      .set("Authorization", `Bearer ${token}`);
    expect(byName.body.patients).toHaveLength(1);

    const byPhone = await request(app)
      .get("/api/admin/patients?q=444")
      .set("Authorization", `Bearer ${token}`);
    expect(byPhone.body.patients).toHaveLength(1);
    expect(byPhone.body.patients[0].firstName).toBe("Mehmet");
  });
});
