const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ["vergi", "muhasebe", "bagkur", "diger"],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, index: true },
    note: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Expense", expenseSchema);
