const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    source: {
      type: String,
      enum: [
        "instagram",
        "google",
        "dis_hekimi",
        "danisan_tavsiyesi",
        "web_sitesi",
        "klinik_ici",
        "diger",
      ],
      default: null,
    },
    processStatus: {
      type: String,
      enum: ["aktif", "tamamladi", "birakti"],
      default: "aktif",
    },
    note: { type: String, default: "", trim: true }, // genel/kalıcı not
  },
  { timestamps: true },
);

module.exports = mongoose.model("Patient", patientSchema);
