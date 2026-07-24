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
    // Sunucu tarafında hesaplanır (bkz. routes/admin/bookings.js) — client
    // tarafından gönderilse bile Zod şeması tarafından yok sayılır.
    visitType: {
      type: String,
      enum: ["ilk_gorusme", "kontrol"],
      default: null,
    },
    // Sadece status "iptal" veya "gelmedi" olduğunda anlamlıdır.
    cancelReason: {
      type: String,
      enum: [
        "tarih_uygun_degil",
        "ucret",
        "unuttu",
        "saglik_problemi",
        "iletisim_kurulamadi",
        "baska_hizmet",
        "belirtilmedi",
      ],
      default: null,
    },
    note: { type: String, default: "", trim: true }, // randevuya özel not
  },
  { timestamps: true },
);

module.exports = mongoose.model("Booking", bookingSchema);
