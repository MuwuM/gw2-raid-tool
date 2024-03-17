<script setup lang="ts">
import { data, i18n, api, selectPage } from "@renderer/preload-api";
import { preventDefault, img } from "../util";
import specsSrc from "../../../info/specs.json";
import Overview from "./Overview.vue";
import Settings from "./Settings.vue";
import Logs from "./Logs.vue";
import Boss from "./Boss.vue";
import { ClickEvent, SpecsJson } from "../../../raid-tool";
import { onUpdated } from "vue";
import Friends from "./Friends.vue";
import Credits from "./Credits.vue";
import Friend from "./Friend.vue";
import Keys from "./Keys.vue";

const specs = specsSrc as SpecsJson;

function startGame(event?: ClickEvent) {
  preventDefault(event);
  api.startGame({});
}

function handleScrollUpdate() {
  const navBar = document.querySelector("nav.navbar") as HTMLElement;
  const tableHeader = document.querySelector(
    "table thead tr.sticky-top"
  ) as HTMLTableRowElement;
  if (navBar && tableHeader) {
    const rect = navBar.getBoundingClientRect();
    tableHeader.style.top = `${Math.floor(rect.bottom)}px`;
  }
}

function onResize() {
  const logDisplays = document.querySelectorAll(
    ".arc-log-display"
  ) as Iterable<HTMLElement>;
  for (const logDisplay of logDisplays) {
    const prev = logDisplay.previousElementSibling;
    if (!prev) {
      throw new Error("No previous element found");
    }
    const rect = prev.getBoundingClientRect();
    logDisplay.style.height = `${window.innerHeight - rect.bottom}px`;
  }
  handleScrollUpdate();
}

window.addEventListener("scroll", onResize || handleScrollUpdate);
window.addEventListener("resize", onResize);
onResize();
setTimeout(onResize, 100);

