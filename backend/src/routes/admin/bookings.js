const express = require("express");
const { z } = require("zod");
const Booking = require("../../models/Booking");
const { protect } = require("../../middleware/auth");

const router = express.Router();
router.use(protect);

const bookingSchema = z.object({
  patient: z.string().min(1),
  date: z.string().min(1),
  time: z.string().optional(),
  status: z.enum(["planlandi", "geldi", "gelmedi", "iptal"]).optional(),
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
    const created = await Booking.create({
      ...data,
      date: new Date(data.date),
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
    if (data.date) data.date = new Date(data.date);
    const booking = await Booking.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    }).populate("patient", "firstName lastName phone");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
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
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json({ message: "Booking deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
