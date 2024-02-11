<script setup lang="ts">
import { data, i18n } from "@renderer/preload-api";
import LogList from "./LogList.vue";
import { img } from "@renderer/util";

function logPath(activeLog, logs) {
  const log = logs.find((l) => l.hash === activeLog);
  if (log?.isUploading) {
    return `gw2-log:${activeLog}?is=uploading`;
  }
  return `gw2-log:${activeLog}`;
}
</script>
<template>
  <main id="boss" class="arc-log-display-wrapper">
    <div class="container">
      <div class="jumbotron">
        <h2 v-if="data.stats && data.stats.bossInfo" class="boss-info-title">
          <img
            v-if="data.stats.bossIcon"
            class="li-display-img"
            :src="img(data.stats.bossIcon)"
            :alt="data.stats.bossInfo['name_' + data.lang]"
          />{{ data.stats.bossInfo["name_" + data.lang] }}
        </h2>
        <div v-if="data.stats">
          <template v-if="data.stats.cmOnly">
            <span class="me-1">CM {{ i18n.killsLabel }} {{ data.stats.kills }}</span>
            <span class="me-1">CM {{ i18n.failsLabel }} {{ data.stats.fails }}</span>
          </template>
          <template v-else>
            <span class="me-1"
              >{{ i18n.killsLabel }} {{ data.stats.kills }}
              {{ i18n.cmOfKills(data.stats.cmKills) }}</span
            >
            <span class="me-1">{{ i18n.failsLabel }} {{ data.stats.fails }}</span>
          </template>
        </div>
      </div>
    </div>
    <div class="emptyspacer"></div>
    <div class="arc-log-display arc-log-display-friend">
      <LogList></LogList>
      <iframe
        v-if="data.activeLog"
        name="arc-log-display-iframe"
        class="arc-log-display-iframe"
        :src="logPath(data.activeLog, data.logs)"
        frameborder="0"
        sandbox="allow-scripts allow-top-navigation-by-user-activation allow-same-origin"
      ></iframe>
    </div>
  </main>
</template>
