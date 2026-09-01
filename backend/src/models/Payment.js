const mongoose = require("mongoose");

// Tek gelir defteri. İstatistiklerdeki her gelir rakamı buradan çıkar.
//
// Booking.fee TAHAKKUK'tur ("bu seansın ücreti 1.500 ₺"), Payment
// TAHSİLAT ("bu parayı 2 Eylül'de aldım"). İkisinin farkı alacaktır.
// Aylık gelir, o ay tarihli Payment kayıtlarının toplamıdır (kasa esası).
const paymentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    source: { type: String, enum: ["booking", "package"], required: true },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
      index: true,
    },
    patientPackage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PatientPackage",
      default: null,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ["nakit", "kart", "havale"],
      required: true,
    },
    date: { type: Date, required: true, index: true },
    documentNumber: { type: String, default: "", trim: true },
    note: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Payment", paymentSchema);
