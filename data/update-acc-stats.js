const {DateTime} = require("luxon");
const itemIds = require("./info/item-ids");
const wings = require("./info/wings");


const strikeWings = wings.filter((w) => w.isStrike);

const strikeIds = [];
const strikeIdsWeekly = [];
for (const w of strikeWings) {
  for (const step of w.steps) {
    if (step.triggerID) {
      if (w.isStrikeWeekly) {
        strikeIdsWeekly.push(step.triggerID);
      }
      strikeIds.push(step.triggerID);
    }
  }
}

module.exports = async({
  db, apiClient, account, eventHub
}) => {
  if (!account) {
    return;
  }

  async function liOfAccount() {
    if (!account) {
      return;
    }
    const sharedInventary = await apiClient.account().inventory()
      .get();
    const bank = await apiClient.account().bank()
      .get();
    const materials = await apiClient.account().materials()
      .get();
    const legendaryarmory = await apiClient.account().legendaryarmory()
      .get();
    const wallet = await apiClient.account().wallet()
      .get();
    let inventary = [];
    const characters = await apiClient.characters().all();

    for (const character of characters) {
      if (!character.bags) {
        character.bags = await apiClient.characters(character.name).inventory();
      }
      if (Array.isArray(character.bags)) {
        for (const bag of character.bags) {
          if (!bag) {
            continue;
          }
          inventary = inventary.concat(bag.inventory.filter((i) => i).map((i) => ({
            ...i,
            "@char": character.name
          })));
        }
      }
      if (!character.equipment) {
        character.equipment = await apiClient.characters(character.name).equipment();
      }
      if (Array.isArray(character.equipment)) {
        inventary = inventary.concat(character.equipment.filter((i) => i).map((i) => ({
          ...i,
          "@char": character.name
        })));
      }
    }
    let li = 0;
    let fractal = 0;
    let boneSkinner = 0;
    let zhaitaffy = 0;
    const raidBossKp = {};
    const unlockedLegyArmor = {};
    const items = sharedInventary
      .concat(bank)
      .concat(inventary)
      .concat(materials)
      .concat(legendaryarmory);
    const unopenedBoxes = [];
    for (const item of items) {
      if (!item) {
        continue;
      }
      if (item.id === itemIds.legendaryInsight || item.id === itemIds.legendaryDivination) {
        li += item.count || 0;
      } else if (typeof itemIds.raidBossCofferItems[item.id] === "string") {

        /* if (item["@char"]) {
          console.log(`Box: ${item.id} @ ${item["@char"]}`);
        } else {
          console.log(`Box: ${item.id}`);
        }*/
        const boss = itemIds.raidBossCofferItems[item.id];
        let bossKp = 0;
        if (Object.values(itemIds.raidBossKpItems).includes(boss)) {
          raidBossKp[boss] = (raidBossKp[boss] || 0) + (item.count || 0);
          bossKp = (item.count || 0);
        }
        unopenedBoxes.push({
          item,
          boss,
          bossKp
        });
        li += item.count || 0;
      } else if (item.id === itemIds.fractalUCE) {
        fractal += (item.count || 0) * 5;
      } else if (item.id === itemIds.fractalUFE) {
        fractal += (item.count || 0);
      } else if (item.id === itemIds.boneskinnerKp) {
        boneSkinner += item.count || 0;
      } else if (itemIds.boneSkinnerSkins.includes(item.id)) {
        boneSkinner += (item.count || 0) * 45;
      } else if (itemIds.legendaryArmor.precursors.includes(item.id)) {
        li += (item.count || 0) * 25;
      } else if (itemIds.legendaryArmor.heavy.includes(item.id)) {
        if (!unlockedLegyArmor.heavy) {
          if (!unlockedLegyArmor.medium && !unlockedLegyArmor.light) {
            unlockedLegyArmor.heavy = 1;
          } else {
            unlockedLegyArmor.heavy = 2;
          }
        }
        li += (item.count || 0) * (25 * unlockedLegyArmor.heavy);
      } else if (itemIds.legendaryArmor.medium.includes(item.id)) {
        if (!unlockedLegyArmor.medium) {
          if (!unlockedLegyArmor.heavy && !unlockedLegyArmor.light) {
            unlockedLegyArmor.medium = 1;
          } else {
            unlockedLegyArmor.medium = 2;
          }
        }
        li += (item.count || 0) * (25 * unlockedLegyArmor.medium);
      } else if (itemIds.legendaryArmor.light.includes(item.id)) {
        if (!unlockedLegyArmor.light) {
          if (!unlockedLegyArmor.heavy && !unlockedLegyArmor.medium) {
            unlockedLegyArmor.light = 1;
          } else {
            unlockedLegyArmor.light = 2;
          }
        }
        li += (item.count || 0) * (25 * unlockedLegyArmor.light);
      } else if (itemIds.legendaryArmor.pre_heavy.includes(item.id)) {
        if (!unlockedLegyArmor.heavy) {
          if (!unlockedLegyArmor.medium && !unlockedLegyArmor.light) {
            unlockedLegyArmor.heavy = 1;
          } else {
            unlockedLegyArmor.heavy = 2;
          }
        }
        li += (item.count || 0) * (25 * (unlockedLegyArmor.heavy - 1));
      } else if (itemIds.legendaryArmor.pre_medium.includes(item.id)) {
        if (!unlockedLegyArmor.medium) {
          if (!unlockedLegyArmor.heavy && !unlockedLegyArmor.light) {
            unlockedLegyArmor.medium = 1;
          } else {
            unlockedLegyArmor.medium = 2;
          }
        }
        li += (item.count || 0) * (25 * (unlockedLegyArmor.medium - 1));
      } else if (itemIds.legendaryArmor.pre_light.includes(item.id)) {
        if (!unlockedLegyArmor.light) {
          if (!unlockedLegyArmor.heavy && !unlockedLegyArmor.medium) {
            unlockedLegyArmor.light = 1;
          } else {
            unlockedLegyArmor.light = 2;
          }
        }
        li += (item.count || 0) * (25 * (unlockedLegyArmor.light - 1));
      } else if (itemIds.coalescenceLdItems.includes(item.id)) {
        li += (item.count || 0) * 150;
      } else if (item.id === itemIds.zhaitaffy) {
        zhaitaffy += (item.count || 0);
      } else if (item.id === itemIds.zhaitaffyJorbreaker) {
        zhaitaffy += (item.count || 0) * 1000;
      } else if (itemIds.raidBossKpItems[item.id]) {
        const boss = itemIds.raidBossKpItems[item.id];
        raidBossKp[boss] = (raidBossKp[boss] || 0) + (item.count || 0);
      }
    }
    for (const walletItem of wallet) {
      if (walletItem.id === 59) {
        fractal += (walletItem.value || 0);
      }
    }
    const kps = {
      li,
      fractal,
      boneSkinner,
      zhaitaffy,
      raidBossKp,
      unopenedBoxes
    };
    if (!account.kps || JSON.stringify(kps) !== JSON.stringify(account.kps)) {
      await db.accounts.update({_id: account._id}, {$set: {kps}});
      eventHub.emit("accounts", {accounts: await db.accounts.find({})});
    }
  }

  async function updateCompletedSteps() {
    if (!account) {
      return;
    }
    const completedSteps = await apiClient.account()
      .raids()
      .get();
    if (!account.completedSteps || JSON.stringify(completedSteps) !== JSON.stringify(account.completedSteps)) {
      await db.accounts.update({_id: account._id}, {$set: {completedSteps}});
      eventHub.emit("accounts", {accounts: await db.accounts.find({})});
    }
  }

  try {
    await liOfAccount();
  } catch (error) {
    console.error(error);
  }
  try {
    await updateCompletedSteps();
  } catch (error) {
    console.error(error);
  }
};

