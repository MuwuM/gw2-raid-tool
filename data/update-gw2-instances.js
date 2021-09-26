const psList = require("ps-list");

module.exports = async() => {
  const gw2Instances = {running: []};
  async function updateInstances() {
    try {
      gw2Instances.running = (await psList()).filter((p) => p.name === "Gw2-64.exe");
    } catch (error) {
      console.error(error);
    }
    setTimeout(updateInstances, 1000);
  }

  try {
    await updateInstances();
  } catch (error) {
    console.error(error);
  }
  return gw2Instances;
};
