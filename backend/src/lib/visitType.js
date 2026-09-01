const Booking = require("../models/Booking");

// Ziyaret tipini kayıt sayısına göre değil TARİHE göre belirler.
// Sayıya göre hesaplamak, geçmiş bir randevu sonradan girildiğinde veya
// ilk randevu silindiğinde yanlış sonuç veriyordu.
//
// İptal edilen randevular sıralamaya girmez: danışan gelmediyse o
// "ilk görüşme" sayılmamalı, yoksa devamlılık metriği anlamsızlaşır.
async function recalcVisitTypes(patientId) {
  const bookings = await Booking.find({ patient: patientId }).sort({
    date: 1,
    time: 1,
    createdAt: 1,
  });

  let seen = 0;
  for (const booking of bookings) {
    let visitType;
    if (booking.status === "iptal") {
      visitType = null;
    } else {
      visitType = seen === 0 ? "ilk_gorusme" : "kontrol";
      seen++;
    }
    if (booking.visitType !== visitType) {
      await Booking.updateOne({ _id: booking._id }, { visitType });
    }
  }
}

module.exports = { recalcVisitTypes };
