const fs = require("fs-extra");
const path = require("path");

const {db} = require("./main-proxy");
const readJson = require("./read-json");
const {DateTime} = require("luxon");
const hashLog = require("../hash-log");
const fightIconMap = require("../info/fight-icon-map");

module.exports = async function assignLog(logsPath, htmlFile, entry) {
  const known = await db.logs.findOne({htmlFile});
  if (known) {
    await db.logs.update({_id: known._id}, {$set: {entry}});
    //console.log(known);
    return;
  }
  const logFile = htmlFile.replace(/\.html$/, ".json");
  let json = null;
  try {
    json = await readJson(logFile);
  } catch (error) {
    console.error(new Error(error.stack || error));
    let htmlStats;
    if (await fs.pathExists(`${htmlFile}z`)) {
      htmlStats = await fs.stat(`${htmlFile}z`);
    } else if (await fs.pathExists(htmlFile)) {
      htmlStats = await fs.stat(htmlFile);
    }
    if (!htmlStats || htmlStats.size <= 8) {
      console.warn(`Removed broken: ${entry}`);
      await fs.remove(path.join(logsPath, entry));
      if (await fs.pathExists(htmlFile)) {
        await fs.remove(htmlFile);
      }
      if (await fs.pathExists(`${htmlFile}z`)) {
        await fs.remove(`${htmlFile}z`);
      }
      if (await fs.pathExists(logFile)) {
        await fs.remove(logFile);
      }
      if (await fs.pathExists(`${logFile}z`)) {
        await fs.remove(`${logFile}z`);
      }
    } else if (!await fs.pathExists(`${htmlFile}-backup`) || !await fs.pathExists(`${htmlFile}z-backup`)) {
      if (await fs.pathExists(htmlFile)) {
        await fs.move(htmlFile, `${htmlFile}-backup`);
      }
      if (await fs.pathExists(`${htmlFile}z`)) {
        await fs.move(`${htmlFile}z`, `${`${htmlFile}z`}-backup`);
      }
      if (await fs.pathExists(logFile)) {
        await fs.move(logFile, `${logFile}-backup`);
      }
      if (await fs.pathExists(`${logFile}z`)) {
        await fs.move(`${logFile}z`, `${`${logFile}z`}-backup`);
      }
    }
    console.warn("could not read log");
    return;
  }
  try {

    await db.logs.insert({
      hash: await hashLog(htmlFile),
      htmlFile,
      fightIcon: fightIconMap[json.triggerID] || (
        json.fightIcon && json.fightIcon.startsWith("https://wiki.guildwars2.com/images/") && json.fightIcon
      ),
      eliteInsightsVersion: json.eliteInsightsVersion,
      triggerID: json.triggerID,
      fightName: json.fightName,
      arcVersion: json.arcVersion,
      gW2Build: json.gW2Build,
      language: json.language,
      languageID: json.languageID,
      recordedBy: json.recordedBy,
      timeStart: json.timeStartStd,
      timeEnd: json.timeEndStd,
      timeEndMs: DateTime.fromFormat(json.timeEndStd, "yyyy-MM-dd HH:mm:ss ZZ").toMillis(),
      duration: json.duration,
      success: json.success,
      isCM: json.isCM,
      entry,
      players: json.players.map((p) => p.account)
    });
  } catch (error) {
    console.warn(error);
    const known = await db.logs.findOne({htmlFile});
    if (known) {
      await db.logs.update({_id: known._id}, {$set: {entry}});
      //console.log(known);
      return;
    }
  }
};
