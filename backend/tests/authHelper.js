const jwt = require("jsonwebtoken");

function makeToken() {
  return jwt.sign({ id: "test-admin-id" }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
}

module.exports = { makeToken };
