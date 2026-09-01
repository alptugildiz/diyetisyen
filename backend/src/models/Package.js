const mongoose = require("mongoose");

// Paket katalogu: diyetisyenin bir kez tanımlayıp satışta seçtiği şablonlar.
// Satış anında alanlar PatientPackage'a kopyalanır (snapshot), böylece
// buradaki fiyat değişse de geçmiş satışlar bozulmaz.
const packageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sessionCount: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Package", packageSchema);
