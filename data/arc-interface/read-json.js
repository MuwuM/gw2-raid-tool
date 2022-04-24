
const fs = require("fs-extra");
const zlib = require("zlib");
const {promisify} = require("util");
const unzip = promisify(zlib.unzip);

module.exports = async function readJSON(file) {
  try {
    if (await fs.pathExists(`${file}z`)) {
      const content = await fs.readFile(`${file}z`);
      const unzipped = await unzip(content);
      return JSON.parse(`${unzipped}`);
    }
    return await fs.readJSON(file);
  } catch (error) {
    throw new Error(`Error reading File: '${file}'\n${error.message || error}\n${error.stack || ""}`);
  }
};
