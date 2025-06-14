import Datastore from 'nedb-promises'
import path from 'path'
import * as RaidToolDef from '../raid-tool'

export default async ({ backendConfig }: { backendConfig: RaidToolDef.BackendConfig }) => {
  const db = {} as RaidToolDef.NedbDatabase
  for (const enabledDB of RaidToolDef.NedbDatabaseEnabledTableNames) {
    db[enabledDB] = Datastore.create({
      filename: path.resolve(backendConfig.dbBaseDir, `${enabledDB}.nedb`)
    }) as any
  }
  await db.known_friends.removeIndex('entry').catch((err) => console.warn(err))
  // remove duplicate entries
  const entries = await db.known_friends.find({})
  const uniqueEntries = new Set<string>()
  for (const entry of entries) {
    if (uniqueEntries.has(entry.entry)) {
      await db.known_friends.remove({ _id: entry._id })
    } else {
      uniqueEntries.add(entry.entry)
    }
  }
  //disable index to prevent inconsytency
  await db.known_friends
    .ensureIndex({
      fieldName: 'entry',
      unique: true
    })
    .catch((err) => console.warn(err))
  //
  await db.friends
    .ensureIndex({
      fieldName: 'account',
      unique: true
    })
    .catch((err) => console.warn(err))
  await db.logs
    .ensureIndex({
      fieldName: 'htmlFile',
      unique: true
    })
    .catch((err) => console.warn(err))
  await db.logs
    .ensureIndex({
      fieldName: 'entry',
      unique: true
    })
    .catch((err) => console.warn(err))
  await db.logs
    .ensureIndex({
      fieldName: 'hash',
      unique: true,
      sparse: true
    })
    .catch((err) => console.warn(err))
  await db.logs
    .ensureIndex({
      fieldName: 'fightName',
      sparse: true
    })
    .catch((err) => console.warn(err))
  await db.logs
    .ensureIndex({
      fieldName: 'triggerID',
      sparse: true
    })
    .catch((err) => console.warn(err))
  return db
}
