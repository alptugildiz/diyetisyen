const express = require("express");
const { z } = require("zod");
const Patient = require("../../models/Patient");
const Booking = require("../../models/Booking");
const { protect } = require("../../middleware/auth");

const router = express.Router();
router.use(protect);

const PHONE_RE = /^0\(5\d{2}\)\d{3} \d{2} \d{2}$/; // 0(5xx)xxx xx xx

const patientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().regex(PHONE_RE, "Geçersiz telefon formatı"),
  note: z.string().optional(),
});

// GET /api/admin/patients?q=
router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.trim();
    const filter = q
      ? {
          $or: [
            { firstName: { $regex: q, $options: "i" } },
            { lastName: { $regex: q, $options: "i" } },
            { phone: { $regex: q, $options: "i" } },
          ],
        }
      : {};
    const patients = await Patient.find(filter).sort({ createdAt: -1 });
    res.json(patients);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/patients/:id  → hasta + randevu geçmişi
router.get("/:id", async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    const bookings = await Booking.find({ patient: patient._id }).sort({
      date: -1,
      time: -1,
    });
    res.json({ patient, bookings });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/admin/patients
router.post("/", async (req, res) => {
  try {
    const data = patientSchema.parse(req.body);
    const patient = await Patient.create(data);
    res.status(201).json(patient);
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    console.error("Patient POST error:", err);
    res.status(500).json({ message: "Server error", detail: err.message });
  }
});

// PUT /api/admin/patients/:id
router.put("/:id", async (req, res) => {
  try {
    const data = patientSchema.partial().parse(req.body);
    const patient = await Patient.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.json(patient);
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/admin/patients/:id  (ilişkili randevuları da siler)
router.delete("/:id", async (req, res) => {
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    await Booking.deleteMany({ patient: patient._id });
    res.json({ message: "Patient deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
