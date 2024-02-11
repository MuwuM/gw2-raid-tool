<script setup lang="ts">
import { data } from "@renderer/preload-api";
import { InitStatusStatusCode } from "../../../raid-tool";
</script>
<template>
  <h1 class="center-big-splash">
    <span class="center-big-splash-status">{{
      InitStatusStatusCode[data.loading.status]
    }}</span>
    <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
  </h1>
  <div class="center-big-splash-step-area">
    <span class="center-big-splash-step">{{ data.loading.step || "" }}</span>
  </div>
  <video
    class="bg-video"
    src="../assets/02_EoD_Microsite_Narrative_Video_1920x1080.mp4"
    autoplay
    loop
    muted
  ></video>
</template>
