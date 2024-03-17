<script setup lang="ts">
import { data } from "@renderer/preload-api";
import { img } from "@renderer/util";
import { UiLogs } from "src/raid-tool";

function logPath(activeLog: string | null, logs: UiLogs[]) {
  const log = logs.find((l) => l.hash === activeLog);
  if (log?.isUploading) {
    return `gw2-log:${activeLog}?is=uploading`;
  }
  return `gw2-log:${activeLog}`;
}
</script>
<template>
  <iframe
    v-if="data.activeLog"
    name="arc-log-display-iframe"
    class="arc-log-display-iframe"
    :src="logPath(data.activeLog, data.logs)"
    frameborder="0"
    sandbox="allow-scripts allow-top-navigation-by-user-activation allow-same-origin"
    v-on:load="data.logIsLoading = data.activeLog"
    v-on:error="data.logIsLoading = data.activeLog"
  ></iframe>
  <div v-if="data.logIsLoading !== data.activeLog" class="arc-log-display-loading">
    <div
      class="center-big-splash-blur"
      v-for="log in data.logs.filter((log) => log.hash === data.activeLog)"
    >
      <div class="center-big-splash">
        <img
          v-if="log.fightIcon"
          class="arc-list-preview-icon"
          :src="img('.' + log.fightIcon)"
          alt=""
          rel="noreferrer noopener"
        />
        <span class="center-big-splash-status">
          {{ log.fightName }}
        </span>
        <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
      </div>
    </div>
  </div>
</template>