module.exports.localUpdates = async({
  db, account, eventHub
}) => {

  if (!account) {
    return;
  }

  let startOfWeek = DateTime.utc().startOf("week")
    .plus({
      hours: 7,
      minutes: 30
    });
  if (DateTime.utc() < startOfWeek) {
    startOfWeek = startOfWeek.minus({weeks: 1});
  }

  if (account.accountInfo && account.accountInfo.name) {

    const completedCMs = {};
    const startOfRaidReset = startOfWeek;
    const endOfRaidReset = startOfRaidReset.plus({days: 7});
    const cms = await db.logs.find({
      timeEndMs: {
        $gt: startOfRaidReset.toMillis(),
        $lte: endOfRaidReset.toMillis()
      },
      isCM: true,
      success: true,
      players: {$elemMatch: account.accountInfo.name}
    });
    for (const cm of cms) {
      completedCMs[cm.triggerID] = true;
    }

    if (!account.completedCMs || JSON.stringify(completedCMs) !== JSON.stringify(account.completedCMs)) {
      await db.accounts.update({_id: account._id}, {$set: {completedCMs}});
      eventHub.emit("accounts", {accounts: await db.accounts.find({})});
    }
  }
  if (account.accountInfo && account.accountInfo.name) {

    const completedStrikesDaily = {};
    const startOfStrikeDailyReset = DateTime.utc().startOf("day");
    const endOfStrikeDailyReset = startOfStrikeDailyReset.plus({days: 1});

    const strikes = await db.logs.find({
      timeEndMs: {
        $gt: startOfStrikeDailyReset.toMillis(),
        $lte: endOfStrikeDailyReset.toMillis()
      },
      triggerID: {$in: strikeIds},
      players: {$elemMatch: account.accountInfo.name},
      success: true
    });
    for (const strike of strikes) {
      completedStrikesDaily[strike.triggerID] = true;
    }

    if (!account.completedStrikesDaily || JSON.stringify(completedStrikesDaily) !== JSON.stringify(account.completedStrikesDaily)) {
      await db.accounts.update({_id: account._id}, {$set: {completedStrikesDaily}});
      eventHub.emit("accounts", {accounts: await db.accounts.find({})});
    }
  }
  if (account.accountInfo && account.accountInfo.name) {

    const completedStrikesWeekly = {};
    const startOfStrikeWeeklyReset = startOfWeek;
    const endOfStrikeWeeklyReset = startOfStrikeWeeklyReset.plus({days: 7});
    const strikes = await db.logs.find({
      timeEndMs: {
        $gt: startOfStrikeWeeklyReset.toMillis(),
        $lte: endOfStrikeWeeklyReset.toMillis()
      },
      triggerID: {$in: strikeIdsWeekly},
      players: {$elemMatch: account.accountInfo.name},
      success: true
    });
    for (const strike of strikes) {
      completedStrikesWeekly[strike.triggerID] = true;
    }
    if (!account.completedStrikesWeekly || JSON.stringify(completedStrikesWeekly) !== JSON.stringify(account.completedStrikesWeekly)) {
      await db.accounts.update({_id: account._id}, {$set: {completedStrikesWeekly}});
      eventHub.emit("accounts", {accounts: await db.accounts.find({})});
    }
  }
};
