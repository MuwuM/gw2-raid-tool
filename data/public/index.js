/* globals io,window,document */
const socket = io();
const Vue = require("vue");
const {webFrame} = require("electron");
const {DateTime} = require("luxon");


const validAhkKeys = /(^\S$)|(^F\d$)|(^F\d\d$)|(^CapsLock$)|(^Space$)|(^Tab$)|(^Enter$)|(^Escape$)|(^Esc$)|(^Backspace$)|(^ScrollLock$)|(^Delete$)|(^Del$)|(^Insert$)|(^Ins$)|(^Home$)|(^End$)|(^PgUp$)|(^PgDn$)|(^Up$)|(^Down$)|(^Left$)|(^Right$)|(^Numpad\d$)|(^NumpadDot$)|(^NumLock$)|(^NumpadDiv$)|(^NumpadMult$)|(^NumpadAdd$)|(^NumpadSub$)|(^NumpadEnter$)|(^[LR]Win$)|(^[LR]?Control$)|(^[LR]?Ctrl$)|(^[LR]?Alt$)|(^[LR]?Shift$)/;
const colors = [
  "#77ff77",
  "#ffe66d",
  "#83b2ff",
  "#ff8650",
  "#9b6ef3",
  "#ff555e",
  "#82ffe8",
  "#ff54e5",
  "#BBE5A7",
  "#F7D79F",
  "#C1C5E7",
  "#F6A78F",
  "#C8A1DC",
  "#F69295",
  "#BFE6DC",
  "#F68FD2"
];

function preventDefault(event) {
  if (event && typeof event.preventDefault === "function") {
    event.preventDefault();
  }
}

function handleScrollUpdate() {
  const navBar = document.querySelector("nav.navbar");
  const tableHeader = document.querySelector("table thead tr.sticky-top");
  if (navBar && tableHeader) {
    const rect = navBar.getBoundingClientRect();
    tableHeader.style.top = `${Math.floor(rect.bottom)}px`;
  }
}

function onResize() {
  const logDisplays = document.querySelectorAll(".arc-log-display");
  for (const logDisplay of logDisplays) {
    const prev = logDisplay.previousElementSibling;
    if (!prev) {
      const navBar = document.querySelector(".navbar");
      const rect = navBar.getBoundingClientRect();
      logDisplay.style.height = `${window.innerHeight - rect.bottom - 34}px`;
      continue;
    }
    const rect = prev.getBoundingClientRect();
    logDisplay.style.height = `${window.innerHeight - rect.bottom - 34}px`;
  }
  handleScrollUpdate();
}

window.addEventListener("scroll", handleScrollUpdate);
window.addEventListener("resize", onResize);
onResize();

