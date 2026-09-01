const Patient = require("../src/models/Patient");
const Booking = require("../src/models/Booking");
const { recalcVisitTypes } = require("../src/lib/visitType");
const { connect, clearDatabase, closeDatabase } = require("./testDb");

beforeAll(async () => {
  await connect();
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

const makeBooking = (patient, date, extra = {}) =>
  Booking.create({ patient: patient._id, date: new Date(date), ...extra });

async function visitTypesByDate(patientId) {
  const rows = await Booking.find({ patient: patientId }).sort({ date: 1 });
  return rows.map((b) => b.visitType);
}

it("assigns ilk_gorusme to the earliest booking and kontrol to the rest", async () => {
  const patient = await createPatient();
  await makeBooking(patient, "2026-08-01");
  await makeBooking(patient, "2026-09-01");

  await recalcVisitTypes(patient._id);

  expect(await visitTypesByDate(patient._id)).toEqual([
    "ilk_gorusme",
    "kontrol",
  ]);
});

it("re-assigns ilk_gorusme when an earlier booking is added later", async () => {
  const patient = await createPatient();
  await makeBooking(patient, "2026-09-01");
  await recalcVisitTypes(patient._id);

  await makeBooking(patient, "2026-07-01");
  await recalcVisitTypes(patient._id);

  expect(await visitTypesByDate(patient._id)).toEqual([
    "ilk_gorusme",
    "kontrol",
  ]);
});

it("skips cancelled bookings when deciding the first visit", async () => {
  const patient = await createPatient();
  await makeBooking(patient, "2026-08-01", {
    status: "iptal",
    cancelReason: "unuttu",
  });
  await makeBooking(patient, "2026-09-01", { status: "geldi" });

  await recalcVisitTypes(patient._id);

  expect(await visitTypesByDate(patient._id)).toEqual([null, "ilk_gorusme"]);
});

it("orders same-day bookings by time", async () => {
  const patient = await createPatient();
  await makeBooking(patient, "2026-08-01", { time: "14:00" });
  await makeBooking(patient, "2026-08-01", { time: "09:00" });

  await recalcVisitTypes(patient._id);

  const rows = await Booking.find({ patient: patient._id }).sort({ time: 1 });
  expect(rows.map((b) => b.visitType)).toEqual(["ilk_gorusme", "kontrol"]);
});
