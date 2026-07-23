const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    amount: { type: Number, required: true, min: 0 }, // alınan ücret (TL)
    date: { type: Date, required: true, index: true }, // randevu tarihi
    note: { type: String, default: "", trim: true }, // opsiyonel serbest metin
  },
  { timestamps: true },
);

module.exports = mongoose.model("Appointment", appointmentSchema);
