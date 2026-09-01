const express = require("express");
const AppointmentRequest = require("../../models/AppointmentRequest");
const { protect } = require("../../middleware/auth");

const router = express.Router();
router.use(protect);

// Sidebar rozetleri. Her sayfada çağrıldığı için bilinçli olarak ucuz
// tutuluyor: yalnızca sayım, populate yok.
router.get("/", async (_req, res) => {
  try {
    res.json({
      pendingRequests: await AppointmentRequest.countDocuments({
        status: "yeni",
      }),
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
