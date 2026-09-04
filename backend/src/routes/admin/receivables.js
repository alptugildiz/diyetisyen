const express = require("express");
const Patient = require("../../models/Patient");
const { protect } = require("../../middleware/auth");
const { computeReceivables } = require("../../lib/receivables");

const router = express.Router();
router.use(protect);

// GET /api/admin/receivables
// Danışan bazlı bekleyen alacak. İstatistik ve Bugün ekranlarındaki
// toplamla aynı hesaplayıcıyı kullanır — ekranlar arasında tutarsızlık
// olmasın. Dönem filtresi yok: alacak tüm zamanların birikimi.
router.get("/", async (req, res) => {
  try {
    const { total, byPatient } = await computeReceivables();

    const entries = [...byPatient.entries()]
      .filter(([, debt]) => debt > 0)
      .sort((a, b) => b[1] - a[1]);

    const patients = await Patient.find({
      _id: { $in: entries.map(([id]) => id) },
    }).select("firstName lastName phone");
    const byId = new Map(patients.map((p) => [String(p._id), p]));

    const rows = entries
      .map(([id, debt]) => {
        const patient = byId.get(id);
        if (!patient) return null;
        return { patient, debt };
      })
      .filter(Boolean);

    res.json({ total, rows });
  } catch (err) {
    console.error("Receivables error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
