const Datastore = require("nedb-promises");
const path = require("path");

module.exports = async({baseConfig}) => {

  const enabledDBs = [
    "logs",
    "friends",
    "known_friends",
    "settings",
    "accounts"
  ];

  const db = {};
  for (const enabledDB of enabledDBs) {
    db[enabledDB] = Datastore.create(path.resolve(baseConfig.dbBaseDir, `${enabledDB}.nedb`));
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
