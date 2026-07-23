const express = require("express");
const { z } = require("zod");
const Appointment = require("../../models/Appointment");
const { protect } = require("../../middleware/auth");

const router = express.Router();
router.use(protect);

const appointmentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(1),
  amount: z.number().min(0),
  date: z.string().min(1),
  note: z.string().optional(),
});

// Build a { date: { $gte, $lte } } filter from ?from&to query params
function buildDateFilter(query) {
  const filter = {};
  if (query.from || query.to) {
    filter.date = {};
    if (query.from) filter.date.$gte = new Date(query.from);
    if (query.to) filter.date.$lte = new Date(query.to);
  }
  return filter;
}

// GET /api/admin/appointments?from=&to=
router.get("/", async (req, res) => {
  try {
    const filter = buildDateFilter(req.query);
    const appointments = await Appointment.find(filter).sort({ date: -1 });
    const total = appointments.reduce((sum, a) => sum + a.amount, 0);
    res.json({ appointments, total, count: appointments.length });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/admin/appointments
router.post("/", async (req, res) => {
  try {
    const data = appointmentSchema.parse(req.body);
    const appointment = await Appointment.create({
      ...data,
      date: new Date(data.date),
    });
    res.status(201).json(appointment);
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    console.error("Appointment POST error:", err);
    res.status(500).json({ message: "Server error", detail: err.message });
  }
});

// PUT /api/admin/appointments/:id
router.put("/:id", async (req, res) => {
  try {
    const data = appointmentSchema.partial().parse(req.body);
    if (data.date) data.date = new Date(data.date);
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true },
    );
    if (!appointment)
      return res.status(404).json({ message: "Appointment not found" });
    res.json(appointment);
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/admin/appointments/:id
router.delete("/:id", async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment)
      return res.status(404).json({ message: "Appointment not found" });
    res.json({ message: "Appointment deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
