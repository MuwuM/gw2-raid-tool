
const path = require("path");
const fs = require("fs-extra");
const {Octokit} = require("@octokit/rest");
const octokit = new Octokit();
const urllib = require("urllib");
const JSZip = require("jszip");
const semver = require("semver");

const eiRepo = {
  owner: "baaron4",
  repo: "GW2-Elite-Insights-Parser"
};

module.exports = async({baseConfig}) => {
  const eiLocalPath = path.resolve(baseConfig.processDir, "GuildWars2EliteInsights");
  await fs.ensureDir(eiLocalPath);
  let eiPath = null;
  let ei_version = null;
  try {

    const eiReleases = await octokit.repos.getLatestRelease({
      owner: eiRepo.owner,
      repo: eiRepo.repo
    });
    ei_version = eiReleases.data.name;
    console.log(`Latest Version: ${ei_version}`);
    const versionFolder = path.join(eiLocalPath, ei_version);
    if (!await fs.pathExists(versionFolder)) {
      const zipFile = eiReleases.data.assets.find((a) => a.name === "GW2EI.zip");
      if (zipFile) {
        const zibFileContent = await urllib.request(zipFile.browser_download_url, {
          timeout: 60000,
          followRedirect: true
        });
        await fs.outputFile(path.join(eiLocalPath, `${ei_version}.zip`), zibFileContent.data);
        //console.log({data: zibFileContent.data});
        await fs.ensureDir(versionFolder);
        const zip = JSZip();
        await zip.loadAsync(zibFileContent.data);
        const unzipFile = [];
        zip.forEach((relativePath, file) => {
          unzipFile.push(async() => {
            if (file.dir) {
              await fs.ensureDir(path.join(versionFolder, relativePath));
            } else {
              await fs.outputFile(path.join(versionFolder, relativePath), await zip.file(relativePath).async("nodebuffer"));
            }
          });
          //console.log("iterating over", relativePath);
        });
        for (const unzipEntry of unzipFile) {
          await unzipEntry();
        }
        //console.log(zibFileContent);

        console.log(`Updated Version: ${ei_version}`);
      }
    }
    eiPath = path.join(versionFolder, "GuildWars2EliteInsights.exe");
  } catch (error) {
    console.error(error);
  }
  if (!eiPath) {
    const versions = await fs.readdir(eiLocalPath);

    let maxVersion = "0.0";

    for (const version of versions) {
      if (!version.match(/^[\d.]+$/)) {
        continue;
      }
      if (semver.gt(version, maxVersion)) {
        maxVersion = version;
      }
    }
    ei_version = maxVersion;
    eiPath = path.join(eiLocalPath, ei_version, "GuildWars2EliteInsights.exe");
  }
  if (!eiPath) {
    throw new Error("Could not find Elite Insights");
  }

  baseConfig.ei_version = ei_version;
  baseConfig.eiPath = eiPath;

};
