<script setup lang="ts">
import { data, i18n } from "@renderer/preload-api";
import { img } from "@renderer/util";
import LogList from "./LogList.vue";
import LogView from "./LogView.vue";
</script>
<template>
  <main id="friend" class="arc-log-display-wrapper">
    <div class="container">
      <div class="jumbotron" v-if="data.stats">
        <h2 v-if="data.stats.friend">{{ data.stats.friend.account }}</h2>
        <div v-if="data.stats.friend" class="friend-badges">
          <span v-for="n in data.stats.friend.chars || []" class="friend-badge"
            ><img
              class="friend-icon"
              :src="img('/img/profession/' + n.profession[0].name + '.png')"
            />
            <span class="friend-name">{{ n.name }}</span></span
          >
        </div>
        <hr />
        <div v-if="data.stats.friend">
          {{ i18n.sharedLogsLabel }} {{ data.stats.friend.sharedLogs }}
        </div>
        <div v-if="data.stats">
          <span
            >{{ i18n.killsLabel }} {{ data.stats.kills }}
            {{ i18n.cmOfKills(data.stats.cmKills) }}</span
          >
          <span>{{ i18n.failsLabel }} {{ data.stats.fails }}</span>
        </div>
      </div>
    </div>
    <div class="emptyspacer"></div>
    <div class="arc-log-display arc-log-display-friend">
      <LogList></LogList>
      <LogView></LogView>
    </div>
  </main>
</template>
