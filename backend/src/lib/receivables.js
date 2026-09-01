const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const PatientPackage = require("../models/PatientPackage");
const { buildDateFilter } = require("./dateRange");

// Alacak = tahakkuk − tahsilat. İki kaynaktan gelir:
// (1) "geldi" işaretli ama tahsilatı eksik randevular,
// (2) bedeli tam ödenmemiş paket satışları.
//
// Hem /api/admin/stats hem /api/admin/today buradan okur; iki ekranın
// farklı rakam göstermemesi için tek tanım.
//
// `query` boş nesne ise tüm zamanların alacağı hesaplanır.
async function computeReceivables(query = {}) {
  const byPatient = new Map();
  let total = 0;

  const add = (patientId, debt) => {
    if (debt <= 0) return;
    total += debt;
    const key = String(patientId);
    byPatient.set(key, (byPatient.get(key) ?? 0) + debt);
  };

  const completed = await Booking.find({
    ...buildDateFilter(query),
    status: "geldi",
    fee: { $gt: 0 },
  }).select("_id fee patient");

  const bookingPaid = await Payment.aggregate([
    { $match: { booking: { $in: completed.map((b) => b._id) } } },
    { $group: { _id: "$booking", paid: { $sum: "$amount" } } },
  ]);
  const paidByBooking = new Map(
    bookingPaid.map((row) => [String(row._id), row.paid]),
  );
  for (const b of completed) {
    add(b.patient, b.fee - (paidByBooking.get(String(b._id)) ?? 0));
  }

  const sales = await PatientPackage.find({
    ...buildDateFilter(query, "soldAt"),
    status: { $ne: "iptal" },
  }).select("_id price patient");

  const packagePaid = await Payment.aggregate([
    { $match: { patientPackage: { $in: sales.map((s) => s._id) } } },
    { $group: { _id: "$patientPackage", paid: { $sum: "$amount" } } },
  ]);
  const paidByPackage = new Map(
    packagePaid.map((row) => [String(row._id), row.paid]),
  );
  for (const s of sales) {
    add(s.patient, s.price - (paidByPackage.get(String(s._id)) ?? 0));
  }

  return { total, byPatient };
}

module.exports = { computeReceivables };
