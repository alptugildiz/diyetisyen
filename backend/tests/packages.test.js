const request = require("supertest");
const app = require("../src/app");
const Package = require("../src/models/Package");
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

describe("admin packages", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await request(app).get("/api/admin/packages");
    expect(res.status).toBe(401);
  });

  it("creates a package", async () => {
    const res = await request(app)
      .post("/api/admin/packages")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "8 Seans Kilo Yönetimi", sessionCount: 8, price: 10000 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("8 Seans Kilo Yönetimi");
    expect(res.body.isActive).toBe(true);
  });

  it("rejects a package with fewer than one session", async () => {
    const res = await request(app)
      .post("/api/admin/packages")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Boş paket", sessionCount: 0, price: 100 });
    expect(res.status).toBe(400);
  });

  it("hides inactive packages when activeOnly is set", async () => {
    await Package.create({ name: "Aktif", sessionCount: 4, price: 5000 });
    await Package.create({
      name: "Pasif",
      sessionCount: 4,
      price: 5000,
      isActive: false,
    });
    const res = await request(app)
      .get("/api/admin/packages?activeOnly=true")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Aktif");
  });

  it("returns every package by default, ordered", async () => {
    await Package.create({ name: "İkinci", sessionCount: 4, price: 5000, order: 2 });
    await Package.create({ name: "Birinci", sessionCount: 8, price: 9000, order: 1 });
    const res = await request(app)
      .get("/api/admin/packages")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.map((p) => p.name)).toEqual(["Birinci", "İkinci"]);
  });

  it("deletes a package", async () => {
    const pkg = await Package.create({ name: "Silinecek", sessionCount: 4, price: 5000 });
    const res = await request(app)
      .delete(`/api/admin/packages/${pkg._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(await Package.countDocuments()).toBe(0);
  });
});
