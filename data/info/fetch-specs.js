const fs = require("fs-extra");
const path = require("path");
const gw2 = require("gw2");
const client = new gw2.Client();

(async() => {
  const target = path.join(__dirname, "specs.json");

  const specs = [];

  for (let index = 1; index <= 72; index++) {
    const apiEn = await client.get(`specializations/${index}`, {lang: "en"});
    const apiDe = await client.get(`specializations/${index}`, {lang: "de"});
    const apiFr = await client.get(`specializations/${index}`, {lang: "fr"});
    if (apiEn.elite) {


      specs.push({
        id: apiEn.id,
        name: apiEn.name,
        profession: apiEn.profession,
        name_en: apiEn.name,
        name_de: apiDe.name,
        name_fr: apiFr.name
      });
    } else {
      specs.push({
        id: apiEn.id,
        name: apiEn.profession,
        profession: apiEn.profession,
        name_en: apiEn.profession,
        name_de: apiDe.profession,
        name_fr: apiFr.profession
      });
    }

    console.log(`${apiEn.id}: ${apiEn.profession}`);

  }

  await fs.outputJSON(target, specs);

})().catch((err) => {
  console.error(err);
  process.exit(1);
});
