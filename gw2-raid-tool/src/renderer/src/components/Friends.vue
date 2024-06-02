<script setup lang="ts">
import { AccountNameRegex, data, i18n } from '@renderer/preload-api'
import { img } from '../util'
import { computed } from 'vue'
import Fuse from 'fuse.js'
import { UiFriends } from 'src/raid-tool'
import KpMeDisplay from './KpMeDisplay.vue'

const fuse = computed(() => {
  return new Fuse(data.friends, {
    keys: [
      { name: 'account', weight: 0.3 },
      { name: 'chars.name', weight: 0.7 }
    ],
    includeScore: true
  })
})

type OptionalFuseSearchResult = Array<{
  item: UiFriends
  score?: number
}>

const filteredFriends = computed<OptionalFuseSearchResult>(() => {
  if (data.searchFriends === '') {
    return data.friends.map((f) => ({ item: f }))
  }
  if (data.searchFriends.match(AccountNameRegex)) {
    const cleanSearch = data.searchFriends.trim()
    const friendsById = data.friends.filter((f) => f.account === cleanSearch)
    if (friendsById.length > 0) {
      return friendsById.map(() => ({ item: friendsById[0] }))
    }
    const similarFriends = fuse.value.search(cleanSearch).map((f) => {
      return { item: f.item, score: (f.score || 0) + 1 }
    })
    similarFriends.unshift({
      item: {
        _id: 'new',
        account: cleanSearch,
        chars: [],
        sharedLogs: 0
      },
      score: 0
    })
    return similarFriends
  }
  return fuse.value.search(data.searchFriends)
})

const isPerfectMatch = computed(() => {
  return (
    filteredFriends.value.length === 1 ||
    (filteredFriends.value.length > 1 &&
      typeof filteredFriends.value[0].score === 'number' &&
      typeof filteredFriends.value[1].score === 'number' &&
      filteredFriends.value[1].score - filteredFriends.value[0].score > 0.1)
  )
})
</script>
<template>
  <main id="friends">
    <div class="navbar navbar-expand-lg navbar-dark bg-dark sticky-top">
      <div class="container-fluid">
        <div class="input-group">
          <input
            v-model="data.searchFriends"
            type="text"
            class="form-control"
            :placeholder="i18n.friendsSearch"
          />
          <button class="btn btn-outline-secondary" @click="data.searchFriends = ''">X</button>
        </div>
      </div>
    </div>
    <div v-if="isPerfectMatch" class="container">
      <div class="card">
        <div class="card-header text-bg-secondary fs-4">
          {{ filteredFriends[0].item.account }}
          <span v-if="filteredFriends[0].item._id === 'new'" class="text-warning fs-5 fst-italic">{{
            i18n.unknownFriend
          }}</span>
        </div>
        <div class="card-body">
          <div class="friend-badges">
            <span
              v-for="n in filteredFriends[0].item.chars || []"
              :key="n.name"
              class="friend-badge"
              ><img
                class="friend-icon"
                :src="img('/img/profession/' + n.profession[0].name + '.png')"
              />
              <span class="friend-name">{{ n.name }}</span></span
            >
          </div>
          <div>
            <span class="text-with-info-tooltip" :title="i18n.sharedLogsLabelInfo">{{
              i18n.sharedLogsLabel
            }}</span
            >: {{ filteredFriends[0].item.sharedLogs }}
          </div>
        </div>
        <div class="card-footer d-flex align-items-center justify-content-between">
          <a
            v-if="filteredFriends[0].item._id !== 'new'"
            :href="'gw2-log://logs/friends/' + encodeURIComponent(filteredFriends[0].item.account)"
            class="btn btn-primary me-1"
          >
            {{ i18n.friendsPerfectMatchButton }}
          </a>
          <KpMeDisplay
            v-if="filteredFriends[0].item"
            :account="filteredFriends[0].item.account"
          ></KpMeDisplay>
        </div>
      </div>
    </div>
    <div class="friends-table">
      <div key="$header" class="friends-table-header sticky-top bg-dark">
        <div class="friends-table-cell">{{ i18n.friendsHeaderAccount }}</div>
        <div class="friends-table-cell">{{ i18n.friendsHeaderNames }}</div>
        <div class="friends-table-cell" :title="i18n.sharedLogsLabelInfo">
          <span class="text-with-info-tooltip"> {{ i18n.friendsHeaderKills }}</span>
        </div>
      </div>
      <div v-for="friend in filteredFriends" :key="friend.item._id" class="friends-table-row">
        <div class="friends-table-cell">
          <a
            v-if="friend.item._id !== 'new'"
            :href="'gw2-log://logs/friends/' + encodeURIComponent(friend.item.account)"
            >{{ friend.item.account }}</a
          >
          <span v-else>{{ friend.item.account }}</span>
        </div>
        <div class="friends-table-cell friend-badges">
          <span v-for="n in friend.item.chars || []" :key="n.name" class="friend-badge">
            <img
              class="friend-icon"
              :src="img('/img/profession/' + n.profession[0].name + '.png')"
            />
            <span class="friend-name">{{ n.name }}</span>
          </span>
        </div>
        <div class="friends-table-cell">{{ friend.item.sharedLogs }}</div>
      </div>
    </div>
  </main>
</template>
