const EventEmitter = require("events");

const {progressConfig} = require("./main-proxy");
const updateLogEntry = require("./update-log-entry");
const handleCompress = require("./handle-compress");

const arcFileHandlerInit = (logsPath, counter) => {
  let queue = Promise.resolve();
  function singleton() {
    return new Promise((res) => {
      let next;
      const done = new Promise((innerRes) => next = innerRes);
      queue.then(() => res(next)).catch((err) => {
        console.error(err);
        next();
      });
      queue = done;
    });
  }
  const arcFileHandler = new EventEmitter({captureRejections: true});
  arcFileHandler.on("log", async(entry) => {
    console.info(`adding: ${entry}`);
    counter.i++;
    progressConfig.parsingLogs = counter.i;
    const done = await singleton();
    try {
      console.info(`parsing: ${entry}`);
      progressConfig.$currentLog = entry;
      await updateLogEntry(logsPath, entry);
      progressConfig.$currentLog = false;
      console.info(`parsed ${entry}`);
      counter.j++;
      progressConfig.$parsedLogs = counter.j;
      if (counter.i === counter.j && counter.chokidarReady) {
        counter.i = 0;
        counter.j = 0;
        progressConfig.$parsingLogs = counter.i;
        progressConfig.$parsedLogs = counter.j;
      }
      done();
    } catch (error) {
      done();
      throw error;
    }

  });
  arcFileHandler.on("compress", async(entry) => {
    counter.k++;
    progressConfig.compressingLogs = counter.k;
    const done = await singleton();
    try {
      progressConfig.$currentLog = `zipping: ${entry}`;
      await handleCompress(logsPath, [entry]);
      progressConfig.$currentLog = false;
      counter.l++;
      progressConfig.$compressedLogs = counter.l;
      if (counter.k === counter.l && counter.chokidarReady) {
        counter.k = 0;
        counter.l = 0;
        progressConfig.$compressingLogs = counter.k;
        progressConfig.$compressedLogs = counter.l;
      }
      done();
    } catch (error) {
      done();
      throw error;
    }
  });

  arcFileHandler.on("error", (err) => {
    console.error(err);
  });
  return arcFileHandler;
};
module.exports = arcFileHandlerInit;
