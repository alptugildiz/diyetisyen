const request = require("supertest");
const app = require("../src/app");
const { connect, closeDatabase } = require("./testDb");

beforeAll(async () => {
  await connect();
});

afterAll(async () => {
  await closeDatabase();
});

describe("GET /api/health", () => {
  it("returns ok status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
