const processlist = require("node-processlist");

module.exports = async(/*{baseConfig}*/) => {
  const gw2Instances = {
    running: [],
    launchBuddy: [],
    nvidiaShare: []
  };
  async function updateInstances() {
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
    setTimeout(updateInstances, 1000);
  }

  try {
    await updateInstances();
  } catch (error) {
    console.error(error);
  }
  return gw2Instances;
};