const app = Vue.createApp({
  data() {
    return {
      page: "overview",
      pageConfig: {},
      accounts: [],
      anyNvidiaShareInstanceRunning: false,
      baseConfig: {},
      progressConfig: {},
      totalKps: {},
      gw2Instances: {
        running: [],
        launchBuddy: [],
        nvidiaShare: []
      },
      wings: [],
      specs: [],
      lang: "de",
      logs: [],
      logsPage: 0,
      logsMaxPages: 1,
      zhaitaffy: false,
      activeLog: null,
      logFilters: {
        p: 0,
        config: {}
      },
      friends: [],
      token: "",
      confirmReset: "",
      builds: [],
      buildClasses: [],
      activeBuildClass: false,
      buildSubClasses: [],
      activeBuildSubClass: false,
      buildRoles: [],
      activeBuildRole: false,
      buildSubRoles: {},
      activeBuildSubRole: false,
      mumbleLinkActive: false,
      keyRules: [],
      dayOfYear: DateTime.utc().ordinal,
      validAhkKeys,
      deps: [],
      langs: [],
      uniqueSpecs: []
    };
  },
  computed: {i18n() {
    return new Proxy(window[`i18n/${this.lang}`], {get(target, p) {
      if (!target[p]) {
        return `__${p}__`;
      }
      return target[p];
    }});
  }},
  methods: {
    toggleBuildClass(c) {
      if (this.activeBuildClass === c) {
        this.activeBuildClass = false;
        this.activeBuildSubClass = false;
      } else {
        this.activeBuildClass = c;
        this.activeBuildSubClass = false;
      }
    },
    toggleBuildSubClass(c) {
      if (this.activeBuildSubClass === c) {
        this.activeBuildSubClass = false;
      } else {
        this.activeBuildSubClass = c;
      }
    },
    toggleBuildRole(c) {
      if (this.activeBuildRole === c) {
        this.activeBuildRole = false;
        this.activeBuildSubRole = false;
      } else {
        this.activeBuildRole = c;
        this.activeBuildSubRole = false;
      }
    },
    toggleBuildSubRole(c) {
      if (this.activeBuildSubRole === c) {
        this.activeBuildSubRole = false;
      } else {
        this.activeBuildSubRole = c;
      }
    },
    isDailyToday(wing, step, dayOfYear) {
      return typeof wing.hasDailies === "number" && wing.hasDailies > 0 && (step.dailyIndex === dayOfYear % wing.hasDailies);
    },
    activeBuilds(builds, activeBuildClass, activeBuildSubClass, activeBuildRole, activeBuildSubRole) {
      return (builds || []).filter((b) => (!activeBuildClass ||
        (activeBuildClass === "active" && b.class === this.specs.find((s) => s.id === this.mumbleLinkActive.identity.spec).profession) ||
        b.class === activeBuildClass) &&
      (!activeBuildSubClass || b.spec === activeBuildSubClass) &&
      (!activeBuildRole || b.role.split("-")[0] === activeBuildRole) &&
      (!activeBuildSubRole || b.role === activeBuildSubRole));
    },
    selectPage(page, info, event) {
      preventDefault(event);
      if (page === "log" && info && info.id && info.action === "upload") {
        this.uploadLog(info.id);
        return;
      } else if (page === "log") {
        const log = info && this.logs.find((l) => l.hash === info.id);
        if (log) {
          this.selectLog(log, event);
        }
        return;
      }
      this.page = page;
      this.pageConfig = info;
      /*console.log({
        page,
        info
      });*/
      if (page === "logs") {
        this.showLogPage(0, {});
      } else if (page === "friends") {
        const friend = this.pageConfig && this.pageConfig.id;
        if (friend) {
          this.page = "friend";
          this.showLogPage(0, {friend});
        } else {
          this.showFriendsPage(0);
        }
      } else if (page === "boss") {
        this.showLogPage(0, {bossId: this.pageConfig && this.pageConfig.id});
      }
    },
    svgBossBorder(accounts, step, wing) {
      const parts = [];
      let rot = 0;
      const border = 12;
      const width = 300;
      const outline = width * 4;
      const innerWidth = (width - (2 * border));
      const innerOutline = innerWidth * 4;
      function formatX(x, w, offset) {
        let x1 = x % w;
        if (x >= w * 3) {
          x1 = 0;
        } else if (x >= w * 2) {
          x1 = w - x1;
        } else if (x >= w) {
          x1 = w;
        }
        return x1 + offset;
      }
      function formatY(y, h, offset) {
        let x1 = y % h;
        if (y >= h * 3) {
          x1 = h - x1;
        } else if (y >= h * 2) {
          x1 = h;
        } else if (y >= h) {
          //x1 = x1;
        } else {
          x1 = 0;
        }
        return x1 + offset;
      }
      for (const acc of accounts) {
        const rotEnd = rot + (1 / accounts.length);
        const d = [];
        const startOutline = rot * outline;
        const endOutline = rotEnd * outline;
        const x1Outline = formatX(startOutline, width, 0);
        const y1Outline = formatY(startOutline, width, 0);
        let x2Outline = formatX(endOutline, width, 0);
        let y2Outline = formatY(endOutline, width, 0);

        const startInline = rot * innerOutline;
        const endInline = rotEnd * innerOutline;
        const x1Inline = formatX(startInline, innerWidth, border);
        const y1Inline = formatY(startInline, innerWidth, border);
        let x2Inline = formatX(endInline, innerWidth, border);
        let y2Inline = formatY(endInline, innerWidth, border);

        if (rotEnd === 1) {
          x2Outline = 0;
          y2Outline = 0;
          x2Inline = border;
          y2Inline = border;
        }

        d.push(`${x1Outline},${y1Outline}`);
        if (x1Outline !== x2Outline && y1Outline !== y2Outline) {
          for (let i = Math.ceil(rot * 4); i <= Math.floor(rotEnd * 4);i++) {
            if (i === 0) {
              d.push(`${0},${0}`);
            } else if (i === 1) {
              d.push(`${width},${0}`);
            } else if (i === 2) {
              d.push(`${width},${width}`);
            } else if (i === 3) {
              d.push(`${0},${width}`);
            }
          }
        }
        if (x1Outline === x2Outline && y1Outline === y2Outline) {
          for (let i = 0; i <= 3;i++) {
            if (i === 0) {
              d.push(`${0},${0}`);
            } else if (i === 1) {
              d.push(`${width},${0}`);
            } else if (i === 2) {
              d.push(`${width},${width}`);
            } else if (i === 3) {
              d.push(`${0},${width}`);
            }
          }
        }
        d.push(`${x2Outline},${y2Outline}`);
        d.push(`${x2Inline},${y2Inline}`);
        if (x1Outline !== x2Outline && y1Outline !== y2Outline) {
          for (let i = Math.floor(rotEnd * 4); i >= Math.ceil(rot * 4) ;i--) {
            if (i === 0) {
              d.push(`${border},${border}`);
            } else if (i === 1) {
              d.push(`${width - border},${border}`);
            } else if (i === 2) {
              d.push(`${width - border},${width - border}`);
            } else if (i === 3) {
              d.push(`${border},${width - border}`);
            }
          }
        }
        if (x1Outline === x2Outline && y1Outline === y2Outline) {
          for (let i = 3; i >= 1 ;i--) {
            if (i === 0) {
              d.push(`${border},${border}`);
            } else if (i === 1) {
              d.push(`${width - border},${border}`);
            } else if (i === 2) {
              d.push(`${width - border},${width - border}`);
            } else if (i === 3) {
              d.push(`${border},${width - border}`);
            }
          }
        }
        d.push(`${x1Inline},${y1Inline}`);
        rot = rotEnd;
        let opacity = 0.2;
        if (!wing.isStrike && acc.completedSteps && acc.completedSteps.includes(step.id)) {
          opacity = 1;
        } else if (wing.isStrike && wing.isStrikeWeekly && acc.completedStrikesWeekly && acc.completedStrikesWeekly[step.triggerID]) {
          opacity = 1;
        } else if (wing.isStrike && acc.completedStrikesDaily && acc.completedStrikesDaily[step.triggerID]) {
          opacity = 1;
        }
        parts.push({
          d: `M ${d.join(" L ")} Z`,
          fill: acc.color,
          opacity
        });
      }
      return parts;
    },
    selectLog(log, event) {
      preventDefault(event);
      if (log) {
        this.activeLog = log.hash;
      } else {
        this.activeLog = null;
      }
    },
    showLogPage(page, filters, event) {
      preventDefault(event);
      this.logFilters.p = page;
      if (typeof filters === "object" && filters) {
        this.logFilters.config = filters;
      }
      const logFilter = {...this.logFilters};

      socket.emit("logFilter", logFilter);
    },
    showFriendsPage(page, event) {
      preventDefault(event);
      const friendsFilter = {};
      socket.emit("friendsFilter", friendsFilter);
    },
    uploadLog(logHash) {
      socket.emit("uploadLog", {hash: logHash});
    },
    addAccount(token, event) {
      preventDefault(event);
      socket.emit("addAccount", {token});
      this.token = "";
    },
    removeAccount(token, event) {
      preventDefault(event);
      socket.emit("removeAccount", {token});
    },
    changeLang(lang, event) {
      preventDefault(event);
      socket.emit("changeLang", {lang});
    },
    selectLogsPath(event) {
      preventDefault(event);
      socket.emit("selectLogsPath", {});
    },
    selectGw2Dir(event) {
      preventDefault(event);
      socket.emit("selectGw2Dir", {});
    },
    selectLaunchBuddyDir(event) {
      preventDefault(event);
      socket.emit("selectLaunchBuddyDir", {});
    },
    addKeyRule(event) {
      preventDefault(event);
      socket.emit("addKeyRule", {});
    },
    deleteKeyRule(keyRule, event) {
      preventDefault(event);
      socket.emit("deleteKeyRule", {keyRule});
    },
    updateKeyRuleActive(keyRule, event) {
      preventDefault(event);
      keyRule.active = event.target.checked;
      socket.emit("updateKeyRule", {keyRule});
    },
    updateKeyRuleSlot(keyRule, event) {
      preventDefault(event);
      keyRule.slot = event.target.value || "";
      socket.emit("updateKeyRule", {keyRule});
    },
    updateKeyRuleSpec(keyRule, event) {
      preventDefault(event);
      keyRule.spec = event.target.value || "";
      socket.emit("updateKeyRule", {keyRule});
    },
    updateKeyRuleKeys(keyRule, event) {
      preventDefault(event);
      keyRule.keys = event.target.value || "";
      socket.emit("updateKeyRule", {keyRule});
    },
    removeLaunchBuddyDir(event) {
      preventDefault(event);
      socket.emit("removeLaunchBuddyDir", {});
    },
    updateArcDps(event) {
      preventDefault(event);
      socket.emit("updateArcDps", {});
    },
    updateArcDps11(event) {
      preventDefault(event);
      socket.emit("updateArcDps11", {});
    },
    checkArcUpdates(event) {
      preventDefault(event);
      socket.emit("checkArcUpdates", {});
    },
    disableArcUpdates(event) {
      preventDefault(event);
      socket.emit("disableArcUpdates", {});
    },
    enableArcUpdates(event) {
      preventDefault(event);
      socket.emit("enableArcUpdates", {});
    },
    resetAllLogs(confirmReset, event) {
      preventDefault(event);
      socket.emit("resetAllLogs", {confirmReset});
      this.confirmReset = "";
    },
    startGame(event) {
      preventDefault(event);
      socket.emit("startGame", {});
    },
    logPath(activeLog, logs) {
      const log = logs.find((l) => l.hash === activeLog);
      if (log?.isUploading) {
        return `/log/${activeLog}?is=uploading`;
      }
      return `/log/${activeLog}`;
    }
  },
  updated() {
    document.title = `Raid Tool${(this.accounts.length >= 1) ? ` - ${this.accounts.filter((a) => a?.accountInfo?.name).map((a) => a.accountInfo.name)
      .join(" / ")}` : ""}`;
    //document.body.parentElement.style.fontSize = `${this.baseConfig.zoom * 16}px`;
    if (this.baseConfig?.zoom) {
      webFrame.setZoomFactor(this.baseConfig.zoom);
    }
    onResize();
    checkIframeClicks();
  }
});

