const express = require("express");
const { z } = require("zod");
const AppointmentRequest = require("../../models/AppointmentRequest");
const Patient = require("../../models/Patient");
const Booking = require("../../models/Booking");
const { protect } = require("../../middleware/auth");
const { toUtcMidnight } = require("../../lib/dateRange");
const { recalcVisitTypes } = require("../../lib/visitType");

const router = express.Router();
router.use(protect);

const PHONE_RE = /^0\(5\d{2}\)\d{3} \d{2} \d{2}$/;

const convertSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().regex(PHONE_RE, "Geçersiz telefon formatı"),
  source: z.string().optional().nullable(),
  note: z.string().optional(),
  booking: z
    .object({ date: z.string().min(1), time: z.string().optional() })
    .optional(),
});

// Yeni talepler her zaman üstte; içinde tarihe göre yeniden eskiye.
// Mongo'da status'e göre sıralamak alfabetik olurdu ("donusturuldu" <
// "yeni"), o yüzden sırayı açıkça tanımlıyoruz.
const STATUS_RANK = { yeni: 0, donusturuldu: 1, yoksayildi: 2 };

router.get("/", async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const requests = await AppointmentRequest.find(filter)
      .populate("patient", "firstName lastName")
      .sort({ createdAt: -1 });
    requests.sort(
      (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status],
    );
    res.json(requests);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/:id/convert", async (req, res) => {
  try {
    const data = convertSchema.parse(req.body);
    const reqDoc = await AppointmentRequest.findById(req.params.id);
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });

    const patient = await Patient.create({
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      source: data.source ?? "web_sitesi",
      note: data.note ?? "",
    });

    let booking = null;
    if (data.booking) {
      booking = await Booking.create({
        patient: patient._id,
        date: toUtcMidnight(data.booking.date),
        time: data.booking.time ?? "",
        status: "planlandi",
      });
      await recalcVisitTypes(patient._id);
      booking = await Booking.findById(booking._id);
    }

    reqDoc.status = "donusturuldu";
    reqDoc.patient = patient._id;
    await reqDoc.save();

    res.status(201).json({ request: reqDoc, patient, booking });
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
    const { status } = z
      .object({ status: z.enum(["yeni", "donusturuldu", "yoksayildi"]) })
      .parse(req.body);
    const reqDoc = await AppointmentRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true },
    );
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });
    res.json(reqDoc);
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
