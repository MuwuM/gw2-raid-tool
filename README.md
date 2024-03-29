# gw2-raid-tool

## Fetures

* Shows your KP's, LI's and Boss-Kills of the current week
* Shows arcdps logs
* Lists all accounts (with their characters) you have shared kills with (friends)
* automatically parses the HTML view of new logs (like [dps.report](https://dps.report/), just better)
* Account-names in the logs become links, so you can view all shared logs with that account
* One-Click-Upload to [dps.report](https://dps.report/)
* you can manage any number of accounts at the same time (just tested with 3 accounts, should work well with up to 16 accounts)
* auto-updates the log-parser ([Elite-Insights](https://baaron4.github.io/GW2-Elite-Insights-Parser/))
* auto-updates [arcdps](https://www.deltaconnected.com/arcdps/) (dx9 & dx11, can only update, when the game is not running when you start the raid-tool)
* auto-updates itself

## End-User

### Install the latest release

You can install it here:

Download-Link: [https://tool.raid-static.de/gw2_raid_tool_installer.exe](https://tool.raid-static.de/gw2_raid_tool_installer.exe)

## Development-mode

### Install

```
cd gw2-raid-tool
npm install
```

### To start

```
cd gw2-raid-tool
npm start
```

### To build & publish

* copy and rename `upload-config-template.json` to `upload-config.json`
* [optional] modify `upload-config.json` to the server you'd like to upload the installers to

```
cd gw2-raid-tool
npm run pack
```
