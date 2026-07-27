const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      unique: true,
      sparse: true,
    },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    amount: { type: Number, required: true, min: 0 }, // alınan ücret (TL)
    paymentMethod: {
      type: String,
      enum: ["nakit", "kart"],
      default: null,
    },
    documentNumber: { type: String, default: "", trim: true },
    date: { type: Date, required: true, index: true }, // randevu tarihi
    note: { type: String, default: "", trim: true }, // opsiyonel serbest metin
  },
  { timestamps: true },
);

module.exports = mongoose.model("Appointment", appointmentSchema);
