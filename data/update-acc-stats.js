const itemIds = require("./info/item-ids");

module.exports = async({
  db, client, account
}) => {


  async function liOfAccount() {
    const sharedInventary = await client.get("account/inventory", {token: account.token});
    const bank = await client.get("account/bank", {token: account.token});
    const materials = await client.get("account/materials", {token: account.token});
    const legendaryarmory = await client.get("account/legendaryarmory", {token: account.token});
    const wallet = await client.get("account/wallet", {token: account.token});
    let inventary = [];
    const characters = await client.get("characters?ids=all", {token: account.token});
    for (const character of characters) {
      if (!character.bags) {
        character.bags = await client.get(`characters/${character.name}/inventory`, {token: account.token});
      }
      for (const bag of character.bags) {
        if (!bag) {
          continue;
        }
        inventary = inventary.concat(bag.inventory.filter((i) => i).map((i) => {
          i["@char"] = character.name;
          return i;
        }));
      }
      if (!character.equipment) {
        character.equipment = await client.get(`characters/${character.name}/equipment`, {token: account.token});
      }
      inventary = inventary.concat(character.equipment.filter((i) => i).map((i) => {
        i["@char"] = character.name;
        return i;
      }));
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
      if (item.id === 77302 || item.id === 88485) {
        li += item.count || 0;
      } else if (itemIds.liBoxes.includes(item.id)) {

        /*if (item["@char"]) {
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
      } else if (item.id === 81743) {
        fractal += (item.count || 0) * 5;
      } else if (item.id === 94020) {
        fractal += (item.count || 0);
      } else if (item.id === 93781) {
        boneSkinner += item.count || 0;
      } else if ([
        93869,
        93872,
        93804
      ].includes(item.id)) {
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
      } else if ([
        91225,
        91234 /*Coalescence */
      ].includes(item.id)) {
        console.log(`Gift of Compassion: ${item.id}`);
        li += (item.count || 0) * 150;
      } else if ([43319].includes(item.id)) {
        zhaitaffy += (item.count || 0);
      } else if ([43320].includes(item.id)) {
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
    }
  }

  async function updateCompletedSteps() {
    const completedSteps = await client.get("account/raids", {token: account.token});
    if (!account.completedSteps || JSON.stringify(completedSteps) !== JSON.stringify(account.completedSteps)) {
      await db.accounts.update({_id: account._id}, {$set: {completedSteps}});
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
