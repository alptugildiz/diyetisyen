const express = require("express");
const { z } = require("zod");
const rateLimit = require("express-rate-limit");
const AppointmentRequest = require("../models/AppointmentRequest");

const router = express.Router();

const appointmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Çok fazla istek gönderildi, lütfen daha sonra tekrar deneyin." },
});

const appointmentSchema = z.object({
  name: z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır."),
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
  phone: z.string().min(10, "Geçerli bir telefon numarası giriniz."),
});

// POST /api/appointment
router.post("/", appointmentLimiter, async (req, res) => {
  try {
    const data = appointmentSchema.parse(req.body);

    // Önce kaydet: Telegram düşerse bile talep kaybolmasın. Panel bu
    // kaydı "Talepler" ekranında gösterir.
    await AppointmentRequest.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
    });

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      console.error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set");
      return res.json({ success: true });
    }

    const message =
      `📋 *Yeni Randevu Talebi*\n\n` +
      `👤 *Ad Soyad:* ${data.name}\n` +
      `📧 *E-posta:* ${data.email}\n` +
      `📞 *Telefon:* ${data.phone}\n\n` +
      `📅 *Tarih:* ${new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}`;

    // Bildirim en iyi çabadır; başarısızlığı kullanıcıya hata olarak
    // dönmüyoruz, çünkü talep zaten kaydedildi.
    try {
      const telegramRes = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: "Markdown",
          }),
        },
      );
      if (!telegramRes.ok) {
        console.error(
          "Telegram API error:",
          await telegramRes.json().catch(() => ({})),
        );
      }
    } catch (telegramErr) {
      console.error("Telegram request failed:", telegramErr.message);
    }

    res.json({ success: true });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ message: err.errors[0].message });
    }
    console.error("Appointment error:", err);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

module.exports = router;
