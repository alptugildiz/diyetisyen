// ci: trigger deploy
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/posts");
const faqRoutes = require("./routes/faqs");
const adminPostRoutes = require("./routes/admin/posts");
const adminFaqRoutes = require("./routes/admin/faqs");
const adminUploadRoutes = require("./routes/admin/upload");
const adminAppointmentRoutes = require("./routes/admin/appointments");
const adminStatsRoutes = require("./routes/admin/stats");
const adminPatientRoutes = require("./routes/admin/patients");
const adminBookingRoutes = require("./routes/admin/bookings");
const adminExpenseRoutes = require("./routes/admin/expenses");
const appointmentRoutes = require("./routes/appointment");

const app = express();

// Security
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);

// Rate limiting (disabled in tests — supertest runs far more than 100
// requests per suite against the same in-process app)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
});
app.use("/api", limiter);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Health check
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date() }),
);

// Public routes
app.use("/api/posts", postRoutes);
app.use("/api/faqs", faqRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/appointment", appointmentRoutes);

// Admin (protected) routes
app.use("/api/admin/posts", adminPostRoutes);
app.use("/api/admin/faqs", adminFaqRoutes);
app.use("/api/admin/upload", adminUploadRoutes);
app.use("/api/admin/appointments", adminAppointmentRoutes);
app.use("/api/admin/stats", adminStatsRoutes);
app.use("/api/admin/patients", adminPatientRoutes);
app.use("/api/admin/bookings", adminBookingRoutes);
app.use("/api/admin/expenses", adminExpenseRoutes);

// 404
app.use((_req, res) => res.status(404).json({ message: "Route not found" }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res
    .status(err.status || 500)
    .json({ message: err.message || "Internal server error" });
});

module.exports = app;
