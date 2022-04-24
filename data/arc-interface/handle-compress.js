const path = require("path");
const fs = require("fs-extra");
const zlib = require("zlib");
const {promisify} = require("util");

const zip = promisify(zlib.deflate);

module.exports = async function handleCompress(logsPath, compressEntries) {
  while (compressEntries.length > 0) {
    const uncompressedJSON = compressEntries.shift();
    console.info(`compressing: ${uncompressedJSON}`);
    const content = await fs.readFile(path.join(logsPath, uncompressedJSON));
    await fs.outputFile(path.join(logsPath, `${uncompressedJSON}z`), await zip(content));
    await fs.remove(path.join(logsPath, uncompressedJSON));
  }
};
