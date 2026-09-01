const express = require("express");
const Payment = require("../../models/Payment");
const PatientPackage = require("../../models/PatientPackage");
const Booking = require("../../models/Booking");
const Patient = require("../../models/Patient");
const Expense = require("../../models/Expense");
const { protect } = require("../../middleware/auth");
const { buildDateFilter } = require("../../lib/dateRange");

const router = express.Router();
router.use(protect);

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const PAYMENT_METHODS = ["nakit", "kart", "havale"];
const SOURCES = [
  "instagram",
  "google",
  "dis_hekimi",
  "danisan_tavsiyesi",
  "web_sitesi",
  "klinik_ici",
  "diger",
  "belirtilmemis",
];
const CANCEL_REASONS = [
  "tarih_uygun_degil",
  "ucret",
  "unuttu",
  "saglik_problemi",
  "iletisim_kurulamadi",
  "baska_hizmet",
  "belirtilmedi",
];
const PROCESS_STATUSES = ["aktif", "tamamladi", "birakti"];

function pct(cur, old) {
  return old > 0 ? Math.round(((cur - old) / old) * 100) : null;
}

// Gelir kasa esaslıdır: dönemin geliri, o dönemde tarihi olan
// tahsilatların toplamıdır. Paket bedeli satış anında yazılır.
async function summarizePayments(match) {
  const res = await Payment.aggregate([
    { $match: match },
    { $group: { _id: "$source", total: { $sum: "$amount" } } },
  ]);
  const sessionRevenue = res.find((r) => r._id === "booking")?.total ?? 0;
  const packageRevenue = res.find((r) => r._id === "package")?.total ?? 0;
  return {
    revenue: sessionRevenue + packageRevenue,
    sessionRevenue,
    packageRevenue,
  };
}

async function summarizeBookings(match) {
  const res = await Booking.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ["$status", "geldi"] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ["$status", "iptal"] }, 1, 0] } },
        noShow: { $sum: { $cond: [{ $eq: ["$status", "gelmedi"] }, 1, 0] } },
        newPatients: {
          $sum: { $cond: [{ $eq: ["$visitType", "ilk_gorusme"] }, 1, 0] },
        },
        followUps: {
          $sum: { $cond: [{ $eq: ["$visitType", "kontrol"] }, 1, 0] },
        },
      },
    },
  ]);
  const r = res[0] ?? {};
  return {
    totalBookings: r.totalBookings ?? 0,
    completed: r.completed ?? 0,
    cancelled: r.cancelled ?? 0,
    noShow: r.noShow ?? 0,
    newPatients: r.newPatients ?? 0,
    followUps: r.followUps ?? 0,
  };
}

// Alacak = tahakkuk − tahsilat. İki kaynaktan gelir:
// (1) "geldi" işaretli ama tahsilatı eksik randevular,
// (2) bedeli tam ödenmemiş paket satışları.
// Aynı tanım /api/admin/today içinde de kullanılır — iki ekran farklı
// rakam göstermemeli.
async function computeReceivables(query) {
  const byPatient = new Map();
  let total = 0;

  const add = (patientId, debt) => {
    if (debt <= 0) return;
    total += debt;
    const key = String(patientId);
    byPatient.set(key, (byPatient.get(key) ?? 0) + debt);
  };

  const completed = await Booking.find({
    ...buildDateFilter(query),
    status: "geldi",
    fee: { $gt: 0 },
  }).select("_id fee patient");

  const bookingPaid = await Payment.aggregate([
    { $match: { booking: { $in: completed.map((b) => b._id) } } },
    { $group: { _id: "$booking", paid: { $sum: "$amount" } } },
  ]);
  const paidByBooking = new Map(
    bookingPaid.map((row) => [String(row._id), row.paid]),
  );
  for (const b of completed) {
    add(b.patient, b.fee - (paidByBooking.get(String(b._id)) ?? 0));
  }

  const sales = await PatientPackage.find({
    ...buildDateFilter(query, "soldAt"),
    status: { $ne: "iptal" },
  }).select("_id price patient");

  const packagePaid = await Payment.aggregate([
    { $match: { patientPackage: { $in: sales.map((s) => s._id) } } },
    { $group: { _id: "$patientPackage", paid: { $sum: "$amount" } } },
  ]);
  const paidByPackage = new Map(
    packagePaid.map((row) => [String(row._id), row.paid]),
  );
  for (const s of sales) {
    add(s.patient, s.price - (paidByPackage.get(String(s._id)) ?? 0));
  }

  return { total, byPatient };
}