const mnt = app.mount("#app");

socket.on("accounts", (data) => {
  //console.log("accounts", data);
  mnt.accounts = data.accounts;

  const accs = mnt.accounts.filter((a) => a.kps && a.accountInfo);
  const totalKps = {};
  for (const acc of accs) {
    acc.color = colors[accs.indexOf(acc) % colors.length];
    if (!acc.kps) {
      continue;
    }
    for (const [
      key,
      value
    ] of Object.entries(acc.kps)) {
      if (typeof value === "number" || typeof totalKps[key] === "number") {
        totalKps[key] = (totalKps[key] || 0) + value;
      } else if (Array.isArray(value) && (!totalKps[key] || Array.isArray(totalKps[key]))) {
        totalKps[key] = (totalKps[key] || []).concat(value);
      } else if (typeof value === "object" && (!totalKps[key] || typeof totalKps[key] === "object")) {
        if (!totalKps[key]) {
          totalKps[key] = {};
        }
        for (const [
          sub,
          v
        ] of Object.entries(totalKps[key] || {}).concat(Object.entries(value))) {
          totalKps[key][sub] = (totalKps[key][sub] || 0) + (v || 0);
        }
      }
    }
  }
  mnt.totalKps = totalKps;
});
socket.on("baseConfig", (data) => {
  //console.log("baseConfig", data);
  mnt.baseConfig = data.baseConfig;
  mnt.lang = data.baseConfig.lang;
  mnt.gw2Instances = data.baseConfig.gw2Instances;
  mnt.anyNvidiaShareInstanceRunning = data.baseConfig.gw2Instances.nvidiaShare && (data.baseConfig.gw2Instances.nvidiaShare.length > 0);
});
socket.on("progressConfig", (data) => {
  //console.log("baseConfig", data);
  mnt.progressConfig = data.progressConfig;
});
socket.on("keyRules", (data) => {
  //console.log("keyRules", data);
  mnt.keyRules = data.keyRules;
});
socket.on("mumbleLinkActive", (data) => {
  mnt.mumbleLinkActive = data.mumbleLinkActive;
});
socket.on("init", (data) => {
  //console.log("wings", data);
  mnt.wings = data.wings;
  mnt.specs = data.specs;
  mnt.deps = data.deps;
  mnt.langs = data.langs;
  mnt.uniqueSpecs = data.uniqueSpecs;
  socket.emit("getKeyRules", {});
});
socket.on("logs", (data) => {
  //console.log("logs", data);
  mnt.logs = data.logs;
  mnt.logsPage = data.page;
  mnt.logsMaxPages = data.maxPages;
  mnt.stats = data.stats;
  if (!mnt.logs.find((l) => l.hash === mnt.activeLog)) {
    mnt.activeLog = null;
  }
  if (!mnt.activeLog && mnt.logs[0]) {
    mnt.selectLog(mnt.logs[0]);
  }
});
socket.on("friends", (data) => {
  //console.log("friends", data);
  mnt.friends = data.friends;
});
socket.on("builds", (data) => {
  //console.log("builds", data);
  mnt.builds = data.builds;
  const classMap = {};
  const roleMap = {};
  const subRoleMap = {};
  const subClassMap = {};
  for (const build of data.builds) {
    classMap[build.class] = true;
    if (!subClassMap[build.class]) {
      subClassMap[build.class] = {};
    }
    subClassMap[build.class][build.spec] = true;
    const role = build.role.split("-")[0];
    if (role) {
      roleMap[role] = true;
      if (!subRoleMap[role]) {
        subRoleMap[role] = {};
      }
      subRoleMap[role][build.role] = true;
    }
  }
  const subRoles = {};
  for (const [
    role,
    subs
  ] of Object.entries(subRoleMap)) {
    subRoles[role] = Object.keys(subs);
  }
  const subClasses = {};
  for (const [
    role,
    subs
  ] of Object.entries(subClassMap)) {
    subClasses[role] = Object.keys(subs);
  }
  mnt.buildClasses = Object.keys(classMap);
  mnt.buildSubClasses = subClasses;
  mnt.buildRoles = Object.keys(roleMap);
  mnt.buildSubRoles = subRoles;
});

