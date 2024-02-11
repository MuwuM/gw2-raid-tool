<script setup lang="ts">
import { data } from "@renderer/preload-api";
import LogList from "./LogList.vue";

function logPath(activeLog, logs) {
  const log = logs.find((l) => l.hash === activeLog);
  if (log?.isUploading) {
    return `gw2-log:${activeLog}?is=uploading`;
  }
  return `gw2-log:${activeLog}`;
}
</script>
<template>
  <main class="arc-log-display-wrapper" id="logs">
    <div class="emptyspacer"></div>
    <div class="arc-log-display">
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
