const processlist = require("node-processlist");

module.exports = async({
  eventHub, baseConfig
}) => {
  baseConfig.gw2Instances = {
    running: [],
    launchBuddy: [],
    nvidiaShare: [],
    ready: false
  };
  async function updateInstances() {
    const oldInstances = JSON.stringify(baseConfig.gw2Instances);
    let list;
    try {
      list = await processlist.getProcesses({});
    } catch (error) {
      console.error(error);
    }
    if (list) {
      try {
        baseConfig.gw2Instances.running = list.filter((p) => p.name === "Gw2-64.exe");
      } catch (error) {
        console.error(error);
      }

      try {
        baseConfig.gw2Instances.lauchbuddy = list.filter((p) => p.name === "Gw2.Launchbuddy.exe");
      } catch (error) {
        console.error(error);
      }

      try {
        baseConfig.gw2Instances.nvidiaShare = list.filter((p) => p.name === "NVIDIA Share.exe");
      } catch (error) {
        console.error(error);
      }
    }
    baseConfig.gw2Instances.ready = true;
    const newInstances = JSON.stringify(baseConfig.gw2Instances);
    if (oldInstances !== newInstances) {
      eventHub.emit("baseConfig", {baseConfig});
    }
    setTimeout(updateInstances, 1000);
  }

  try {
    await updateInstances();
  } catch (error) {
    console.error(error);
  }
};
