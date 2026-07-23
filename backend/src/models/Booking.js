const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    date: { type: Date, required: true, index: true }, // randevu günü (UTC gece yarısı)
    time: { type: String, default: "" }, // "HH:MM"
    status: {
      type: String,
      enum: ["planlandi", "geldi", "gelmedi", "iptal"],
      default: "planlandi",
    },
    note: { type: String, default: "", trim: true }, // randevuya özel not
  },
  { timestamps: true },
);

module.exports = mongoose.model("Booking", bookingSchema);
