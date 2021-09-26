const gw2 = require("gw2");
const updateAccStats = require("./update-acc-stats");
const client = new gw2.Client();

module.exports = async({db}) => {

  async function updateAccounts() {
    const accs = await db.accounts.find({});

    for (const acc of accs) {
      try {
        const accountInfo = await client.get("account", {token: acc.token});
        if (!acc.accountInfo || JSON.stringify(accountInfo) !== JSON.stringify(acc.accountInfo)) {
          await db.accounts.update({_id: acc._id}, {$set: {accountInfo}});
        }
        const account = await db.accounts.findOne({_id: acc._id});
        await updateAccStats({
          db,
          client,
          account
        });
      } catch (error) {
        console.error(error);
      }
    }
    setTimeout(updateAccounts, 360000);
  }

  updateAccounts();
};
