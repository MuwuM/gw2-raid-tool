const wings = require("../info/wings");


const colors = [
  "#77ff77",
  "#ffe66d",
  "#83b2ff",
  "#ff8650",
  "#9b6ef3",
  "#ff555e",
  "#82ffe8",
  "#ff54e5",
  "#BBE5A7",
  "#F7D79F",
  "#C1C5E7",
  "#F6A78F",
  "#C8A1DC",
  "#F69295",
  "#BFE6DC",
  "#F68FD2"
];


module.exports = async({
  router, db, hashLog
}) => {

  router.get("/", async(ctx) => {
    const accs = await db.accounts.find({
      kps: {$exists: true},
      accountInfo: {$exists: true}
    });

    const totalKps = {};
    for (const acc of accs) {
      acc.color = colors[accs.indexOf(acc) % colors.length];
      if (!acc.kps) {
        continue;
      }
      for (const [
        key,
        value
      ] of Object.entries(acc.kps)) {
        if (typeof value === "number" || typeof totalKps[key] === "number") {
          totalKps[key] = (totalKps[key] || 0) + value;
        } else if (Array.isArray(value) && (!totalKps[key] || Array.isArray(totalKps[key]))) {
          totalKps[key] = (totalKps[key] || []).concat(value);
        } else if (typeof value === "object" && (!totalKps[key] || typeof totalKps[key] === "object")) {
          totalKps[key] = {};
          for (const [
            sub,
            v
          ] of Object.entries(totalKps[key] || {}).concat(Object.entries(value))) {
            totalKps[key][sub] = (totalKps[key][sub] || 0) + (v || 0);
          }
        }
      }
    }
    const data = {
      wings,
      accounts: accs,
      totalKps
    };
    const logsHash = await hashLog(JSON.stringify(data));
    await ctx.renderView("overview", {
      ...data,
      logsHash
    });
  });
};
