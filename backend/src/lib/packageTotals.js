const Booking = require("../models/Booking");
const Payment = require("../models/Payment");

// Satılan paketin türetilen alanlarını hesaplar. Sayaç saklamıyoruz;
// saklanan sayaç er ya da geç gerçekle uyumsuzlaşır.
async function decoratePatientPackage(pp) {
  const plain = pp.toObject ? pp.toObject() : { ...pp };

  const usedSessions = await Booking.countDocuments({
    patientPackage: pp._id,
    status: "geldi",
  });

  const payments = await Payment.find({ patientPackage: pp._id }).select("amount");
  const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  return {
    ...plain,
    usedSessions,
    remainingSessions: Math.max(plain.sessionCount - usedSessions, 0),
    paidAmount,
    remainingDebt: Math.max(plain.price - paidAmount, 0),
  };
}

module.exports = { decoratePatientPackage };
