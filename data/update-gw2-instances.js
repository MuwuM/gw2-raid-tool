const processlist = require("node-processlist");

module.exports = async({eventHub}) => {
  const gw2Instances = {
    running: [],
    launchBuddy: [],
    nvidiaShare: []
  };
  async function updateInstances() {
    const oldInstances = JSON.stringify(gw2Instances);
    let list;
    try {
      list = await processlist.getProcesses({});
    } catch (error) {
      console.error(error);
    }
    if (list) {
      try {
        gw2Instances.running = list.filter((p) => p.name === "Gw2-64.exe");
      } catch (error) {
        console.error(error);
      }

      try {
        gw2Instances.lauchbuddy = list.filter((p) => p.name === "Gw2.Launchbuddy.exe");
      } catch (error) {
        console.error(error);
      }

      try {
        gw2Instances.nvidiaShare = list.filter((p) => p.name === "NVIDIA Share.exe");
      } catch (error) {
        console.error(error);
      }
    }
    const newInstances = JSON.stringify(gw2Instances);
    if (oldInstances !== newInstances) {
      eventHub.emit("gw2Instances", {gw2Instances});
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
