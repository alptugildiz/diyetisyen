const mongoose = require("mongoose");

// Public sitedeki randevu formundan gelen talep. Telegram bildirimi
// devam ediyor; bu kayıt talebin panelde de görünmesini sağlıyor.
const appointmentRequestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["yeni", "donusturuldu", "yoksayildi"],
      default: "yeni",
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AppointmentRequest", appointmentRequestSchema);
