<script setup lang="ts">
import { i18n, killproofMeStats, AccountNameRegex } from '@renderer/preload-api'
import { img } from '../util'

const props = defineProps({ account: String })
</script>
<template>
  <div
    v-if="props.account && props.account.match(AccountNameRegex)"
    class="d-flex align-items-center"
  >
    <div>
      <a
        :href="'https://killproof.me/proof/' + encodeURIComponent(props.account)"
        class="btn btn-dark"
      >
        <img
          class="killproof-icon"
          :src="img('/img/killproof_logo_dark.svg')"
          :alt="i18n.killproofButton"
          :title="i18n.killproofButton"
        />
      </a>
    </div>
    <div class="li-section li-section-inline">
      <template v-for="kp in killproofMeStats(props.account)" :key="'friend' || kp">
        <div v-if="kp.totalKps === null" class="li-display">
          <span class="li-display-number-details">{{ i18n.killproofLoading }}</span>
        </div>
        <div v-if="kp.totalKps === false" class="li-display">
          <span class="li-display-number-details">{{ i18n.killproofNotFound }}</span>
        </div>
        <div v-if="kp.totalKps" class="li-display">
          <img class="li-display-img" :src="img('./img/1302744.png')" :alt="i18n.labelLi" />
          <span class="li-display-number">{{ kp.totalKps.li }}</span>
        </div>
        <div v-if="kp.totalKps" class="li-display">
          <img class="li-display-img" :src="img('./img/1202328.png')" :alt="i18n.labelFractal" />
          <span class="li-display-number">{{ kp.totalKps.fractal }}</span>
        </div>
        <div v-if="kp.totalKps" class="li-display">
          <img
            class="li-display-img"
            :src="img('./img/2314490.png')"
            :alt="i18n.labelBoneSkinner"
          />
          <span class="li-display-number">{{ kp.totalKps.boneSkinner }}</span>
        </div>

        <div class="wing-step-tooltip">
          <div class="wing-step-tooltip-title">{{ i18n.killproofHeader }}:</div>
          <div
            v-for="acc in kp.linkedAccounts"
            :key="acc.account"
            class="li-section li-section-grid"
          >
            <div class="li-display">
              {{ acc.account }}
            </div>
            <div class="li-display">
              <img class="li-display-img" :src="img('./img/1302744.png')" :alt="i18n.labelLi" />
              <span class="li-display-number">{{ acc.li }}</span>
            </div>
            <div class="li-display">
              <img
                class="li-display-img"
                :src="img('./img/1202328.png')"
                :alt="i18n.labelFractal"
              />
              <span class="li-display-number">{{ acc.fractal }}</span>
            </div>
            <div class="li-display">
              <img
                class="li-display-img"
                :src="img('./img/2314490.png')"
                :alt="i18n.labelBoneSkinner"
              />
              <span class="li-display-number">{{ acc.boneSkinner }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
