const request = require("supertest");
const app = require("../src/app");
const Patient = require("../src/models/Patient");
const Booking = require("../src/models/Booking");
const AppointmentRequest = require("../src/models/AppointmentRequest");
const { connect, clearDatabase, closeDatabase } = require("./testDb");
const { makeToken } = require("./authHelper");

let token;

beforeAll(async () => {
  await connect();
  token = makeToken();
  process.env.TELEGRAM_BOT_TOKEN = "test-bot";
  process.env.TELEGRAM_CHAT_ID = "test-chat";
});
afterEach(async () => {
  await clearDatabase();
  jest.restoreAllMocks();
});
afterAll(async () => {
  await closeDatabase();
});

describe("POST /api/appointment", () => {
  it("stores the request and notifies Telegram", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true, json: async () => ({}) });

    const res = await request(app).post("/api/appointment").send({
      name: "Ali Vural",
      email: "ali@example.com",
      phone: "05551234567",
    });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalled();
    const saved = await AppointmentRequest.find();
    expect(saved).toHaveLength(1);
    expect(saved[0].status).toBe("yeni");
  });

  it("still stores the request when Telegram fails", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));

    await request(app).post("/api/appointment").send({
      name: "Ali Vural",
      email: "ali@example.com",
      phone: "05551234567",
    });

    expect(await AppointmentRequest.countDocuments()).toBe(1);
  });
});

describe("admin requests", () => {
  it("lists new requests first, whatever the other statuses are", async () => {
    // "donusturuldu" alfabetik olarak "yeni"den önce gelir; sıralamanın
    // alfabeye değil anlama göre yapıldığını doğruluyoruz.
    await AppointmentRequest.create({
      name: "Donusturulmus",
      email: "d@x.com",
      phone: "05550000001",
      status: "donusturuldu",
    });
    await AppointmentRequest.create({
      name: "Yoksayilmis",
      email: "e@x.com",
      phone: "05550000002",
      status: "yoksayildi",
    });
    await AppointmentRequest.create({
      name: "Yeni",
      email: "y@x.com",
      phone: "05550000003",
    });

    const res = await request(app)
      .get("/api/admin/requests")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.map((r) => r.name)).toEqual([
      "Yeni",
      "Donusturulmus",
      "Yoksayilmis",
    ]);
  });

  it("converts a request into a patient and a booking", async () => {
    const reqDoc = await AppointmentRequest.create({
      name: "Ali Vural",
      email: "ali@example.com",
      phone: "05551234567",
    });

    const res = await request(app)
      .post(`/api/admin/requests/${reqDoc._id}/convert`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Ali",
        lastName: "Vural",
        phone: "0(555)123 45 67",
        source: "web_sitesi",
        booking: { date: "2026-09-10", time: "14:30" },
      });

    expect(res.status).toBe(201);
    expect(res.body.patient.firstName).toBe("Ali");
    expect(res.body.booking.visitType).toBe("ilk_gorusme");

    const updated = await AppointmentRequest.findById(reqDoc._id);
    expect(updated.status).toBe("donusturuldu");
    expect(updated.patient.toString()).toBe(res.body.patient._id);
    expect(await Patient.countDocuments()).toBe(1);
    expect(await Booking.countDocuments()).toBe(1);
  });

  it("converts without a booking when none is given", async () => {
    const reqDoc = await AppointmentRequest.create({
      name: "Ali Vural",
      email: "ali@example.com",
      phone: "05551234567",
    });
    const res = await request(app)
      .post(`/api/admin/requests/${reqDoc._id}/convert`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Ali",
        lastName: "Vural",
        phone: "0(555)123 45 67",
      });
    expect(res.status).toBe(201);
    expect(res.body.booking).toBeNull();
    expect(await Booking.countDocuments()).toBe(0);
  });

  it("marks a request as ignored", async () => {
    const reqDoc = await AppointmentRequest.create({
      name: "Spam",
      email: "s@x.com",
      phone: "05550000000",
    });
    const res = await request(app)
      .put(`/api/admin/requests/${reqDoc._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "yoksayildi" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("yoksayildi");
  });
});
