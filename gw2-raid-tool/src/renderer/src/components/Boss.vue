<script setup lang="ts">
import { data, i18n } from '@renderer/preload-api'
import LogList from './LogList.vue'
import LogView from './LogView.vue'
import { img, localizeName } from '@renderer/util'
</script>
<template>
  <main id="boss" class="arc-log-display-wrapper">
    <div class="container">
      <div class="jumbotron">
        <h2 v-if="data.stats.bossInfo" class="boss-info-title">
          <img
            v-if="data.stats.bossIcon"
            class="li-display-img"
            :src="img(data.stats.bossIcon)"
            :alt="data.stats.bossInfo[localizeName(data.lang)]"
          />{{ data.stats.bossInfo[localizeName(data.lang)] }}
        </h2>
        <div>
          <template v-if="data.stats.cmOnly">
            <span class="me-1">CM {{ i18n.killsLabel }} {{ data.stats.kills }}</span>
            <span class="me-1">CM {{ i18n.failsLabel }} {{ data.stats.fails }}</span>
          </template>
          <template v-else>
            <span class="me-1"
              >{{ i18n.killsLabel }} {{ data.stats.kills }}
              {{ i18n.cmOfKills(data.stats.cmKills || 0) }}</span
            >
            <span class="me-1">{{ i18n.failsLabel }} {{ data.stats.fails }}</span>
          </template>
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
