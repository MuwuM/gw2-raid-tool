const updateAccStats = require("./update-acc-stats");
const gw2apiClient = require("gw2api-client");


const remoteModificator = 100;

module.exports = async({
  db, eventHub
}) => {

  let apiCounter = 0;

  async function updateAccounts() {
    const accs = await db.accounts.find({});

    for (const acc of accs) {
      try {
        if (apiCounter % remoteModificator === 0) {
          const apiClient = gw2apiClient();
          apiClient.authenticate(acc.token);
          const accountInfo = await apiClient.account().get();
          if (!acc.accountInfo || JSON.stringify(accountInfo) !== JSON.stringify(acc.accountInfo)) {
            await db.accounts.update({_id: acc._id}, {$set: {accountInfo}});
            eventHub.emit("accounts", {accounts: await db.accounts.find({})});
          }
          const account = await db.accounts.findOne({_id: acc._id});
          await updateAccStats({
            db,
            apiClient,
            account,
            eventHub
          });
        }
        const accountForLocal = await db.accounts.findOne({_id: acc._id});
        await updateAccStats.localUpdates({
          db,
          account: accountForLocal,
          eventHub
        });
        apiCounter += 1;
        if (apiCounter >= remoteModificator) {
          apiCounter -= remoteModificator;
        }
      } catch (error) {
        console.error(error);
      }
    }
    setTimeout(updateAccounts, 3600);
  }

  updateAccounts();
};
