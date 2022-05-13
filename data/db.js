const Datastore = require("nedb-promises");
const path = require("path");

/**
 *
 * @param {{backendConfig:import("./raid-tool").BackendConfig}} param0
 * @returns import("./base-config").NedbDatabase
 */
module.exports = async({backendConfig}) => {

  const enabledDBs = [
    "logs",
    "friends",
    "known_friends",
    "settings",
    "accounts",
    "blocked_key_rules"
  ];

  /**
   * @type {import("./raid-tool").NedbDatabase}
   */
  const db = {};
  for (const enabledDB of enabledDBs) {
    db[enabledDB] = Datastore.create({filename: path.resolve(backendConfig.dbBaseDir, `${enabledDB}.nedb`)});
  }
  await db.known_friends.ensureIndex({
    fieldName: "entry",
    unique: true
  });
  await db.friends.ensureIndex({
    fieldName: "account",
    unique: true
  });
  await db.logs.ensureIndex({
    fieldName: "htmlFile",
    unique: true
  });
  await db.logs.ensureIndex({
    fieldName: "entry",
    unique: true
  });
  await db.logs.ensureIndex({
    fieldName: "hash",
    unique: true,
    sparse: true
  });
  await db.logs.ensureIndex({
    fieldName: "fightName",
    sparse: true
  });
  await db.logs.ensureIndex({
    fieldName: "triggerID",
    sparse: true
  });
  return db;
};
