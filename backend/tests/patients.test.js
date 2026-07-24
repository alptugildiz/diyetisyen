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
