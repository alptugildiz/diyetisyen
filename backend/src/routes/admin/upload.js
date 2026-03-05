const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const { protect } = require("../../middleware/auth");

const router = express.Router();
router.use(protect);

const uploadDir = path.join(__dirname, "../../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Memory storage — sharp işlemi bittikten sonra diske yazar
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB ham limit (WebP sonrası küçülür)
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Sadece resim dosyası yüklenebilir"));
  },
});

// POST /api/admin/upload
router.post("/", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Dosya bulunamadı" });

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
  const outputPath = path.join(uploadDir, filename);

  try {
    await sharp(req.file.buffer)
      .resize({ width: 1200, withoutEnlargement: true }) // max 1200px genişlik
      .webp({ quality: 82 })
      .toFile(outputPath);

    res.json({ url: `/uploads/${filename}` });
  } catch {
    res.status(500).json({ message: "Görsel işlenemedi" });
  }
});

module.exports = router;
