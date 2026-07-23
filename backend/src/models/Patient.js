const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    note: { type: String, default: "", trim: true }, // genel/kalıcı not
  },
  { timestamps: true },
);

module.exports = mongoose.model("Patient", patientSchema);
