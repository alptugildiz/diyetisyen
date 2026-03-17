const express = require("express");
const { z } = require("zod");
const Faq = require("../../models/Faq");
const { protect } = require("../../middleware/auth");

const router = express.Router();
router.use(protect);

const faqSchema = z.object({
  question: z.string().min(5),
  answer: z.string().min(5),
  order: z.number().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/admin/faqs  (all, including inactive)
router.get("/", async (_req, res) => {
  try {
    const faqs = await Faq.find().sort({ order: 1 });
    res.json(faqs);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/admin/faqs
router.post("/", async (req, res) => {
  try {
    const data = faqSchema.parse(req.body);
    const faq = await Faq.create(data);
    res.status(201).json(faq);
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    console.error("FAQ POST error:", err);
    res.status(500).json({ message: "Server error", detail: err.message });
  }
});

// PUT /api/admin/faqs/:id
router.put("/:id", async (req, res) => {
  try {
    const data = faqSchema.partial().parse(req.body);
    const faq = await Faq.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!faq) return res.status(404).json({ message: "FAQ not found" });
    res.json(faq);
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/admin/faqs/:id
router.delete("/:id", async (req, res) => {
  try {
    const faq = await Faq.findByIdAndDelete(req.params.id);
    if (!faq) return res.status(404).json({ message: "FAQ not found" });
    res.json({ message: "FAQ deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
