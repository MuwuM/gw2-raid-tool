# gw2-raid-tool

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
