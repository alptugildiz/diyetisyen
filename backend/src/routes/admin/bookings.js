const express = require("express");
const { z } = require("zod");
const Booking = require("../../models/Booking");
const Appointment = require("../../models/Appointment");
const Patient = require("../../models/Patient");
const { protect } = require("../../middleware/auth");
const { buildDateFilter, toUtcMidnight } = require("../../lib/dateRange");

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
  completionPayment: z
    .object({
      amount: z.number().min(0),
      paymentMethod: z.enum(["nakit", "kart"]),
      documentNumber: z.string().optional(),
    })
    .optional(),
});

function needsCancelReason(status) {
  return status === "iptal" || status === "gelmedi";
}

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

    // Ziyaret tipi her zaman sunucuda hesaplanır: hastanın bu klinikteki
    // ilk kaydıysa "ilk_gorusme", aksi halde "kontrol".
    const priorCount = await Booking.countDocuments({ patient: data.patient });
    const visitType = priorCount === 0 ? "ilk_gorusme" : "kontrol";

    const created = await Booking.create({
      ...data,
      date: toUtcMidnight(data.date),
      cancelReason: needsCancelReason(status) ? data.cancelReason : null,
      visitType,
    });
    const booking = await created.populate(
      "patient",
      "firstName lastName phone",
    );
    res.status(201).json(booking);
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    console.error("Booking POST error:", err);
    res.status(500).json({ message: "Server error", detail: err.message });
  }
});

// PUT /api/admin/bookings/:id
router.put("/:id", async (req, res) => {
  try {
    const data = bookingSchema.partial().parse(req.body);
    const completionPayment = data.completionPayment;
    delete data.completionPayment;
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

    const booking = await Booking.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    }).populate("patient", "firstName lastName phone");

    if (resultingStatus === "geldi" && completionPayment) {
      const patient = await Patient.findById(booking.patient._id);
      await Appointment.findOneAndUpdate(
        { booking: booking._id },
        {
          booking: booking._id,
          patient: booking.patient._id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          phone: patient.phone,
          amount: completionPayment.amount,
          paymentMethod: completionPayment.paymentMethod,
          documentNumber: completionPayment.documentNumber ?? "",
          date: booking.date,
          note: booking.note,
        },
        { upsert: true, new: true, runValidators: true },
      );
    }
    res.json(booking);
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
    res.json({ message: "Booking deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
