<script setup lang="ts">
import LogList from "./LogList.vue";
import LogView from "./LogView.vue";
</script>
<template>
  <main class="arc-log-display-wrapper" id="logs">
    <div class="emptyspacer"></div>
    <div class="arc-log-display">
      <LogList></LogList>
      <LogView></LogView>
    </div>
  </main>
</template>
