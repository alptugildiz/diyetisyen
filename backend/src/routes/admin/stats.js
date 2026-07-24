const express = require("express");
const Appointment = require("../../models/Appointment");
const Booking = require("../../models/Booking");
const Patient = require("../../models/Patient");
const { protect } = require("../../middleware/auth");

const router = express.Router();
router.use(protect);

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
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

// Build a { date: { $gte, $lte } } match from ?from&to query params
function buildMatch(query) {
  const match = {};
  if (query.from || query.to) {
    match.date = {};
    if (query.from) match.date.$gte = new Date(query.from);
    if (query.to) match.date.$lte = new Date(query.to);
  }
  return match;
}

function pct(cur, old) {
  return old > 0 ? Math.round(((cur - old) / old) * 100) : null;
}

async function summarize(match) {
  const res = await Appointment.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        revenue: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);
  return { revenue: res[0]?.revenue ?? 0, count: res[0]?.count ?? 0 };
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
    const match = buildMatch(req.query);
    const fromDate = match.date?.$gte ?? null;
    const toDate = match.date?.$lte ?? null;

    const [
      current,
      monthlyRaw,
      weekdayRaw,
      perPhone,
      topRaw,
      currentBookings,
      retention,
      sourceMix,
      cancelReasons,
    ] = await Promise.all([
      summarize(match),
      Appointment.aggregate([
        { $match: match },
        {
          $group: {
            _id: { y: { $year: "$date" }, m: { $month: "$date" } },
            revenue: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.y": 1, "_id.m": 1 } },
      ]),
      Appointment.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dayOfWeek: "$date" }, // 1=Sun … 7=Sat
            count: { $sum: 1 },
            revenue: { $sum: "$amount" },
          },
        },
      ]),
      Appointment.aggregate([
        { $match: match },
        { $group: { _id: "$phone", count: { $sum: 1 } } },
      ]),
      Appointment.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$phone",
            revenue: { $sum: "$amount" },
            visits: { $sum: 1 },
            firstName: { $last: "$firstName" },
            lastName: { $last: "$lastName" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 6 },
      ]),
      summarizeBookings(match),
      retentionStats(match),
      sourceBreakdown(match),
      cancelReasonBreakdown(match),
    ]);

    const totalRevenue = current.revenue;
    const totalAppointments = current.count;

    const returningPatients = perPhone.filter((p) => p.count > 1).length;
    const newPatients = perPhone.filter((p) => p.count === 1).length;
    const uniquePatients = perPhone.length;

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
        summarize(prevMatch),
        summarizeBookings(prevMatch),
      ]);
      revenueChangePct = pct(totalRevenue, prev.revenue);
      appointmentsChangePct = pct(totalAppointments, prev.count);
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

    const monthly = monthlyRaw.map((m) => ({
      month: `${m._id.y}-${String(m._id.m).padStart(2, "0")}`,
      revenue: m.revenue,
      count: m.count,
    }));

    // Weekday distribution, Monday-first
    const weekday = WEEKDAYS.map((day, i) => {
      const dow = i === 6 ? 1 : i + 2; // Mon(idx0)→2 … Sat(idx5)→7, Sun(idx6)→1
      const row = weekdayRaw.find((w) => w._id === dow);
      return { day, count: row?.count ?? 0, revenue: row?.revenue ?? 0 };
    });

    const topPatients = topRaw.map((p) => ({
      name: `${p.firstName} ${p.lastName}`,
      phone: p._id,
      revenue: p.revenue,
      visits: p.visits,
    }));

    res.json({
      totalRevenue,
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
