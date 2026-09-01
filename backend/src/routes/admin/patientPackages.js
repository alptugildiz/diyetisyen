const express = require("express");
const { z } = require("zod");
const PatientPackage = require("../../models/PatientPackage");
const Payment = require("../../models/Payment");
const Booking = require("../../models/Booking");
const { protect } = require("../../middleware/auth");
const { toUtcMidnight, buildDateFilter } = require("../../lib/dateRange");
const { decoratePatientPackage } = require("../../lib/packageTotals");

const router = express.Router();
router.use(protect);

const saleSchema = z.object({
  patient: z.string().min(1),
  package: z.string().optional().nullable(),
  name: z.string().min(1),
  sessionCount: z.number().int().min(1),
  price: z.number().min(0),
  soldAt: z.string().min(1),
  status: z.enum(["aktif", "tamamlandi", "iptal"]).optional(),
  note: z.string().optional(),
});

router.get("/", async (req, res) => {
  try {
    const filter = buildDateFilter(req.query, "soldAt");
    if (req.query.patient) filter.patient = req.query.patient;
    const sales = await PatientPackage.find(filter)
      .populate("patient", "firstName lastName phone")
      .sort({ soldAt: -1 });
    res.json(await Promise.all(sales.map(decoratePatientPackage)));
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = saleSchema.parse(req.body);
    const sale = await PatientPackage.create({
      ...data,
      soldAt: toUtcMidnight(data.soldAt),
    });
    res.status(201).json(await decoratePatientPackage(sale));
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const data = saleSchema.partial().parse(req.body);
    if (data.soldAt) data.soldAt = toUtcMidnight(data.soldAt);
    const sale = await PatientPackage.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!sale)
      return res.status(404).json({ message: "PatientPackage not found" });
    res.json(await decoratePatientPackage(sale));
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    res.status(500).json({ message: "Server error" });
  }
});

// Paket silinince ona bağlı tahsilatlar da silinir ve seansların paket
// bağı çözülür — öksüz kayıt bırakmıyoruz.
router.delete("/:id", async (req, res) => {
  try {
    const sale = await PatientPackage.findByIdAndDelete(req.params.id);
    if (!sale)
      return res.status(404).json({ message: "PatientPackage not found" });
    await Payment.deleteMany({ patientPackage: sale._id });
    await Booking.updateMany(
      { patientPackage: sale._id },
      { patientPackage: null },
    );
    res.json({ message: "PatientPackage deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
