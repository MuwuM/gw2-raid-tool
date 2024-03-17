<script setup lang="ts">
import { data, i18n } from '@renderer/preload-api'
import { img } from '../util'
</script>
<template>
  <main id="friends">
    <table class="table">
      <thead>
        <tr class="sticky-top bg-dark">
          <th scope="col">{{ i18n.friendsHeaderAccount }}</th>
          <th scope="col">{{ i18n.friendsHeaderNames }}</th>
          <!--<th scope="col">Groups</th>-->
          <th scope="col" :title="i18n.friendsHeaderSharedKills">
            {{ i18n.friendsHeaderKills }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="friend in data.friends" :key="friend._id">
          <th scope="row">
            <a :href="'gw2-log:logs/friends/' + encodeURIComponent(friend.account)">{{
              friend.account
            }}</a>
          </th>
          <td class="friend-badges">
            <span v-for="n in friend.chars || []" :key="n.name" class="friend-badge">
              <img
                class="friend-icon"
                :src="img('/img/profession/' + n.profession[0].name + '.png')"
              />
              <span class="friend-name">{{ n.name }}</span>
            </span>
          </td>
          <!--<td>Column content</td>-->
          <td>{{ friend.sharedLogs }}</td>
        </tr>
      </tbody>
    </table>
  </main>
</template>
