import { NedbDocumentKnownFriends } from '../../raid-tool'
import { baseConfig, db } from './main-proxy'
import { LogJsonData, readLogJsonFiltered } from './read-json'

export default async function updateKnownFriends({
  knownFriendCache: knownFriendCacheBefore,
  htmlFile,
  entry
}: {
  knownFriendCache: NedbDocumentKnownFriends | null
  htmlFile: string
  entry: string
}) {
  let knownFriendCache = knownFriendCacheBefore
  let json: LogJsonData | null = null
  try {
    json = await readLogJsonFiltered(htmlFile.replace(/\.html$/, '.json'))
  } catch (error) {
    if (!knownFriendCache) {
      await db.known_friends.insert({
        status: 'failed',
        entry,
        ei_version: await baseConfig.ei_version,
        msg: (error as any).message || error
      })
    }
    return
  }

  if (!knownFriendCache) {
    knownFriendCache = {
      status: 'done',
      entry,
      ei_version: await baseConfig.ei_version,
      msg: '',
      friends: []
    }
  } else {
    knownFriendCache.status = 'done'
    knownFriendCache.friends = []
    knownFriendCache.entry = entry
    knownFriendCache.ei_version = await baseConfig.ei_version
  }

  let successPoint = 0
  if (![16199, 19645, 19676].includes(json.triggerID)) {
    if (json.success) {
      successPoint = 1
      if (json.isCM) {
        successPoint = 5
      }
    }
  }

  for (const player of json.players) {
    let knownFriend = await db.friends.findOne({ account: player.account })
    if (!knownFriend) {
      knownFriend = await db.friends.insert({
        account: player.account,
        chars: [],
        sharedLogs: 0
      })
    }
    let knownChar = knownFriend.chars.find((c) => c.name === player.name)
    if (!knownChar) {
      knownChar = {
        name: player.name,
        profession: [],
        sharedLogs: 0
      }
      knownFriend.chars.push(knownChar)
    }
    let knownProfession = knownChar.profession.find((c) => c.name === player.profession)
    if (!knownProfession) {
      knownProfession = {
        name: player.profession,
        sharedLogs: 0
      }
      knownChar.profession.push(knownProfession)
    }
    knownProfession.sharedLogs += successPoint
    knownChar.profession.sort((a, b) => b.sharedLogs - a.sharedLogs)
    knownChar.sharedLogs += successPoint
    knownFriend.chars.sort((a, b) => b.sharedLogs - a.sharedLogs)
    knownFriend.sharedLogs += successPoint
    await db.friends.update(
      { _id: knownFriend._id },
      {
        $set: {
          sharedLogs: knownFriend.sharedLogs,
          chars: knownFriend.chars
        }
      }
    )
    knownFriendCache.friends.push(knownFriend._id as string)
  }

  if (knownFriendCacheBefore) {
    await db.known_friends.update({ _id: knownFriendCacheBefore._id }, { $set: knownFriendCache })
  } else {
    knownFriendCache = await db.known_friends.insert(knownFriendCache)
  }
}
