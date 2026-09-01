const express = require("express");
const { z } = require("zod");
const Payment = require("../../models/Payment");
const { protect } = require("../../middleware/auth");
const { toUtcMidnight, buildDateFilter } = require("../../lib/dateRange");

const router = express.Router();
router.use(protect);

// source ile referans alanı birbirini tutmak zorunda: booking XOR package.
const paymentSchema = z
  .object({
    patient: z.string().min(1),
    source: z.enum(["booking", "package"]),
    booking: z.string().nullable().optional(),
    patientPackage: z.string().nullable().optional(),
    amount: z.number().min(0),
    method: z.enum(["nakit", "kart", "havale"]),
    date: z.string().min(1),
    documentNumber: z.string().optional(),
    note: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.source === "booking") {
      if (data.patientPackage) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["patientPackage"],
          message: "Randevu tahsilatı pakete bağlanamaz.",
        });
      }
      if (!data.booking) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["booking"],
          message: "Randevu tahsilatı için randevu seçilmelidir.",
        });
      }
    }
    if (data.source === "package") {
      if (data.booking) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["booking"],
          message: "Paket tahsilatı randevuya bağlanamaz.",
        });
      }
      if (!data.patientPackage) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["patientPackage"],
          message: "Paket tahsilatı için paket seçilmelidir.",
        });
      }
    }
  });

router.get("/", async (req, res) => {
  try {
    const filter = buildDateFilter(req.query);
    if (req.query.patient) filter.patient = req.query.patient;
    const payments = await Payment.find(filter)
      .populate("patient", "firstName lastName phone")
      .populate("patientPackage", "name sessionCount price")
      .populate("booking", "date time")
      .sort({ date: -1, createdAt: -1 });
    const total = payments.reduce((sum, p) => sum + p.amount, 0);
    res.json({ payments, total, count: payments.length });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = paymentSchema.parse(req.body);
    const payment = await Payment.create({
      ...data,
      date: toUtcMidnight(data.date),
    });
    res.status(201).json(payment);
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    res.status(500).json({ message: "Server error" });
  }
});

// Kısmi güncelleme yok: source ile referans alanı arasındaki değişmez
// ancak gövdenin tamamı elde varken doğrulanabilir.
router.put("/:id", async (req, res) => {
  try {
    const data = paymentSchema.parse({ ...req.body });
    data.date = toUtcMidnight(data.date);
    const payment = await Payment.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    res.json(payment);
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    res.json({ message: "Payment deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
