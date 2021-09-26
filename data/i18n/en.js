module.exports = {
  msgSelectInstall: "Select your Guild Wars 2 installation:",
  msgArcUpdateNotPossible: "Update not possible",
  msgArcUpdateNotPossibleInfo: "Update of arcdps is not possible as long as the game is running.",
  msgArcUpdateNotPossibleInfo2: "Update von arcdps ist nicht möglich, solange arcdps verwendet wird.",
  cmOfKills(kills) {
    return `(of which CM: ${kills})`;
  },
  killsLabel: "Kills:",
  failsLabel: "Fails:",
  creditsEiPart1: "The logs are parsed with the help of",
  creditsEiPart2: ".",
  licenseMit: "Licence: MIT License",
  creditsElectronPart1: "For the display of the Raid Tool,",
  creditsElectronPart2: "is used.",
  licenseLabel: "Licence",
  creditsMorePackages: "Other software packages used",
  sharedLogsLabel: "Shared Kills:",
  friendsHeaderAccount: "Account",
  friendsHeaderNames: "Names",
  friendsHeaderKills: "Kills",
  friendsHeaderSharedKills: "Shared Boss Kills",
  noKP: "No KPS",
  labelLi: "Legendary Insight",
  showLiLd(li) {
    return `${li} LI/LD`;
  },
  showKp(kp) {
    return `${kp} KP`;
  },
  labelFractal: "Unstable Fractal Essence",
  labelBoneSkinner: "Boneskinner Ritual Vial",
  labelZhaitaffy: "Piece of Zhaitaffy",
  labelZhaitaffy1000: "Jorbreaker",
  headerSettings: "Settings",
  headerSettingsAcount: "Account",
  headerSettingsToken: "Api key",
  settingsAddTokenToken: "add",
  settingsApiKeyInfo: "Please add a valid Api key (account,inventories,characters,wallet,unlocks,progression) for each account you want to use the Raid Tool for. You can create the key on ",
  settingsApiKeyInfo2: ".",
  settingsAddTokenTokenPlaceholder: "Api key",
  settingsArcdpsLogDir: "Directory for arcdps logs:",
  settingsChangeButton: "Change",
  settingsRequiresRestart: "(the tool is restarted afterwards)",
  settingsResetPlaceholder: "Write 'reset' here",
  settingsResetButton: "Re-import logs",
  settingsResetTakesLong: "(may take a long time)",
  settingsLanguage: "Language",
  navOverview: "Overview",
  navArcdps: "ArcDps Logs",
  navFriends: "Friends",
  navSettings: "Settings",
  navCredits: "Credits",
  navSearchForLogs: "Search for logs:",
  navSearchForLogsLeft: "remaining"
};