// Retention metrics for the cohort of patients whose first-ever visit
// (visitType=ilk_gorusme) falls inside the selected period.
async function retentionStats(match) {
  const firstVisits = await Booking.find({
    ...match,
    visitType: "ilk_gorusme",
  }).select("patient");
  const patientIds = firstVisits.map((b) => b.patient);

  if (patientIds.length === 0) {
    return {
      firstToSecondRate: null,
      avgFollowUpCount: 0,
      avgFollowUpSpanDays: 0,
      processStatusBreakdown: PROCESS_STATUSES.map((status) => ({
        status,
        count: 0,
      })),
    };
  }

  const perPatient = await Booking.aggregate([
    { $match: { patient: { $in: patientIds } } },
    {
      $group: {
        _id: "$patient",
        total: { $sum: 1 },
        completedCount: {
          $sum: { $cond: [{ $eq: ["$status", "geldi"] }, 1, 0] },
        },
        firstDate: { $min: "$date" },
        lastDate: { $max: "$date" },
      },
    },
  ]);

  const withSecondVisit = perPatient.filter((p) => p.total > 1).length;
  const firstToSecondRate = Math.round(
    (withSecondVisit / patientIds.length) * 100,
  );

  const avgFollowUpCount =
    Math.round(
      (perPatient.reduce((sum, p) => sum + p.completedCount, 0) /
        perPatient.length) *
        10,
    ) / 10;

  const spans = perPatient
    .filter((p) => p.total > 1)
    .map((p) => (p.lastDate - p.firstDate) / (1000 * 60 * 60 * 24));
  const avgFollowUpSpanDays = spans.length
    ? Math.round(spans.reduce((a, b) => a + b, 0) / spans.length)
    : 0;

  const processStatusRaw = await Patient.aggregate([
    { $match: { _id: { $in: patientIds } } },
    { $group: { _id: "$processStatus", count: { $sum: 1 } } },
  ]);
  const processStatusBreakdown = PROCESS_STATUSES.map((status) => ({
    status,
    count: processStatusRaw.find((r) => r._id === status)?.count ?? 0,
  }));

  return {
    firstToSecondRate,
    avgFollowUpCount,
    avgFollowUpSpanDays,
    processStatusBreakdown,
  };
}

// New-patient source mix for the same first-visit cohort as retentionStats.
async function sourceBreakdown(match) {
  const patientIds = await Booking.distinct("patient", {
    ...match,
    visitType: "ilk_gorusme",
  });
  const raw = await Patient.aggregate([
    { $match: { _id: { $in: patientIds } } },
    {
      $group: {
        _id: { $ifNull: ["$source", "belirtilmemis"] },
        count: { $sum: 1 },
      },
    },
  ]);
  return SOURCES.map((source) => ({
    source,
    count: raw.find((r) => r._id === source)?.count ?? 0,
  }));
}

async function cancelReasonBreakdown(match) {
  const raw = await Booking.aggregate([
    { $match: { ...match, status: { $in: ["iptal", "gelmedi"] } } },
    { $group: { _id: "$cancelReason", count: { $sum: 1 } } },
  ]);
  return CANCEL_REASONS.map((reason) => ({
    reason,
    count: raw.find((r) => r._id === reason)?.count ?? 0,
  }));
}

