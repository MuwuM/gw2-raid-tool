const path = require("path");
const fs = require("fs-extra");
const zlib = require("zlib");
const {promisify} = require("util");
const {pipeline} = require("stream");
const pipe = promisify(pipeline);

module.exports = async function handleCompress(logsPath, compressEntries) {
  while (compressEntries.length > 0) {
    const uncompressedJSON = compressEntries.shift();
    console.info(`compressing: ${uncompressedJSON}`);

    const zipStream = zlib.createDeflate();
    const source = fs.createReadStream(path.join(logsPath, uncompressedJSON));
    const destination = fs.createWriteStream(path.join(logsPath, `${uncompressedJSON}z`));
    await pipe(source, zipStream, destination);
    await fs.remove(path.join(logsPath, uncompressedJSON));
  }
};
