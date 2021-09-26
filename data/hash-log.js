
const crypto = require("crypto");

module.exports = async function hashLog(file) {
  const hash = crypto.createHash("md5");
  hash.update(file);
  return hash.digest("hex");
};
