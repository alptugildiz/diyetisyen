/**
 * One-off migration: assigns visitType to Booking rows created before this
 * field existed. Per patient, the earliest booking (by date) becomes
 * "ilk_gorusme"; every later one becomes "kontrol". Idempotent — re-running
 * is safe, already-correct rows are left untouched.
 *
 * Standalone run:
 *   node src/scripts/backfill-visit-type.js
 */
const mongoose = require("mongoose");
const Booking = require("../models/Booking");

async function backfillVisitType() {
  const patientIds = await Booking.distinct("patient", {});
  let updated = 0;

  for (const patientId of patientIds) {
    const bookings = await Booking.find({ patient: patientId }).sort({
      date: 1,
      createdAt: 1,
    });
    for (let i = 0; i < bookings.length; i++) {
      const visitType = i === 0 ? "ilk_gorusme" : "kontrol";
      if (bookings[i].visitType !== visitType) {
        await Booking.updateOne({ _id: bookings[i]._id }, { visitType });
        updated++;
      }
    }
  }

  return updated;
}

module.exports = backfillVisitType;

if (require.main === module) {
  require("dotenv").config();
  mongoose
    .connect(process.env.MONGO_URI)
    .then(async () => {
      const updated = await backfillVisitType();
      console.log(`visitType backfill complete: ${updated} booking(s) updated.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Backfill error:", err);
      process.exit(1);
    });
}
