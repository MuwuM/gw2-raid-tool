const path = require("path");
const urllib = require("urllib");
const fs = require("fs-extra");

module.exports = async({baseConfig}) => {
  const buildJsonPath = path.resolve(baseConfig.processDir, "builds.json");
  const localBuilds = path.resolve(process.cwd(), "../gw2-raid-builds/builds.json");
  if (await fs.pathExists(localBuilds)) {
    baseConfig.buildJsonPath = localBuilds;
    baseConfig.localBuilds = true;
  } else {

    try {
      const jsonFileContent = await urllib.request("https://raw.githubusercontent.com/MuwuM/gw2-raid-builds/main/builds.json", {
        timeout: 60000,
        followRedirect: true
      });
      await fs.outputFile(buildJsonPath, jsonFileContent.data);
    } catch (error) {
      console.error(error);
    }
    baseConfig.buildJsonPath = buildJsonPath;
  }
};
