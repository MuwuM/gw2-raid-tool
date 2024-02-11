<script setup lang="ts">
import { data } from "@renderer/preload-api";
import { InitStatusStatusCode } from "../../../raid-tool";
</script>
<template>
  <div class="center-big-splash-blur">
    <h1 class="center-big-splash">
      <span class="center-big-splash-status">{{
        InitStatusStatusCode[data.loading.status]
      }}</span>
      <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
    </h1>
    <div class="center-big-splash-step-area">
      <span class="center-big-splash-step">{{ data.loading.step || "" }}</span>
    </div>
  </div>
  <img class="bg-video" src="../assets/2560px-Travel_Room_concept_art.jpg" alt="" />
  <div class="bg-glow"></div>
  <div class="bg-glow"></div>
  <div class="bg-glow"></div>
  <div class="bg-glow"></div>
  <div class="bg-glow"></div>
  <div class="bg-glow"></div>
  <div class="bg-glow"></div>
  <div class="bg-fog"></div>
  <div class="bg-fog"></div>
</template>
