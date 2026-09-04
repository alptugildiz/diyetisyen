const Booking = require("../models/Booking");

// Aynı gün + aynı saatte duran, iptal edilmemiş başka bir randevu var mı?
// Saati boş randevular (time === "") çakışma saymaz — gün içinde saatsiz
// kayıt tutmak meşru bir kullanım.
async function findConflict({ date, time, excludeId }) {
  if (!time) return null;

  const filter = {
    date,
    time,
    status: { $ne: "iptal" },
  };
  if (excludeId) filter._id = { $ne: excludeId };

  return Booking.findOne(filter).populate(
    "patient",
    "firstName lastName phone",
  );
}

module.exports = { findConflict };
