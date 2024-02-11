<script setup lang="ts">
import { data } from "@renderer/preload-api";
import { InitStatusStatusCode } from "../../raid-tool";
import Updating from "./components/Updating.vue";
import Main from "./components/Main.vue";
</script>

<template>
  <Updating v-if="data.loading.status !== InitStatusStatusCode.Loaded"></Updating>
  <Main v-if="data.loading.status === InitStatusStatusCode.Loaded"></Main>
</template>

<style lang="less">
@import "../../../node_modules/bootswatch/dist/darkly/bootstrap.min.css";
@import "./assets/css/styles.less";
</style>
