const path = require("path");
const fs = require("fs-extra");

module.exports = async function checkLogs(logsPath, baseFile, dateName, entry, parseFailed) {
  const logFiles = [];
  if (await fs.pathExists(path.join(logsPath, `${baseFile}/${dateName}.log`))) {
    logFiles.push(`${baseFile}/${dateName}.log`);
  }
  const logFile = logFiles && logFiles[0] && path.join(logsPath, logFiles[0]);
  //console.log(`checkLogs: ${logFile}`);
  if (logFile) {
    const log = `${await fs.readFile(logFile)}`;
    const lines = log.split(/\s*[\n\r]+\s*/).filter((t) => t !== "");
    const result = lines[lines.length - 1];
    /*console.log({
      logFile,
      result
    });*/
    if (!result.startsWith("Completed parsing")) {
      if (result.match(/(^Fight is too short(:.+)?$|^Buffs can not be stackless$)/)) {
        console.warn(`Removed broken: ${entry}`);
        await fs.remove(path.join(logsPath, entry));
      } else {
        if (await fs.pathExists(`${logFile}-backup`)) {
          await fs.remove(`${logFile}-backup`);
        }
        await fs.move(logFile, `${logFile}-backup`);
      }
      return false;
    }
    return true;
  } else if (parseFailed) {
    console.warn(`Removed broken: ${entry}`);
    const entryPath = path.join(logsPath, entry);
    if (await fs.pathExists(`${entryPath}-broken`)) {
      await fs.remove(`${entryPath}-broken`);
    }
    await fs.move(entryPath, `${entryPath}-broken`);
  }
  return true;
};
