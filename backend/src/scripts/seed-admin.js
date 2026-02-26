/**
 * Run once to create the initial admin user:
 *   node src/scripts/seed-admin.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Admin = require("../models/Admin");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await Admin.findOne({ email: "admin@diyet.com" });
  if (existing) {
    console.log("Admin already exists");
    process.exit(0);
  }

  await Admin.create({
    email: "admin@diyet.com",
    passwordHash: "Admin1234!", // will be hashed by pre-save hook
    name: "Admin",
  });

  console.log("Admin created: admin@diyet.com / Admin1234!");
  console.log("⚠️  Change this password immediately in production!");
  process.exit(0);
})();
