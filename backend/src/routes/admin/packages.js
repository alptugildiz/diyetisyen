const express = require("express");
const { z } = require("zod");
const Package = require("../../models/Package");
const { protect } = require("../../middleware/auth");

const router = express.Router();
router.use(protect);

const packageSchema = z.object({
  name: z.string().min(1),
  sessionCount: z.number().int().min(1),
  price: z.number().min(0),
  isActive: z.boolean().optional(),
  order: z.number().optional(),
});

router.get("/", async (req, res) => {
  try {
    const filter = req.query.activeOnly === "true" ? { isActive: true } : {};
    const packages = await Package.find(filter).sort({ order: 1, name: 1 });
    res.json(packages);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = packageSchema.parse(req.body);
    res.status(201).json(await Package.create(data));
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
    const data = packageSchema.partial().parse(req.body);
    const pkg = await Package.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!pkg) return res.status(404).json({ message: "Package not found" });
    res.json(pkg);
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
    const pkg = await Package.findByIdAndDelete(req.params.id);
    if (!pkg) return res.status(404).json({ message: "Package not found" });
    res.json({ message: "Package deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
