const express = require("express");
const Appointment = require("../../models/Appointment");
const { protect } = require("../../middleware/auth");

const router = express.Router();
router.use(protect);

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

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

// GET /api/admin/stats?from=&to=
router.get("/", async (req, res) => {
  try {
    const match = buildMatch(req.query);
    const fromDate = match.date?.$gte ?? null;
    const toDate = match.date?.$lte ?? null;

    const [current, monthlyRaw, weekdayRaw, perPhone, topRaw] =
      await Promise.all([
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
      ]);

    const totalRevenue = current.revenue;
    const totalAppointments = current.count;

    // New vs returning within the selected period:
    // returning = patients with more than one completed appointment in the
    // period; new = patients with exactly one. (new + returning = unique)
    const returningPatients = perPhone.filter((p) => p.count > 1).length;
    const newPatients = perPhone.filter((p) => p.count === 1).length;
    const uniquePatients = perPhone.length;

    const avgPerAppointment = totalAppointments
      ? Math.round(totalRevenue / totalAppointments)
      : 0;
    const avgPerPatient = uniquePatients
      ? Math.round(totalRevenue / uniquePatients)
      : 0;

    // Trend vs previous equal-length window (only when a range is set)
    let revenueChangePct = null;
    let appointmentsChangePct = null;
    if (fromDate && toDate) {
      const len = toDate.getTime() - fromDate.getTime();
      const prev = await summarize({
        date: { $gte: new Date(fromDate.getTime() - len), $lt: fromDate },
      });
      const pct = (cur, old) =>
        old > 0 ? Math.round(((cur - old) / old) * 100) : null;
      revenueChangePct = pct(totalRevenue, prev.revenue);
      appointmentsChangePct = pct(totalAppointments, prev.count);
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
    });
  } catch (err) {
    console.error("Stats GET error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