onUpdated(() => {
  onResize();
  setTimeout(onResize, 100);
});
</script>
<template>
  <nav class="navbar navbar-expand navbar-dark bg-primary sticky-top">
    <ul class="navbar-nav mr-auto">
      <template v-if="data.accounts.length >= 1">
        <li class="nav-item active">
          <a
            class="nav-link"
            href="#"
            tabindex="-1"
            @click="selectPage('overview', {}, $event)"
            >{{ i18n.navOverview }}</a
          >
        </li>
        <li class="nav-item active">
          <a
            class="nav-link"
            href="#"
            tabindex="-1"
            @click="selectPage('logs', {}, $event)"
            >{{ i18n.navArcdps }}</a
          >
        </li>
        <li class="nav-item active">
          <a
            class="nav-link"
            href="#"
            tabindex="-1"
            @click="selectPage('friends', {}, $event)"
            >{{ i18n.navFriends }}</a
          >
        </li>
        <li class="nav-item active">
          <a
            :class="{ 'nav-link': true, 'text-muted': !data.baseConfig.isAdmin }"
            href="#"
            tabindex="-1"
            @click="selectPage('keys', {}, $event)"
          >
            {{ i18n.navKeyBlocking }}
          </a>
        </li>
      </template>
      <li class="nav-item active">
        <a
          class="nav-link"
          href="#"
          tabindex="-1"
          @click="selectPage('settings', {}, $event)"
          >{{ i18n.navSettings }}</a
        >
      </li>
      <li
        class="nav-item active"
        v-if="data.baseConfig.gw2Instances?.nvidiaShare?.length > 0"
      >
        <a
          class="btn btn-danger"
          href="https://nvidia.custhelp.com/app/answers/detail/a_id/4228/~/disabling-the-geforce-experience-share-in-game-overlay"
          tabindex="-1"
          >{{ i18n.nvidiaShareEnabled }}</a
        >
      </li>
      <li class="nav-item-spacer">
        <div
          v-if="data.progressConfig?.parsingLogs > 0"
          :title="data.progressConfig?.currentLog || ''"
          class="progress progress-parsingLogs"
          style="display: flex"
        >
          <div
            class="progress-bar bg-info"
            role="progressbar"
            :style="{
              overflow: 'hidden',
              width: `${
                (data.progressConfig.parsedLogs /
                  (data.progressConfig.parsingLogs || 1)) *
                100
              }%`,
              maxWidth: `${
                (data.progressConfig.parsedLogs /
                  (data.progressConfig.parsingLogs || 1)) *
                100
              }%`,
            }"
          ></div>
          <div class="progress-bar-label">
            {{ i18n.navSearchForLogs }}
            {{ data.progressConfig.parsingLogs - data.progressConfig.parsedLogs }}
            {{ i18n.navSearchForLogsLeft }}
          </div>
        </div>
        <div
          v-if="data.progressConfig.compressingLogs > 0"
          :title="data.progressConfig.currentLog || ''"
          class="progress progress-parsingLogs"
          style="display: flex"
        >
          <div
            v-if="data.progressConfig.compressingLogs > 0"
            class="progress-bar bg-success"
            role="progressbar"
            :style="{
              overflow: 'hidden',
              width: `${
                (data.progressConfig.compressedLogs /
                  (data.progressConfig.compressingLogs || 1)) *
                100
              }%`,
              maxWidth: `${
                (data.progressConfig.compressedLogs /
                  (data.progressConfig.compressingLogs || 1)) *
                100
              }%`,
            }"
          ></div>
          <div class="progress-bar-label">
            {{ i18n.navCompressingLogs }}
            {{ data.progressConfig.compressingLogs - data.progressConfig.compressedLogs }}
            {{ i18n.navSearchForLogsLeft }}
          </div>
        </div>
      </li>
      <li
        class="nav-item active"
        v-if="
          data.baseConfig.launchBuddyDir &&
          data.baseConfig.gw2Instances.lauchbuddy &&
          data.baseConfig.gw2Instances.lauchbuddy.length < 1
        "
      >
        <a
          class="btn btn-success"
          href="#"
          @click="startGame($event as ClickEvent)"
          tabindex="-1"
          >{{ i18n.startLaunchBuddy }}</a
        >
      </li>
      <li
        class="nav-item active"
        v-if="
          !data.baseConfig.launchBuddyDir &&
          data.baseConfig.gw2Dir &&
          data.baseConfig.gw2Instances.running &&
          data.baseConfig.gw2Instances.running.length < 1
        "
      >
        <a
          class="btn btn-success"
          href="#"
          @click="startGame($event as ClickEvent)"
          tabindex="-1"
          >{{ i18n.startGame }}</a
        >
      </li>
      <li class="nav-item" v-if="data.mumbleLinkActive?.identity">
        <a class="btn btn-dark" tabindex="-1">
          <img
            class="boon-icon"
            style="width: 1em; height: 1em"
            :src="
              img(
                '/img/profession/' +
                  specs.find((s) => s.id === data.mumbleLinkActive?.identity?.spec)
                    ?.name +
                  '.png'
              )
            "
          />
          {{ data.mumbleLinkActive?.identity?.name || "" }}
        </a>
      </li>
      <li class="nav-item nav-item-space active">
        <a
          class="nav-link"
          href="#"
          tabindex="-1"
          @click="selectPage('credits', {}, $event)"
          >{{ i18n.navCredits }}</a
        >
      </li>
    </ul>
  </nav>
  <Overview v-if="data.page === 'overview'"></Overview>
  <Logs v-else-if="data.page === 'logs'"></Logs>
  <Friends v-else-if="data.page === 'friends'"></Friends>
  <Settings v-else-if="data.page === 'settings'"></Settings>
  <Credits v-else-if="data.page === 'credits'"></Credits>
  <Boss v-else-if="data.page === 'boss'"></Boss>
  <Friend v-else-if="data.page === 'friend'"></Friend>
  <!--<div v-else-if="data.page === 'builds'"></div>-->
  <Keys v-else-if="data.page === 'keys'"></Keys>
  <!--<div v-else-if="data.page === 'map'"></div>-->
  <div class="zoom-indicator" v-if="data.baseConfig.zoom !== 1">
    {{ Math.round(data.baseConfig.zoom * 100) }}%
  </div>
  <!--<pre>{{ JSON.stringify(data, null, 2) }}</pre>-->
</template>
