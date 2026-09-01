const express = require("express");
const { z } = require("zod");
const Expense = require("../../models/Expense");
const { protect } = require("../../middleware/auth");
const { buildDateFilter, toUtcMidnight } = require("../../lib/dateRange");

const router = express.Router();
router.use(protect);

const expenseSchema = z.object({
  category: z.enum(["vergi", "muhasebe", "bagkur", "diger"]),
  amount: z.number().min(0),
  date: z.string().min(1),
  note: z.string().optional(),
});

router.get("/", async (req, res) => {
  try {
    const expenses = await Expense.find(buildDateFilter(req.query)).sort({
      date: -1,
    });
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    res.json({ expenses, total, count: expenses.length });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = expenseSchema.parse(req.body);
    const expense = await Expense.create({
      ...data,
      date: toUtcMidnight(data.date),
    });
    res.status(201).json(expense);
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
    const data = expenseSchema.partial().parse(req.body);
    if (data.date) data.date = toUtcMidnight(data.date);
    const expense = await Expense.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!expense)
      return res.status(404).json({ message: "Expense not found" });
    res.json(expense);
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
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense)
      return res.status(404).json({ message: "Expense not found" });
    res.json({ message: "Expense deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
