const request = require("supertest");
const app = require("../src/app");
const Patient = require("../src/models/Patient");
const Package = require("../src/models/Package");
const PatientPackage = require("../src/models/PatientPackage");
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

describe("admin patient packages", () => {
  it("sells a package, copying the catalogue values as a snapshot", async () => {
    const patient = await createPatient();
    const pkg = await Package.create({
      name: "8 Seans",
      sessionCount: 8,
      price: 10000,
    });

    const res = await request(app)
      .post("/api/admin/patient-packages")
      .set("Authorization", `Bearer ${token}`)
      .send({
        patient: patient._id.toString(),
        package: pkg._id.toString(),
        name: pkg.name,
        sessionCount: pkg.sessionCount,
        price: pkg.price,
        soldAt: "2026-09-01",
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("8 Seans");
    expect(res.body.price).toBe(10000);
    expect(res.body.status).toBe("aktif");
  });

  it("keeps the snapshot when the catalogue price changes afterwards", async () => {
    const patient = await createPatient();
    const pkg = await Package.create({
      name: "8 Seans",
      sessionCount: 8,
      price: 10000,
    });
    const sold = await PatientPackage.create({
      patient: patient._id,
      package: pkg._id,
      name: pkg.name,
      sessionCount: pkg.sessionCount,
      price: pkg.price,
      soldAt: new Date("2026-09-01"),
    });

    await Package.findByIdAndUpdate(pkg._id, { price: 14000 });

    const res = await request(app)
      .get(`/api/admin/patient-packages?patient=${patient._id}`)
      .set("Authorization", `Bearer ${token}`);
    const found = res.body.find((p) => p._id === sold._id.toString());
    expect(found.price).toBe(10000);
  });

  it("reports remaining sessions and remaining debt", async () => {
    const patient = await createPatient();
    await PatientPackage.create({
      patient: patient._id,
      name: "4 Seans",
      sessionCount: 4,
      price: 8000,
      soldAt: new Date("2026-09-01"),
    });

    const res = await request(app)
      .get(`/api/admin/patient-packages?patient=${patient._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.body[0].usedSessions).toBe(0);
    expect(res.body[0].remainingSessions).toBe(4);
    expect(res.body[0].paidAmount).toBe(0);
    expect(res.body[0].remainingDebt).toBe(8000);
  });

  it("normalises soldAt to UTC midnight", async () => {
    const patient = await createPatient();
    const res = await request(app)
      .post("/api/admin/patient-packages")
      .set("Authorization", `Bearer ${token}`)
      .send({
        patient: patient._id.toString(),
        name: "4 Seans",
        sessionCount: 4,
        price: 8000,
        soldAt: "2026-09-01",
      });
    expect(new Date(res.body.soldAt).toISOString()).toBe(
      "2026-09-01T00:00:00.000Z",
    );
  });
});
