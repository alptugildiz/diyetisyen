const express = require("express");
const Booking = require("../../models/Booking");
const Payment = require("../../models/Payment");
const PatientPackage = require("../../models/PatientPackage");
const AppointmentRequest = require("../../models/AppointmentRequest");
const { protect } = require("../../middleware/auth");
const { buildDateFilter } = require("../../lib/dateRange");
const { decoratePatientPackage } = require("../../lib/packageTotals");
const { computeReceivables } = require("../../lib/receivables");

const router = express.Router();
router.use(protect);

// Sunucunun yerel gününü ISO gün anahtarı olarak verir.
// toISOString kullanmıyoruz — UTC+3'te bir gün geriye kayıyor.
function localToday() {
  const n = new Date();
  const pad = (v) => String(v).padStart(2, "0");
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

router.get("/", async (req, res) => {
  try {
    const day = req.query.date || localToday();
    const dayFilter = buildDateFilter({ from: day, to: day });

    const [bookings, payments, pendingRequests, activePackages, receivables] =
      await Promise.all([
        Booking.find(dayFilter)
          .populate("patient", "firstName lastName phone")
          .sort({ time: 1 }),
        Payment.find(dayFilter).select("amount"),
        AppointmentRequest.countDocuments({ status: "yeni" }),
        PatientPackage.find({ status: "aktif" }).populate(
          "patient",
          "firstName lastName",
        ),
        // Alacak dönemle sınırlı değil: bugüne kadar birikmiş tüm borç.
        computeReceivables(),
      ]);

    const decorated = await Promise.all(
      activePackages.map(decoratePatientPackage),
    );
    const endingPackages = decorated
      .filter((p) => p.remainingSessions > 0 && p.remainingSessions <= 1)
      .map((p) => ({
        patient: p.patient,
        name: p.name,
        remainingSessions: p.remainingSessions,
      }));

    res.json({
      date: day,
      bookings,
      unprocessedCount: bookings.filter((b) => b.status === "planlandi").length,
      collectedToday: payments.reduce((sum, p) => sum + p.amount, 0),
      outstandingReceivables: receivables.total,
      endingPackages,
      pendingRequests,
    });
  } catch (err) {
    console.error("Today GET error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
