<script setup lang="ts">
import { data } from '@renderer/preload-api'
import { img } from '../util'
import { InitStatusStatusCode } from '../../../raid-tool'
</script>
<template>
  <div class="center-big-splash-blur">
    <h1 class="center-big-splash">
      <span class="center-big-splash-status"
        ><img
          :src="img('/img/logo5-3.png')"
          alt=""
          style="
            display: inline-block;
            width: 2em;
            height: 2em;
            margin-top: -0.5em;
            margin-bottom: -0.5em;
            margin-right: 0.5em;
            line-height: 1em;
            vertical-align: baseline;
          "
          title="GW2 Raid Tool"
        />
        {{ InitStatusStatusCode[data.loading.status] }}</span
      >
      <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
    </h1>
    <div class="center-big-splash-step-area">
      <span class="center-big-splash-step">{{ data.loading.step || '' }}</span>
    </div>
  </div>
  <img class="bg-video" src="../assets/d2d70793-858c-40df-bcd7-38dfba3df667.png" alt="" />
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
