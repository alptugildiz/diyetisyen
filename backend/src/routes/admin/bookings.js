const express = require("express");
const { z } = require("zod");
const Booking = require("../../models/Booking");
const Payment = require("../../models/Payment");
const { protect } = require("../../middleware/auth");
const { buildDateFilter, toUtcMidnight } = require("../../lib/dateRange");
const { recalcVisitTypes } = require("../../lib/visitType");

const router = express.Router();
router.use(protect);

const CANCEL_REASONS = [
  "tarih_uygun_degil",
  "ucret",
  "unuttu",
  "saglik_problemi",
  "iletisim_kurulamadi",
  "baska_hizmet",
  "belirtilmedi",
];

const bookingSchema = z.object({
  patient: z.string().min(1),
  date: z.string().min(1),
  time: z.string().optional(),
  status: z.enum(["planlandi", "geldi", "gelmedi", "iptal"]).optional(),
  cancelReason: z.enum(CANCEL_REASONS).optional().nullable(),
  note: z.string().optional(),
});

// Randevuyu sonuçlandırma gövdesi. Ücret ve tahsilat ayrı alanlar:
// ücret girilip tahsilat girilmezse fark alacak olarak kalır.
const completeSchema = z
  .object({
    status: z.enum(["geldi", "gelmedi", "iptal"]),
    fee: z.number().min(0).optional(),
    patientPackage: z.string().nullable().optional(),
    cancelReason: z.enum(CANCEL_REASONS).optional().nullable(),
    payment: z
      .object({
        amount: z.number().min(0),
        method: z.enum(["nakit", "kart", "havale"]),
        documentNumber: z.string().optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (needsCancelReason(data.status) && !data.cancelReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cancelReason"],
        message: "İptal veya gelmeme durumunda neden zorunludur.",
      });
    }
  });

function needsCancelReason(status) {
  return status === "iptal" || status === "gelmedi";
}

const populatePatient = (id) =>
  Booking.findById(id).populate("patient", "firstName lastName phone");

// GET /api/admin/bookings?from=&to=
router.get("/", async (req, res) => {
  try {
    const filter = buildDateFilter(req.query);
    const bookings = await Booking.find(filter)
      .populate("patient", "firstName lastName phone")
      .sort({ date: 1, time: 1 });
    res.json(bookings);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/admin/bookings
router.post("/", async (req, res) => {
  try {
    const data = bookingSchema.parse(req.body);
    const status = data.status ?? "planlandi";

    if (needsCancelReason(status) && !data.cancelReason) {
      return res.status(400).json({
        message: "Validation error",
        errors: [
          {
            path: ["cancelReason"],
            message: "İptal veya gelmeme durumunda neden zorunludur.",
          },
        ],
      });
    }

    const created = await Booking.create({
      ...data,
      date: toUtcMidnight(data.date),
      cancelReason: needsCancelReason(status) ? data.cancelReason : null,
    });

    // Ziyaret tipi tarihe göre belirlenir; geçmiş bir randevu sonradan
    // girilebildiği için danışanın tüm randevuları yeniden değerlendirilir.
    await recalcVisitTypes(created.patient);
    res.status(201).json(await populatePatient(created._id));
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    console.error("Booking POST error:", err);
    res.status(500).json({ message: "Server error", detail: err.message });
  }
});

// POST /api/admin/bookings/:id/complete
// Randevuyu tek işlemde sonuçlandırır: durum + ücret + (varsa) tahsilat.
router.post("/:id/complete", async (req, res) => {
  try {
    const data = completeSchema.parse(req.body);
    const booking = await Booking.findById(req.params.id);
    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    const fromPackage = Boolean(data.patientPackage);
    booking.status = data.status;
    booking.cancelReason = needsCancelReason(data.status)
      ? data.cancelReason
      : null;

    if (data.status === "geldi") {
      booking.patientPackage = data.patientPackage ?? null;
      // Paketten düşen seansın parası paket satışında tahsil edildi.
      booking.fee = fromPackage ? 0 : (data.fee ?? 0);
    } else {
      booking.patientPackage = null;
      booking.fee = 0;
      await Payment.deleteMany({ booking: booking._id });
    }
    await booking.save();

    if (data.status === "geldi" && data.payment && !fromPackage) {
      await Payment.create({
        patient: booking.patient,
        source: "booking",
        booking: booking._id,
        amount: data.payment.amount,
        method: data.payment.method,
        documentNumber: data.payment.documentNumber ?? "",
        date: booking.date,
      });
    }

    await recalcVisitTypes(booking.patient);
    res.json(await populatePatient(booking._id));
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/admin/bookings/:id
router.put("/:id", async (req, res) => {
  try {
    const data = bookingSchema.partial().parse(req.body);
    if (data.date) data.date = toUtcMidnight(data.date);

    const existing = await Booking.findById(req.params.id);
    if (!existing)
      return res.status(404).json({ message: "Booking not found" });

    const resultingStatus = data.status ?? existing.status;
    const resultingReason =
      data.cancelReason !== undefined ? data.cancelReason : existing.cancelReason;

    if (needsCancelReason(resultingStatus) && !resultingReason) {
      return res.status(400).json({
        message: "Validation error",
        errors: [
          {
            path: ["cancelReason"],
            message: "İptal veya gelmeme durumunda neden zorunludur.",
          },
        ],
      });
    }
    // Durum artık iptal/gelmedi değilse eski nedeni temizle.
    if (!needsCancelReason(resultingStatus)) data.cancelReason = null;

    // "geldi"den çıkılıyorsa bağlı tahsilat sessizce silinmemeli.
    if (existing.status === "geldi" && resultingStatus !== "geldi") {
      const paymentCount = await Payment.countDocuments({
        booking: existing._id,
      });
      if (paymentCount > 0 && req.query.force !== "true") {
        return res.status(409).json({
          message:
            "Bu randevuya bağlı tahsilat var. Durumu değiştirirsen tahsilat da silinir.",
          paymentCount,
        });
      }
      await Payment.deleteMany({ booking: existing._id });
      data.fee = 0;
      data.patientPackage = null;
    }

    const booking = await Booking.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });

    // Tarih veya durum değişmiş olabilir; ziyaret tipleri yeniden hesaplanır.
    await recalcVisitTypes(booking.patient);
    res.json(await populatePatient(booking._id));
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/admin/bookings/:id
router.delete("/:id", async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking)
      return res.status(404).json({ message: "Booking not found" });
    // Öksüz gelir kaydı bırakma: randevu gidince tahsilatı da gider.
    await Payment.deleteMany({ booking: booking._id });
    await recalcVisitTypes(booking.patient);
    res.json({ message: "Booking deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
