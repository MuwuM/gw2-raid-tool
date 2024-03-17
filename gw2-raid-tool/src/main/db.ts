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
  await db.known_friends
    .ensureIndex({
      fieldName: 'entry',
      unique: true
    })
    .catch((err) => console.warn(err))
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
