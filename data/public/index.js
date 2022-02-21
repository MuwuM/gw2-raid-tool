/* globals io,Vue,window,document */
const socket = io();

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
}
window.addEventListener("resize", onResize);
onResize();

const app = Vue.createApp({
  data() {
    return {
      page: "overview",
      accounts: [],
      anyNvidiaShareInstanceRunning: false,
      baseConfig: {},
      totalKps: {},
      gw2Instances: {
        running: [],
        launchBuddy: [],
        nvidiaShare: []
      },
      wings: [],
      lang: "de",
      logPath: false,
      logs: [],
      logsPage: 0,
      logsMaxPages: 1,
      zhaitaffy: false,
      activeLog: null,
      logFilters: {
        p: 0,
        config: {}
      },
      friends: []
    };
  },
  computed: {
    getMode() {
      return this.accounts;
    },
    i18n() {
      return window[`i18n/${this.lang}`];
    }
  },
  methods: {
    selectMode(accounts) {
      this.accounts = accounts;
    },
    renameRune(p) {
      socket.emit("renameRune", p);
    },
    selectPage(page, event) {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      this.page = page;
      if (page === "logs") {
        this.showLogPage(0);
      } else if (page === "friends") {
        this.showFriendsPage(0);
      }
    },
    svgBossBorder(accounts, step) {
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
        if (acc.completedSteps && acc.completedSteps.includes(step.id)) {
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
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      if (log) {
        this.logPath = `/log/${log.hash}`;
        this.activeLog = log.hash;
      } else {
        this.logPath = false;
        this.activeLog = null;
      }
    },
    showLogPage(page, event) {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      this.logFilters.p = page;
      const logFilter = {...this.logFilters};
      socket.emit("logFilter", logFilter);
    },
    showFriendsPage(page, event) {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      const friendsFilter = {};
      socket.emit("friendsFilter", friendsFilter);
    }
  },
  updated() {
    onResize();
  }
});

const mnt = app.mount("#app");

socket.on("accounts", (data) => {
  console.log("accounts", data);
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
        totalKps[key] = {};
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
});
socket.on("gw2Instances", (data) => {
  console.log("gw2Instances", data);
  mnt.gw2Instances = data.gw2Instances;
  mnt.anyNvidiaShareInstanceRunning = data.gw2Instances.nvidiaShare && (data.gw2Instances.nvidiaShare.length >= 0);
});
socket.on("wings", (data) => {
  console.log("wings", data);
  mnt.wings = data.wings;
});
socket.on("logs", (data) => {
  console.log("logs", data);
  mnt.logs = data.logs;
  mnt.logsPage = data.page;
  mnt.logsMaxPages = data.maxPages;
  if (!mnt.activeLog && mnt.logs[0]) {
    mnt.selectLog(mnt.logs[0]);
  }
});
socket.on("friends", (data) => {
  console.log("friends", data);
  mnt.friends = data.friends;
});

