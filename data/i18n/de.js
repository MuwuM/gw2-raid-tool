module.exports = {
  msgSelectInstall: "Wähle deine Guild Wars 2 Installation aus:",
  msgArcUpdateNotPossible: "Update nicht möglich",
  msgArcUpdateNotPossibleInfo: "Update von arcdps ist nicht möglich, solange das Spiel an ist.",
  msgArcUpdateNotPossibleInfo2: "Update von arcdps ist nicht möglich, solange arcdps verwendet wird.",
  cmOfKills(kills) {
    return `(davon CM: ${kills})`;
  },
  killsLabel: "Kills:",
  failsLabel: "Fails:",
  creditsEiPart1: "Die Logs werden mit Hilfe von",
  creditsEiPart2: "geparsed.",
  licenseMit: "Lizenz: MIT License",
  creditsElectronPart1: "Für die Anzeige des Raid Tools wird",
  creditsElectronPart2: "verwendet.",
  licenseLabel: "Lizenz",
  creditsMorePackages: "Weitere verwendete Software-Pakete",
  sharedLogsLabel: "Gemeinsame Kills:",
  friendsHeaderAccount: "Account",
  friendsHeaderNames: "Namen",
  friendsHeaderKills: "Kills",
  friendsHeaderSharedKills: "Gemeinsame Boss-Kills",
  noKP: "Keine KPS",
  labelLi: "Legendäre Einsicht",
  showLiLd(li) {
    return `${li} LI/LD`;
  },
  showKp(kp) {
    return `${kp} KP`;
  },
  labelFractal: "Instabile Fraktal-Essenz",
  labelBoneSkinner: "Knochenhäuter-Ritual-Phiole",
  labelZhaitaffy: "Stück Zhaikritze",
  labelZhaitaffy1000: "Stück Jorzipan",
  headerSettings: "Einstellungen",
  headerSettingsAcount: "Account",
  headerSettingsToken: "API-Schlüssel",
  settingsAddTokenToken: "hinzufügen",
  settingsApiKeyInfo: "Bitte füge für jeden Account, für den du das Raid Tool benutzen möchtest einen gültigen Api-Schlüssel (account,inventories,characters,wallet,unlocks,progression) hinzu. Du kannst den Schlüssel auf ",
  settingsApiKeyInfo2: " erstellen.",
  settingsAddTokenTokenPlaceholder: "API-Schlüssel",
  settingsArcdpsLogDir: "Ordner für arcdps Logs:",
  settingsChangeButton: "Ändern",
  settingsRequiresRestart: "(das Tool wird danach neugestartet)",
  settingsResetPlaceholder: "Hier 'reset' reinschreiben",
  settingsResetButton: "Logs neu einlesen",
  settingsResetTakesLong: "(kann lange dauern)",
  settingsLanguage: "Sprache",
  navOverview: "Übersicht",
  navArcdps: "ArcDps Logs",
  navFriends: "Freunde",
  navSettings: "Einstellungen",
  navCredits: "Credits",
  navSearchForLogs: "Suche nach Logs:",
  navSearchForLogsLeft: "verbleibend"
};