function handleClick(event) {
  const a = event.target.closest("a");
  const relativeUrl = a?.href && new URL(a.href, window.location.href);
  const baseUrl = new URL("/", window.location.href);
  if (!event.defaultPrevented && relativeUrl?.href?.startsWith(baseUrl.href)) {
    const url = new URL(a.href, window.location.href);

    const path = url.pathname;
    const pathParts = path.split("/");
    //console.log(pathParts);
    if (!pathParts[1]) {
      mnt.selectPage("overview", {}, event);
    } else {
      mnt.selectPage(pathParts[1], {
        id: pathParts[2],
        action: pathParts[3]
      }, event);
    }
    preventDefault(event);
  } else if (!event.defaultPrevented && relativeUrl) {
    //console.log({relativeUrl: relativeUrl.href});
    const url = new URL(relativeUrl.href, window.location.href);
    window.open(url.href);
    preventDefault(event);
  }
}

function checkIframeClicks() {
  const iframes = document.querySelectorAll("iframe");
  for (const iframe of iframes) {
    if (!iframe._raidToolClickHandlerOnLoad) {
      iframe.addEventListener("load", () => {
        iframe.contentWindow.document.addEventListener("click", handleClick);
        iframe.contentWindow.document._raidToolClickHandler = true;
      });
      iframe._raidToolClickHandlerOnLoad = true;
    }
    if (!iframe.contentWindow.document._raidToolClickHandler) {
      iframe.contentWindow.document.addEventListener("click", handleClick);
      iframe.contentWindow.document._raidToolClickHandler = true;
    }
  }
}

document.addEventListener("click", handleClick);

setInterval(() => {
  mnt.dayOfYear = DateTime.utc().ordinal;
  const els = document.querySelectorAll("[data-rel-time]");
  for (const el of els) {
    el.textContent = DateTime.fromMillis(parseInt(el.getAttribute("data-rel-time"), 10)).toRelative({locale: mnt.lang});
  }
}, 500);

