<script setup lang="ts">
import { data, i18n, api, selectLog } from '@renderer/preload-api'
import { preventDefault, img } from '../util'
import { DateTime } from 'luxon'
import { ClickEvent, LogFilter, UiLogs } from 'src/raid-tool'
function showLogPage(page: number, filters: LogFilter['config'] | null, event: ClickEvent) {
  preventDefault(event)
  data.logFilters.p = page
  if (typeof filters === 'object' && filters) {
    data.logFilters.config = filters
  }
  const logFilter = { ...data.logFilters }
  api.ipc.send.logFilter(logFilter)
}

function timeEndDiff(log: UiLogs, currenttime: number) {
  if (typeof currenttime === 'undefined') {
    return DateTime.fromMillis(log.timeEndMs).toRelative({ locale: 'de' })
  }
  return DateTime.fromMillis(log.timeEndMs).toRelative({ locale: 'de' })
}
</script>
<template>
  <div class="arc-list">
    <nav style="position: sticky; top: 0; z-index: 10">
      <ul class="pagination justify-content-center">
        <li :class="{ 'page-item': true, disabled: data.logsPage <= 0 }">
          <a class="page-link" @click="showLogPage(0, null, $event as ClickEvent)">«</a>
        </li>
        <li :class="{ 'page-item': true, disabled: data.logsPage <= 0 }">
          <a
            class="page-link"
            @click="showLogPage(Math.max(data.logsPage - 1, 0), null, $event as ClickEvent)"
            >‹</a
          >
        </li>
        <li class="page-item disabled w-50 text-center">
          <a class="page-link">{{ data.logsPage + 1 }}/{{ data.logsMaxPages }}</a>
        </li>
        <li
          :class="{
            'page-item': true,
            disabled: data.logsPage >= data.logsMaxPages - 1
          }"
        >
          <a
            class="page-link"
            @click="
              showLogPage(
                Math.min(data.logsMaxPages - 1, data.logsPage + 1),
                null,
                $event as ClickEvent
              )
            "
            >›</a
          >
        </li>
        <li
          :class="{
            'page-item': true,
            disabled: data.logsPage >= data.logsMaxPages - 1
          }"
        >
          <a
            class="page-link"
            @click="showLogPage(data.logsMaxPages - 1, null, $event as ClickEvent)"
            >»</a
          >
        </li>
      </ul>
    </nav>
    <div v-if="!(data.stats.bossInfo && !data.stats.bossInfo.hasCM)" class="mt-0 mb-1">
      <label
        ><input
          v-model="data.logFilters.config.cmOnly"
          type="checkbox"
          @change="showLogPage(data.logsPage, null, $event as ClickEvent)"
        />
        {{ i18n.cmOnlyLabel }}</label
      >
    </div>
    <div class="mt-0 mb-1">
      <label
        ><input
          v-model="data.logFilters.config.favOnly"
          type="checkbox"
          @change="showLogPage(data.logsPage, null, $event as ClickEvent)"
        />
        {{ i18n.favOnlyLabel }}</label
      >
    </div>
    <div class="list-group">
      <a
        v-for="log in data.logs"
        :key="log.hash"
        :href="'gw2-log://' + log.hash"
        target="arc-log-display-iframe"
        rel="noreferrer noopener"
        :class="{
          'arc-list-row': true,
          'list-group-item': true,
          'list-group-item-action': true,
          'd-flex': true,
          'justify-content-between': true,
          'align-items-center': true,
          'bg-info': log.hash === data.activeLog
        }"
        @click="selectLog(log, $event)"
      >
        <template v-if="log.displayCollapse">
          <div class="arc-list-img-box arc-list-img-box-collapse">
            {{ log.displayCollapse }}
          </div>
          <div class="arc-list-img-bossname">
            <div>
              <span
                :class="{
                  'arc-list-img-result': true,
                  badge: true,
                  'bg-success': log.success,
                  'bg-danger': !log.success
                }"
                >{{ timeEndDiff(log, data.currenttime) }}</span
              >
            </div>
          </div>
          <span
            v-if="log.displayNameCollapse"
            class="arc-list-img-logby badge bg-primary badge-pill"
            >{{ log.recordedBy }}</span
          >
          <div>
            <span v-if="log.isUploading">⬆️</span>
            <span v-if="log.favourite">⭐</span>
          </div>
        </template>
        <template v-if="!log.displayCollapse">
          <div class="arc-list-img-box">
            <img
              v-if="log.fightIcon"
              class="arc-list-preview-icon"
              :src="img('.' + log.fightIcon)"
              alt=""
              rel="noreferrer noopener"
            />
          </div>
          <div class="arc-list-img-bossname">
            <div>{{ log.fightName }}</div>
            <div>
              <span
                :class="{
                  'arc-list-img-result': true,
                  badge: true,
                  'bg-success': log.success,
                  'bg-danger': !log.success
                }"
                >{{ timeEndDiff(log, data.currenttime) }}</span
              >
            </div>
          </div>
          <span class="arc-list-img-logby badge bg-primary badge-pill">{{ log.recordedBy }}</span>
          <div>
            <span v-if="log.isUploading">⬆️</span>
            <span v-if="log.favourite">⭐</span>
          </div>
        </template>
      </a>
      <nav>
        <ul class="pagination justify-content-center">
          <li :class="{ 'page-item': true, disabled: data.logsPage <= 0 }">
            <a class="page-link" @click="showLogPage(0, null, $event as ClickEvent)">«</a>
          </li>
          <li :class="{ 'page-item': true, disabled: data.logsPage <= 0 }">
            <a
              class="page-link"
              @click="showLogPage(Math.max(data.logsPage - 1, 0), null, $event as ClickEvent)"
              >‹</a
            >
          </li>
          <li class="page-item disabled w-50 text-center">
            <a class="page-link">{{ data.logsPage + 1 }}/{{ data.logsMaxPages }}</a>
          </li>
          <li
            :class="{
              'page-item': true,
              disabled: data.logsPage >= data.logsMaxPages - 1
            }"
          >
            <a
              class="page-link"
              @click="
                showLogPage(
                  Math.min(data.logsMaxPages - 1, data.logsPage + 1),
                  null,
                  $event as ClickEvent
                )
              "
              >›</a
            >
          </li>
          <li
            :class="{
              'page-item': true,
              disabled: data.logsPage >= data.logsMaxPages - 1
            }"
          >
            <a
              class="page-link"
              @click="showLogPage(data.logsMaxPages - 1, null, $event as ClickEvent)"
              >»</a
            >
          </li>
        </ul>
      </nav>
    </div>
  </div>
</template>
