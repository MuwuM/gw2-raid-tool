import updateAccStats, { localUpdates } from './gw2-interface/update-acc-stats'
import gw2apiClient from 'gw2api-client'
import { db, eventHub } from './arc-interface/main-proxy'

const remoteModificator = 100

;(async () => {
  let apiCounter = 0

  async function updateAccounts() {
    const accs = await db.accounts.find({})

    for (const acc of accs) {
      try {
        if (apiCounter % remoteModificator === 0) {
          //console.log(`Update Account stats remote: ${acc && acc.accountInfo && acc.accountInfo.name}`);
          const apiClient = gw2apiClient()
          apiClient.authenticate(acc.token)
          const accountInfo = await apiClient.account().get()
          if (!acc.accountInfo || JSON.stringify(accountInfo) !== JSON.stringify(acc.accountInfo)) {
            await db.accounts.update({ _id: acc._id }, { $set: { accountInfo } })
            eventHub.emit('accounts', { accounts: await db.accounts.find({}) })
          }
          const account = await db.accounts.findOne({ _id: acc._id })
          await updateAccStats({
            db,
            apiClient,
            account,
            eventHub
          })
        }
        //console.log(`Update Account stats local: ${acc?.accountInfo?.name}`);
        const accountForLocal = await db.accounts.findOne({ _id: acc._id })
        await localUpdates({
          db,
          account: accountForLocal,
          eventHub
        })
      } catch (error) {
        console.error(error)
      }
    }
    apiCounter += 1
    if (apiCounter >= remoteModificator) {
      apiCounter -= remoteModificator
    }
    setTimeout(updateAccounts, 3600)
  }

  updateAccounts()
})().catch((err) => {
  console.error(err)
})
