/**
 * Geliştirme için örnek veri üretir. Mevcut koleksiyonları TEMİZLER.
 *
 *   docker compose exec backend node src/scripts/seed-demo.js
 */
const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const Package = require("../models/Package");
const PatientPackage = require("../models/PatientPackage");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Expense = require("../models/Expense");
const AppointmentRequest = require("../models/AppointmentRequest");
const { toUtcMidnight } = require("../lib/dateRange");
const { recalcVisitTypes } = require("../lib/visitType");

const pad = (n) => String(n).padStart(2, "0");
const isoOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  await Promise.all([
    Patient.deleteMany({}),
    Package.deleteMany({}),
    PatientPackage.deleteMany({}),
    Booking.deleteMany({}),
    Payment.deleteMany({}),
    Expense.deleteMany({}),
    AppointmentRequest.deleteMany({}),
  ]);

  const packages = await Package.create([
    { name: "8 Seans Kilo Yönetimi", sessionCount: 8, price: 10000, order: 1 },
    { name: "4 Seans Kontrol", sessionCount: 4, price: 6000, order: 2 },
  ]);

  const people = [
    ["Ayşe", "Yılmaz", "0(532)111 22 33", "instagram"],
    ["Mehmet", "Kaya", "0(533)222 33 44", "google"],
    ["Zeynep", "Ak", "0(534)333 44 55", "danisan_tavsiyesi"],
    ["Elif", "Demir", "0(535)444 55 66", "web_sitesi"],
    ["Burak", "Şahin", "0(536)555 66 77", "klinik_ici"],
  ];

  for (let i = 0; i < people.length; i++) {
    const [firstName, lastName, phone, source] = people[i];
    const patient = await Patient.create({ firstName, lastName, phone, source });

    // Geçmiş bir seans: tamamlanmış ve tahsil edilmiş
    const past = await Booking.create({
      patient: patient._id,
      date: toUtcMidnight(isoOffset(-14)),
      time: "10:00",
      status: "geldi",
      fee: 1500,
    });
    await Payment.create({
      patient: patient._id,
      source: "booking",
      booking: past._id,
      amount: 1500,
      method: "nakit",
      date: past.date,
    });

    // Bugün: hepsi işlenmeyi bekliyor
    await Booking.create({
      patient: patient._id,
      date: toUtcMidnight(isoOffset(0)),
      time: `${pad(9 + (i % 8))}:30`,
      status: "planlandi",
    });

    // Gelecek randevu
    await Booking.create({
      patient: patient._id,
      date: toUtcMidnight(isoOffset(7)),
      time: "14:00",
      status: "planlandi",
    });

    await recalcVisitTypes(patient._id);
  }

  // Taksitli paket satışı: 10.000 ₺'nin 6.000'i tahsil edildi
  const first = await Patient.findOne();
  const sale = await PatientPackage.create({
    patient: first._id,
    package: packages[0]._id,
    name: packages[0].name,
    sessionCount: packages[0].sessionCount,
    price: packages[0].price,
    soldAt: toUtcMidnight(isoOffset(-20)),
  });
  await Payment.create([
    {
      patient: first._id,
      source: "package",
      patientPackage: sale._id,
      amount: 4000,
      method: "havale",
      date: toUtcMidnight(isoOffset(-20)),
    },
    {
      patient: first._id,
      source: "package",
      patientPackage: sale._id,
      amount: 2000,
      method: "nakit",
      date: toUtcMidnight(isoOffset(-5)),
    },
  ]);

  // Tahsil edilmemiş seans: alacak takibini görebilmek için
  const debtor = await Patient.findOne({ firstName: "Mehmet" });
  await Booking.create({
    patient: debtor._id,
    date: toUtcMidnight(isoOffset(-3)),
    time: "16:00",
    status: "geldi",
    fee: 1500,
  });
  await recalcVisitTypes(debtor._id);

  await Expense.create([
    { category: "vergi", amount: 3500, date: toUtcMidnight(isoOffset(-10)) },
    { category: "bagkur", amount: 2800, date: toUtcMidnight(isoOffset(-8)) },
    { category: "muhasebe", amount: 1200, date: toUtcMidnight(isoOffset(-3)) },
  ]);

  await AppointmentRequest.create([
    { name: "Ali Vural", email: "ali@example.com", phone: "05551234567" },
    { name: "Deniz Öz", email: "deniz@example.com", phone: "05559876543" },
  ]);

  console.log("Örnek veri yüklendi.");
  await mongoose.connection.close();
}

seed().catch(async (err) => {
  console.error(err);
  await mongoose.connection.close();
  process.exit(1);
});
