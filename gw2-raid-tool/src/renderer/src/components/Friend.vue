<script setup lang="ts">
import { data, i18n } from '@renderer/preload-api'
import { img } from '@renderer/util'
import LogList from './LogList.vue'
import LogView from './LogView.vue'
import KpMeDisplay from './KpMeDisplay.vue'
</script>
<template>
  <main id="friend" class="arc-log-display-wrapper">
    <div class="container">
      <div class="jumbotron">
        <h2 v-if="data.stats.friend">{{ data.stats.friend.account }}</h2>
        <div v-if="data.stats.friend" class="friend-badges">
          <span v-for="n in data.stats.friend.chars || []" :key="n.name" class="friend-badge"
            ><img
              class="friend-icon"
              :src="img('/img/profession/' + n.profession[0].name + '.png')"
            />
            <span class="friend-name">{{ n.name }}</span></span
          >
        </div>
        <div class="row">
          <div class="col-sm-6">
            <div v-if="data.stats.friend">
              <span class="text-with-info-tooltip" :title="i18n.sharedLogsLabelInfo">{{
                i18n.sharedLogsLabel
              }}</span
              >:
              {{ data.stats.friend.sharedLogs }}
            </div>
            <div>
              <span
                >{{ i18n.killsLabel }} {{ data.stats.kills }}
                {{ i18n.cmOfKills(data.stats.cmKills || 0) }}</span
              >
              <span>{{ i18n.failsLabel }} {{ data.stats.fails }}</span>
            </div>
          </div>
          <div class="col-sm-6">
            <KpMeDisplay
              v-if="data.stats.friend"
              :account="data.stats.friend.account"
            ></KpMeDisplay>
          </div>
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
