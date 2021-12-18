const fs = require("fs-extra");
//const path = require("path");

module.exports = async(filePath) => {
  const content = await fs.readFile(filePath);

  const version = content.readUInt32LE(0);
  const map = content.readUInt32LE(4);

  const positions = [];

  const posArea = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    minZ: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    maxZ: Number.NEGATIVE_INFINITY
  };

  for (let index = 8; index < content.length; index += 12) {
    const x = content.readFloatLE(index + 0);
    const y = content.readFloatLE(index + 4);
    const z = content.readFloatLE(index + 8);
    posArea.minX = Math.min(posArea.minX, x);
    posArea.minY = Math.min(posArea.minY, y);
    posArea.minZ = Math.min(posArea.minZ, z);
    posArea.maxX = Math.max(posArea.maxX, x);
    posArea.maxY = Math.max(posArea.maxY, y);
    posArea.maxZ = Math.max(posArea.maxZ, z);
    positions.push({
      x,
      y,
      z
    });
  }

  posArea.centerX = (posArea.maxX + posArea.minX) / 2;
  posArea.centerY = (posArea.maxY + posArea.minY) / 2;
  posArea.centerZ = (posArea.maxZ + posArea.minZ) / 2;

  posArea.radiusX = (posArea.maxX - posArea.centerX);
  posArea.radiusY = (posArea.maxY - posArea.centerY);
  posArea.radiusZ = (posArea.maxZ - posArea.centerZ);

  const trail = {
    version,
    map,
    posArea
  };
  console.log(trail);

  return trail;
};

/*
module.exports(path.resolve(__dirname, "../W1B1-Bound.trl")).catch((err) => {
  console.error(err);
  process.exit(1);
});
*/
