module.exports = {
  msgSelectInstall: "Select your Guild Wars 2 installation:",
  msgSelectLaunchBuddyInstall: "Select your GW2 LaunchBuddy installation:",
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
  licenseCCBY: "Licence: CC-BY",
  creditsElectronPart1: "For the display of the Raid Tool,",
  creditsElectronPart2: "is used.",
  creditsGameIconsPart1: "Icons from",
  creditsGameIconsPart2: "are used to display the Raid Tool.",
  licenseLabel: "Licence",
  creditsMorePackages: "Other software packages used",
  sharedLogsLabel: "Shared Kills:",
  friendsHeaderAccount: "Account",
  friendsHeaderNames: "Names",
  friendsHeaderKills: "Kills",
  friendsHeaderSharedKills: "Shared Boss Kills",
  noKP: "No KPS",
  dailyResetInfo: "Daily",
  weeklyResetInfo: "Weekly",
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
  settingsGw2Dir: "Directory for Gw2-64.exe:",
  settingsLaunchBuddyDir: "Directory for Gw2 Launchbuddy",
  settingsChangeButton: "Change",
  settingsDeleteButton: "Delete",
  settingsRequiresRestart: "(the tool is restarted afterwards)",
  settingsApplyAndRestart: "Apply and restart",
  fromArcConfig: "(is detected from arcdps config)",
  settingsResetPlaceholder: "Write 'reset' here",
  settingsResetButton: "Re-import logs",
  settingsResetTakesLong: "(may take a long time)",
  settingsResetInfoMessage: "Please enter 'reset' to confirm that you really want to re-import all logs.",
  settingsLanguage: "Language",
  navOverview: "Overview",
  navArcdps: "ArcDps Logs",
  navFriends: "Friends",
  navBuilds: "Builds",
  navSettings: "Settings",
  navCredits: "Credits",
  navSearchForLogs: "Search for logs:",
  navSearchForLogsLeft: "remaining",
  startGame: "Start game",
  startLaunchBuddy: "Start Launchbuddy",
  notInstalled: "not installed",
  settingsArcDpsEnabled: "ArcDps Auto Update",
  settingsArcDpsSetDisabled: "ArcDps Auto Update is disabled",
  settingsEnableButton: "Activate",
  settingsDisableButton: "Disable",
  settingsCheckUpdatesButton: "Check for updates",
  nvidiaShareEnabled: "NVIDIA Share is enabled!",
  navMap: "Map",
  buildClassHeaderName: "Profession",
  buildClassFromCurrentClass: "Automatically recognise profession from current character",
  buildRoleHeaderName: "Role",
  buildNameHeaderName: "Build",
  buildBenchmarkHeaderName: "Benchmark",
  buildLinksHeaderName: "Links",
  buildBenchmarkLargeHitboxShort: "Large",
  buildBenchmarkLargeHitbox: "Large Hitbox",
  buildBenchmarkConfusion: "stacks of confusion",
  buildBenchmarkWithAllies: "with Allies",
  isDailyToday: "Daily Strike Mission",
  lowIntensity: "Low Intensity",
  removeAccountQuestion: "Do you really want to delete?",
  removeAccountQuestionConfirm: "Delete",
  removeAccountQuestionCancel: "Cancel",
  resetSuccess: "Successfully reset",
  navKeyBlocking: "Lock keys",
  keySlotHeaderName: "Lock skill slot",
  keyKeysHeaderName: "Lock keys",
  keyActiveHeaderName: "Enabled",
  keyRuleAllSpecs: "All",
  keyRuleNoSlot: "lock no slot",
  keyRuleDelete: "Delete",
  addKeyRule: "Add rule",
  keyRuleRequireAdmin: "The raid tool must be started as admin to be able to lock keys."
};
