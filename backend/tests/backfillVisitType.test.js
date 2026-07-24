const Patient = require("../src/models/Patient");
const Booking = require("../src/models/Booking");
const backfillVisitType = require("../src/scripts/backfill-visit-type");
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

it("assigns ilk_gorusme to the earliest booking and kontrol to the rest", async () => {
  const patient = await Patient.create({
    firstName: "Ayşe",
    lastName: "Yılmaz",
    phone: "0(555)123 45 67",
  });
  const second = await Booking.create({
    patient: patient._id,
    date: new Date("2026-02-01"),
  });
  const first = await Booking.create({
    patient: patient._id,
    date: new Date("2026-01-01"),
  });
  const third = await Booking.create({
    patient: patient._id,
    date: new Date("2026-03-01"),
  });

  const updated = await backfillVisitType();

  expect(updated).toBe(3);
  expect((await Booking.findById(first._id)).visitType).toBe("ilk_gorusme");
  expect((await Booking.findById(second._id)).visitType).toBe("kontrol");
  expect((await Booking.findById(third._id)).visitType).toBe("kontrol");
});
