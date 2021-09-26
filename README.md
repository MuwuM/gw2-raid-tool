# gw2-raid-tool

## Fetures
* Shows your KP's, LI's and Boss-Kills of the current week
* Shows arcdps logs
* Lists all accounts (with their characters) you have shared kills with (friends)
* automatically parses the HTML view of new logs (like [https://dps.report/](dps.report), just better)
* Account-names in the logs become links, so you can view all shared logs with that account
* One-Click-Upload to [https://dps.report/](dps.report)
* you can manage any number of accounts at the same time (just testet wit 3 accounts, should work well with up to 16 accounts)
* auto-updates the log-parser ([https://baaron4.github.io/GW2-Elite-Insights-Parser/](Elite-Insights))
* auto-updates [https://www.deltaconnected.com/arcdps/](arcdps) (dx9 & dx11, can only update, when the game is nt running when you start the raid-tool)
* auto-updates itself 

## End-User
### Install the latest release.
You can install it here: 

Download-Link: [https://tool.raid-static.de/gw2_raid_tool_installer.exe](https://tool.raid-static.de/gw2_raid_tool_installer.exe) (BETA)


## Development-mode
### Install:
```
npm install
cd data
npm install
```

### To start: 
```
npm start
```

### To build & publish: 
* copy and rename `upload-config-template.json` to `upload-config.json`
* [optional] modify `upload-config.json` to the server you'd like to upload the installers to
```
npm run build
```
