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
      const running = [];
      const lauchbuddy = [];
      const nvidiaShare = [];
      for (const prog of list) {
        if (prog.name === "Gw2-64.exe") {
          running.push(prog);
        } else if (prog.name === "Gw2.Launchbuddy.exe") {
          lauchbuddy.push(prog);
        } else if (prog.name === "NVIDIA Share.exe") {
          nvidiaShare.push(prog);
        }
      }
      baseConfig.gw2Instances.running = running;
      baseConfig.gw2Instances.lauchbuddy = lauchbuddy;
      baseConfig.gw2Instances.nvidiaShare = nvidiaShare;
    }
    baseConfig.gw2Instances.ready = true;
    const newInstances = JSON.stringify(baseConfig.gw2Instances);
    if (oldInstances !== newInstances) {
      console.log("baseConfig: update-gw2-instances.js");
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