// GET /api/admin/stats?from=&to=
router.get("/", async (req, res) => {
  try {
    const match = buildDateFilter(req.query);
    const fromDate = match.date?.$gte ?? null;
    const toDate = match.date?.$lte ?? null;
    const completedMatch = { ...match, status: "geldi" };

    const [
      current,
      revenueByMonth,
      countByMonth,
      revenueByWeekday,
      countByWeekday,
      perPatientVisits,
      revenueByPatient,
      currentBookings,
      retention,
      sourceMix,
      cancelReasons,
      expenseSummary,
      methodSummary,
      receivables,
    ] = await Promise.all([
      summarizePayments(match),
      Payment.aggregate([
        { $match: match },
        {
          $group: {
            _id: { y: { $year: "$date" }, m: { $month: "$date" } },
            revenue: { $sum: "$amount" },
          },
        },
      ]),
      Booking.aggregate([
        { $match: completedMatch },
        {
          $group: {
            _id: { y: { $year: "$date" }, m: { $month: "$date" } },
            count: { $sum: 1 },
          },
        },
      ]),
      Payment.aggregate([
        { $match: match },
        { $group: { _id: { $dayOfWeek: "$date" }, revenue: { $sum: "$amount" } } },
      ]),
      Booking.aggregate([
        { $match: completedMatch },
        { $group: { _id: { $dayOfWeek: "$date" }, count: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        { $match: completedMatch },
        { $group: { _id: "$patient", visits: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: match },
        { $group: { _id: "$patient", revenue: { $sum: "$amount" } } },
        { $sort: { revenue: -1 } },
        { $limit: 6 },
      ]),
      summarizeBookings(match),
      retentionStats(match),
      sourceBreakdown(match),
      cancelReasonBreakdown(match),
      Expense.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Payment.aggregate([
        { $match: match },
        { $group: { _id: "$method", total: { $sum: "$amount" } } },
      ]),
      computeReceivables(req.query),
    ]);

    const totalRevenue = current.revenue;
    const totalExpenses = expenseSummary[0]?.total ?? 0;
    const netRevenue = totalRevenue - totalExpenses;

    // "Randevu" sayısı tahsilat sayısı değildir: bir paket ödemesi tek
    // kayıt olduğu halde sekiz seansı karşılayabilir. Tamamlanan randevu
    // sayısını esas alıyoruz.
    const totalAppointments = currentBookings.completed;

    const uniquePatients = perPatientVisits.length;
    const returningPatients = perPatientVisits.filter((p) => p.visits > 1).length;
    const newPatients = perPatientVisits.filter((p) => p.visits === 1).length;

    const avgPerAppointment = totalAppointments
      ? Math.round(totalRevenue / totalAppointments)
      : 0;
    const avgPerPatient = uniquePatients
      ? Math.round(totalRevenue / uniquePatients)
      : 0;

    let revenueChangePct = null;
    let appointmentsChangePct = null;
    let monthlySummary = {
      totalBookings: currentBookings.totalBookings,
      totalBookingsChangePct: null,
      completed: currentBookings.completed,
      completedChangePct: null,
      cancelled: currentBookings.cancelled,
      cancelledChangePct: null,
      noShow: currentBookings.noShow,
      noShowChangePct: null,
      newPatients: currentBookings.newPatients,
      newPatientsChangePct: null,
      followUps: currentBookings.followUps,
      followUpsChangePct: null,
      revenue: totalRevenue,
      revenueChangePct: null,
    };

    // Trend vs previous equal-length window (only when a range is set)
    if (fromDate && toDate) {
      const len = toDate.getTime() - fromDate.getTime();
      const prevMatch = {
        date: { $gte: new Date(fromDate.getTime() - len), $lt: fromDate },
      };
      const [prev, prevBookings] = await Promise.all([
        summarizePayments(prevMatch),
        summarizeBookings(prevMatch),
      ]);
      revenueChangePct = pct(totalRevenue, prev.revenue);
      appointmentsChangePct = pct(totalAppointments, prevBookings.completed);
      monthlySummary = {
        totalBookings: currentBookings.totalBookings,
        totalBookingsChangePct: pct(
          currentBookings.totalBookings,
          prevBookings.totalBookings,
        ),
        completed: currentBookings.completed,
        completedChangePct: pct(
          currentBookings.completed,
          prevBookings.completed,
        ),
        cancelled: currentBookings.cancelled,
        cancelledChangePct: pct(
          currentBookings.cancelled,
          prevBookings.cancelled,
        ),
        noShow: currentBookings.noShow,
        noShowChangePct: pct(currentBookings.noShow, prevBookings.noShow),
        newPatients: currentBookings.newPatients,
        newPatientsChangePct: pct(
          currentBookings.newPatients,
          prevBookings.newPatients,
        ),
        followUps: currentBookings.followUps,
        followUpsChangePct: pct(
          currentBookings.followUps,
          prevBookings.followUps,
        ),
        revenue: totalRevenue,
        revenueChangePct,
      };
    }

    // Gelir ve randevu sayısı ayrı koleksiyonlardan geldiği için ay
    // anahtarları üzerinden birleştiriliyor.
    const monthKey = (row) => `${row._id.y}-${String(row._id.m).padStart(2, "0")}`;
    const months = new Map();
    for (const row of revenueByMonth) {
      months.set(monthKey(row), { revenue: row.revenue, count: 0 });
    }
    for (const row of countByMonth) {
      const key = monthKey(row);
      const entry = months.get(key) ?? { revenue: 0, count: 0 };
      entry.count = row.count;
      months.set(key, entry);
    }
    const monthly = [...months.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, revenue: v.revenue, count: v.count }));

    // Weekday distribution, Monday-first
    const weekday = WEEKDAYS.map((day, i) => {
      const dow = i === 6 ? 1 : i + 2; // Mon(idx0)→2 … Sat(idx5)→7, Sun(idx6)→1
      return {
        day,
        count: countByWeekday.find((w) => w._id === dow)?.count ?? 0,
        revenue: revenueByWeekday.find((w) => w._id === dow)?.revenue ?? 0,
      };
    });

    const visitsByPatient = new Map(
      perPatientVisits.map((p) => [String(p._id), p.visits]),
    );
    const topPatientDocs = await Patient.find({
      _id: { $in: revenueByPatient.map((p) => p._id) },
    }).select("firstName lastName phone");
    const patientById = new Map(
      topPatientDocs.map((p) => [String(p._id), p]),
    );

    const topPatients = revenueByPatient
      .map((row) => {
        const p = patientById.get(String(row._id));
        if (!p) return null;
        return {
          name: `${p.firstName} ${p.lastName}`,
          phone: p.phone,
          revenue: row.revenue,
          visits: visitsByPatient.get(String(row._id)) ?? 0,
        };
      })
      .filter(Boolean);

    const debtorIds = [...receivables.byPatient.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const debtorDocs = await Patient.find({
      _id: { $in: debtorIds.map(([id]) => id) },
    }).select("firstName lastName phone");
    const debtorById = new Map(debtorDocs.map((p) => [String(p._id), p]));
    const topDebtors = debtorIds
      .map(([id, debt]) => {
        const p = debtorById.get(id);
        if (!p) return null;
        return { name: `${p.firstName} ${p.lastName}`, phone: p.phone, debt };
      })
      .filter(Boolean);

    res.json({
      totalRevenue,
      totalExpenses,
      netRevenue,
      sessionRevenue: current.sessionRevenue,
      packageRevenue: current.packageRevenue,
      outstandingReceivables: receivables.total,
      topDebtors,
      paymentBreakdown: PAYMENT_METHODS.map((method) => ({
        method,
        total: methodSummary.find((m) => m._id === method)?.total ?? 0,
      })),
      totalAppointments,
      uniquePatients,
      avgPerAppointment,
      avgPerPatient,
      newPatients,
      returningPatients,
      revenueChangePct,
      appointmentsChangePct,
      monthly,
      weekday,
      topPatients,
      monthlySummary,
      retention,
      sourceBreakdown: sourceMix,
      cancelReasonBreakdown: cancelReasons,
    });
  } catch (err) {
    console.error("Stats GET error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
