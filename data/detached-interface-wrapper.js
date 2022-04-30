const {fork} = require("child_process");
const os = require("os");
const path = require("path");

module.exports = async(childProcessFile, {
  db, baseConfig, progressConfig, eventHub
}, memoryModificator) => {

  const pctMem = Math.max(Math.ceil(4 * 1024 * (Math.max(1, memoryModificator) / 100)), Math.floor(os.freemem() / 10485760 * (Math.max(1, memoryModificator) / 100)));
  console.info(`Using up to ${pctMem}MB for ${path.basename(childProcessFile)}`);
  const child = fork(childProcessFile, {
    stdio: "inherit",
    execArgv: [`--max-old-space-size=${pctMem}`]
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
        module.exports(childProcessFile, {
          db,
          baseConfig,
          progressConfig,
          eventHub
        });
      }, 1000);
    }
  });

  child.on("message", async({
    msg,
    reqId,
    database, method, options,
    prop, value
  }) => {
    try {

      if (msg === "db") {
        try {
          const res = await db[database][method](...options);
          child.send({
            msg: "dbres",
            dbres: res,
            reqId
          });
        } catch (error) {
          if (!child.killed) {
            child.send({
              msg: "error",
              err: (error && error.stack) || error,
              reqId
            });
          } else {
            console.error(error);
          }
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
      } else if (msg === "emitEventHub") {
        eventHub.emit(prop, value);
      }
    } catch (error) {
      console.error(error);
    }
  });

};
