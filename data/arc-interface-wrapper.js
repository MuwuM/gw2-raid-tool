const {fork} = require("child_process");
const path = require("path");
const os = require("os");

module.exports = async({
  db, baseConfig, progressConfig, eventHub
}) => {

  const pctMem = Math.floor(os.freemem() / 10485760);
  console.info(`Using ${pctMem}MB for parsing:`);
  const child = fork(path.join(__dirname, "./arc-interface.js"), {
    stdio: "inherit",
    execArgv: [`--max-old-space-size=${Math.max(1024, pctMem)}`]
  });

  let isExiting = false;
  process.on("exit", () => {
    isExiting = true;
    child.kill();
  });

  child.on("exit", () => {
    if (isExiting) {
      return;
    }
    console.warn({"child.exitCode": child.exitCode});
    if (child.exitCode === 134) {
      setTimeout(() => {
        module.exports({
          db,
          baseConfig
        }, 5000);
      });
    }
  });

  child.on("message", async({
    msg,
    reqId,
    database, method, options,
    prop, value
  }) => {
    if (msg === "db") {
      try {
        const res = await db[database][method](...options);
        child.send({
          msg: "dbres",
          dbres: res,
          reqId
        });
      } catch (error) {
        child.send({
          msg: "error",
          err: (error && error.stack) || error,
          reqId
        });
      }
    } else if (msg === "getBaseConfig") {
      child.send({
        msg: "cfgRes",
        cfgRes: baseConfig[prop],
        reqId
      });
    } else if (msg === "setBaseConfig") {
      baseConfig[prop] = value;
      eventHub.emit("baseConfig", {baseConfig});
    } else if (msg === "getProgessConfig") {
      child.send({
        msg: "cfgProgessRes",
        cfgRes: progressConfig[prop],
        reqId
      });
    } else if (msg === "setProgressConfig") {
      progressConfig[prop] = value;
      eventHub.emit("progressConfig", {progressConfig});
    }
  });

};
