const express = require("express");
const Faq = require("../models/Faq");

const router = express.Router();

// GET /api/faqs
router.get("/", async (_req, res) => {
  try {
    const faqs = await Faq.find({ isActive: true })
      .sort({ order: 1 })
      .select("-__v");
    res.json(faqs);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
