const packager = require("electron-packager");
const rebuild = require("electron-rebuild");
const electronInstaller = require("electron-winstaller");
const path = require("path");
const fs = require("fs-extra");
const fg = require("fast-glob");
const semver = require("semver");
const Client = require("ssh2-sftp-client");

const pgk = require("./data/package.json");
const pgkLock = require("./package-lock.json");

const uploadConfig = require("./upload-config.json");

(async() => {
  const dataDir = path.resolve(__dirname, "data");

  const electronVersion = pgkLock.dependencies.electron.version;


  const parsedVersion = semver.parse(pgk.version);
  const isDevBuild = parsedVersion.prerelease.includes("dev");
  console.log({isDevBuild});

  let buildDir = path.resolve(__dirname, "build-dist");
  let installerDir = path.resolve(__dirname, "installer-dist");
  if (isDevBuild) {
    buildDir = path.resolve(__dirname, "build-dist-dev");
    installerDir = path.resolve(__dirname, "installer-dist-dev");
  }
  //const distConfigDir = path.resolve(__dirname, "dist-config");

  const appIcon = path.resolve(__dirname, "data", "icon.ico");
  const installerIcon = path.resolve(__dirname, "data", "installer.ico");


  const appPaths = await packager({
    icon: appIcon,
    dir: dataDir,
    out: buildDir,
    overwrite: true,
    asar: false,
    platform: "win32",
    arch: "x64",
    name: pgk.name,
    appVersion: pgk.version,
    electronVersion,
    afterCopy: [
      async(buildPath, electronVersion, platform, arch, callback) => {
        try {
          console.log(`rebuilding: ${buildPath}`);
          await rebuild.rebuild({
            buildPath,
            electronVersion,
            arch
          });
          callback();
        } catch (error) {
          callback(error);
        }
      }
    ]
  });


  const targetDir = appPaths[0];
  console.log(targetDir);

  //const configFiles = await fg(["**/*"], {
  //  dot: true,
  //  cwd: distConfigDir
  //});
  //for (const configFile of configFiles) {
  //  await fs.copy(path.join(distConfigDir, configFile), path.join(targetDir, configFile));
  //}
  //console.log("copied config files");

  const exeName = pgk.name.replace(/-/g, "_");
  await electronInstaller.createWindowsInstaller({
    appDirectory: targetDir,
    outputDirectory: installerDir,
    authors: pgk.author,
    name: exeName,
    exe: `${pgk.name}.exe`,
    version: `${pgk.version}`,
    title: exeName,
    description: pgk.description,
    iconUrl: appIcon,
    setupIcon: installerIcon,
    setupExe: `${exeName}_installer.exe`,
    setupMsi: `${exeName}_installer.msi`,
    remoteReleases: uploadConfig.uploadDomain,
    noMsi: true

  });
  console.log("It worked!");

  parsedVersion.patch = 1 + parsedVersion.patch;
  pgk.version = parsedVersion.format();
  await fs.outputJSON(path.join(dataDir, "package.json"), pgk, {spaces: 2});
  if (!uploadConfig.noUpload) {
    let uploadConfigTargetPath = uploadConfig.targetPath;
    if (isDevBuild) {
      uploadConfigTargetPath = uploadConfig.targetPathDev;
    }

    console.log("Uploading files");
    // eslint-disable-next-line no-async-promise-executor
    const sftp = new Client();

    await sftp.connect({
      host: uploadConfig.host,
      port: uploadConfig.port,
      username: uploadConfig.username,
      privateKey: await fs.readFile(uploadConfig.privateKey)
    });

    const filesToUpload = await fg(["**/*"], {
      dot: true,
      cwd: installerDir
    });
    for (const fileToUpload of filesToUpload) {
      const onlineFile = path.posix.join(uploadConfigTargetPath, fileToUpload);
      let onlineStat = null;
      try {
        onlineStat = await sftp.stat(onlineFile);
      } catch (error) {
        onlineStat = null;
      }

      const offlineFile = path.join(installerDir, fileToUpload);
      const offlineStats = await fs.stat(offlineFile);

      if (onlineStat && offlineStats.mtimeMs <= onlineStat.modifyTime) {
        console.log(`Skipping: ${fileToUpload}`);
        continue;
      }

      console.log(`Uploading: ${fileToUpload}`);

      await sftp.fastPut(offlineFile, `${onlineFile}.tmp`);
      await sftp.delete(onlineFile, true);
      await sftp.rename(`${onlineFile}.tmp`, onlineFile);

    }
    await sftp.end();
    console.log("Upload Completed");
  }

})().catch((err) => {
  console.error(err);
  process.exit(1);
});
