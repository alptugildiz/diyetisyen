const mongoose = require("mongoose");

// Danışana satılmış paket. name/sessionCount/price alanları satış anında
// katalogdan kopyalanır (snapshot) — katalog sonradan değişse de geçmiş
// satışın bedeli sabit kalır. Kalan seans ve kalan borç saklanmaz,
// Booking ve Payment kayıtlarından hesaplanır (bkz. lib/packageTotals.js).
const patientPackageSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    package: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },
    name: { type: String, required: true, trim: true },
    sessionCount: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    soldAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["aktif", "tamamlandi", "iptal"],
      default: "aktif",
    },
    note: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PatientPackage", patientPackageSchema);
