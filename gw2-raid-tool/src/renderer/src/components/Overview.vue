<script setup lang="ts">
import { data, i18n, wings } from '@renderer/preload-api'

import { WingsResStep, WingsRef, UiAccounts, Kps } from '../../../raid-tool'
import { img, localizeName } from '@renderer/util'

function getTotalKps(kpName: keyof Kps): number {
  if (typeof data.totalKps[kpName] !== 'number') {
    return 0
  }
  return data.totalKps[kpName] as number
}

function firstTrigger(step: WingsResStep) {
  if (!step.triggerID) {
    return -1
  }
  if (Array.isArray(step.triggerID)) {
    return step.triggerID[0]
  }
  return step.triggerID
}

function bossUrl(step: WingsResStep) {
  if (!step.triggerID) {
    return ''
  }
  return 'gw2-log://logs/boss/' + encodeURIComponent(firstTrigger(step))
}
function overviewStatus(accounts: UiAccounts[], step: WingsResStep, wing: WingsRef) {
  let completed = false

  if (
    wing.isStrike &&
    wing.isStrikeWeekly &&
    accounts.find((a) => a.completedStrikesWeekly?.[firstTrigger(step)])
  ) {
    completed = true
  } else if (wing.isStrike && accounts.find((a) => a.completedStrikesDaily?.[firstTrigger(step)])) {
    completed = true
  } else if (
    wing.isFractal &&
    accounts.find((a) => a.completedFractalsDaily?.[firstTrigger(step)])
  ) {
    completed = true
  } else if (
    wing.missingApi &&
    accounts.find((a) => a.completedStrikesWeekly?.[firstTrigger(step)])
  ) {
    completed = true
  } else if (accounts.find((a) => a.completedSteps?.includes(step.id))) {
    completed = true
  }
  return {
    completed
  }
}

type SvgPart = {
  d: string
  fill: string
  opacity: number
}

function svgBossBorder(accounts: UiAccounts[], step: WingsResStep, wing: WingsRef) {
  const parts = [] as SvgPart[]
  let rot = 0
  const border = 12
  const width = 300
  const outline = width * 4
  const innerWidth = width - 2 * border
  const innerOutline = innerWidth * 4
  function formatX(x: number, w: number, offset: number) {
    let x1 = x % w
    if (x >= w * 3) {
      x1 = 0
    } else if (x >= w * 2) {
      x1 = w - x1
    } else if (x >= w) {
      x1 = w
    }
    return x1 + offset
  }
  function formatY(y: number, h: number, offset: number) {
    let x1 = y % h
    if (y >= h * 3) {
      x1 = h - x1
    } else if (y >= h * 2) {
      x1 = h
    } else if (y >= h) {
      //x1 = x1;
    } else {
      x1 = 0
    }
    return x1 + offset
  }
  for (const acc of accounts) {
    const rotEnd = rot + 1 / accounts.length
    const d = [] as string[]
    const startOutline = rot * outline
    const endOutline = rotEnd * outline
    const x1Outline = formatX(startOutline, width, 0)
    const y1Outline = formatY(startOutline, width, 0)
    let x2Outline = formatX(endOutline, width, 0)
    let y2Outline = formatY(endOutline, width, 0)

    const startInline = rot * innerOutline
    const endInline = rotEnd * innerOutline
    const x1Inline = formatX(startInline, innerWidth, border)
    const y1Inline = formatY(startInline, innerWidth, border)
    let x2Inline = formatX(endInline, innerWidth, border)
    let y2Inline = formatY(endInline, innerWidth, border)

    if (rotEnd === 1) {
      x2Outline = 0
      y2Outline = 0
      x2Inline = border
      y2Inline = border
    }

    d.push(`${x1Outline},${y1Outline}`)
    if (x1Outline !== x2Outline && y1Outline !== y2Outline) {
      for (let i = Math.ceil(rot * 4); i <= Math.floor(rotEnd * 4); i++) {
        if (i === 0) {
          d.push(`${0},${0}`)
        } else if (i === 1) {
          d.push(`${width},${0}`)
        } else if (i === 2) {
          d.push(`${width},${width}`)
        } else if (i === 3) {
          d.push(`${0},${width}`)
        }
      }
    }
    if (x1Outline === x2Outline && y1Outline === y2Outline) {
      for (let i = 0; i <= 3; i++) {
        if (i === 0) {
          d.push(`${0},${0}`)
        } else if (i === 1) {
          d.push(`${width},${0}`)
        } else if (i === 2) {
          d.push(`${width},${width}`)
        } else if (i === 3) {
          d.push(`${0},${width}`)
        }
      }
    }
    d.push(`${x2Outline},${y2Outline}`)
    d.push(`${x2Inline},${y2Inline}`)
    if (x1Outline !== x2Outline && y1Outline !== y2Outline) {
      for (let i = Math.floor(rotEnd * 4); i >= Math.ceil(rot * 4); i--) {
        if (i === 0) {
          d.push(`${border},${border}`)
        } else if (i === 1) {
          d.push(`${width - border},${border}`)
        } else if (i === 2) {
          d.push(`${width - border},${width - border}`)
        } else if (i === 3) {
          d.push(`${border},${width - border}`)
        }
      }
    }
    if (x1Outline === x2Outline && y1Outline === y2Outline) {
      for (let i = 3; i >= 1; i--) {
        if (i === 0) {
          d.push(`${border},${border}`)
        } else if (i === 1) {
          d.push(`${width - border},${border}`)
        } else if (i === 2) {
          d.push(`${width - border},${width - border}`)
        } else if (i === 3) {
          d.push(`${border},${width - border}`)
        }
      }
    }
    d.push(`${x1Inline},${y1Inline}`)
    rot = rotEnd
    let opacity = 0.2
    if (overviewStatusAcc(step, wing, acc).completed) {
      opacity = 1
    }
    parts.push({
      d: `M ${d.join(' L ')} Z`,
      fill: acc.color as string,
      opacity
    })
  }
  return parts
}

function firstTriggerId(step: WingsResStep) {
  if (Array.isArray(step.triggerID)) {
    return step.triggerID[0]
  }
  return step.triggerID || -1
}

function overviewStatusAcc(step: WingsResStep, wing: WingsRef, acc: UiAccounts) {
  let completed = false
  let completedCM = acc.completedCMs?.[firstTriggerId(step)] || false

  if (wing.isFractal) {
    completedCM = false
  }

  if (wing.isStrike && wing.isStrikeWeekly && acc.completedStrikesWeekly?.[firstTriggerId(step)]) {
    completed = true
  } else if (wing.isStrike && acc.completedStrikesDaily?.[firstTriggerId(step)]) {
    completed = true
  } else if (wing.isFractal && acc.completedFractalsDaily?.[firstTriggerId(step)]) {
    completed = true
    completedCM = acc.completedCMs?.[firstTriggerId(step)] || false
  } else if (wing.missingApi && acc.completedStrikesWeekly?.[firstTriggerId(step)]) {
    completed = true
  } else if (acc.completedSteps?.includes(step.id)) {
    completed = true
  }
  return {
    completed,
    completedCM
  }
}
function isDailyToday(wing: WingsRef, step: WingsResStep, dayOfYear: number) {
  return (
    typeof wing.hasDailies === 'number' &&
    wing.hasDailies > 0 &&
    step.dailyIndex === dayOfYear % wing.hasDailies
  )
}
</script>
<template>
  <main id="overview" :class="{ 'with-bg': !data.baseConfig?.boringBg }">
    <div class="wings">
      <div v-for="wing in wings" :key="wing.id" class="wing">
        <h3 v-if="!wing.w_img">W{{ wing.w }}</h3>
        <h3 v-if="wing.w_img" :title="wing[localizeName(data.lang)]">
          <img
            class="li-display-img"
            :src="img('./img/' + wing.w_img)"
            :alt="wing[localizeName(data.lang)]"
          /><span v-if="wing.w_img_text">{{ wing.w_img_text }}</span>
        </h3>
        <a
          v-for="step in wing.steps"
          :key="wing.id + '/' + step.id"
          :href="bossUrl(step)"
          :class="{
            'wing-step': true,
            'wing-step-completed': overviewStatus(data.accounts, step, wing).completed
          }"
          ><img
            class="wing-boss-icon"
            :src="img('./img/' + step.img)"
            :alt="step[localizeName(data.lang)]"
          />
          <svg class="wing-boss-border" viewBox="0 0 300 300">
            <path
              v-for="(p, index) in svgBossBorder(data.accounts, step, wing)"
              :key="index"
              :d="p.d"
              :style="{ fill: p.fill, opacity: p.opacity }"
            />
          </svg>

          <div class="wing-step-tooltip">
            <div class="wing-step-tooltip-title">{{ step[localizeName(data.lang)] }}:</div>
            <template v-if="!step.kpName && data.totalKps.raidBossKp?.[step.id] > 0">
              <div v-for="acc in data.accounts" :key="acc._id">
                <span
                  v-if="isDailyToday(wing, step, data.dayOfYear)"
                  :class="{
                    'wing-step-tooltip-mark': true,
                    'wing-step-tooltip-mark-open': !(
                      acc.completedStrikesDaily && acc.completedStrikesDaily[firstTrigger(step)]
                    )
                  }"
                >
                  <img
                    v-if="isDailyToday(wing, step, data.dayOfYear)"
                    :src="img('./img/Daily_Strike_Mission.png')"
                    class="daily-strike-icon"
                    :title="i18n.isDailyToday"
                  />
                </span>
                <span
                  v-if="overviewStatusAcc(step, wing, acc).completed"
                  class="wing-step-tooltip-mark"
                  >✓</span
                >
                <span
                  v-if="!overviewStatusAcc(step, wing, acc).completed"
                  class="wing-step-tooltip-mark wing-step-tooltip-mark-open"
                  >🗙</span
                >
                <span
                  v-if="step.hasCM && overviewStatusAcc(step, wing, acc).completedCM"
                  class="wing-step-tooltip-mark-cm"
                  >CM✓</span
                >
                <span
                  v-if="step.hasCM && !overviewStatusAcc(step, wing, acc).completedCM"
                  class="wing-step-tooltip-mark-cm wing-step-tooltip-mark-open"
                  >CM🗙</span
                >
                <strong v-if="acc.accountInfo?.name" :style="{ color: acc.color }"
                  >{{ acc.accountInfo.name }}:</strong
                >
                <span>{{ acc.kps.raidBossKp[step.id] || 0 }} KP</span>
              </div>
            </template>
            <template v-if="step.kpName && getTotalKps(step.kpName) > 0">
              <div v-for="acc in data.accounts" :key="acc._id">
                <span
                  v-if="isDailyToday(wing, step, data.dayOfYear)"
                  :class="{
                    'wing-step-tooltip-mark': true,
                    'wing-step-tooltip-mark-open': !(
                      acc.completedStrikesDaily && acc.completedStrikesDaily[firstTrigger(step)]
                    )
                  }"
                >
                  <img
                    v-if="isDailyToday(wing, step, data.dayOfYear)"
                    :src="img('./img/Daily_Strike_Mission.png')"
                    class="daily-strike-icon"
                    :title="i18n.isDailyToday"
                  />
                </span>
                <span
                  v-if="overviewStatusAcc(step, wing, acc).completed"
                  class="wing-step-tooltip-mark"
                  >✓</span
                >
                <span
                  v-if="!overviewStatusAcc(step, wing, acc).completed"
                  class="wing-step-tooltip-mark wing-step-tooltip-mark-open"
                  >🗙</span
                >
                <span
                  v-if="step.hasCM && overviewStatusAcc(step, wing, acc).completedCM"
                  class="wing-step-tooltip-mark-cm"
                  >CM✓</span
                >
                <span
                  v-if="step.hasCM && !overviewStatusAcc(step, wing, acc).completedCM"
                  class="wing-step-tooltip-mark-cm wing-step-tooltip-mark-open"
                  >CM🗙</span
                >
                <strong v-if="acc.accountInfo?.name" :style="{ color: acc.color }"
                  >{{ acc.accountInfo.name }}:</strong
                >
                <span>{{ acc.kps[step.kpName] || 0 }} KP</span>
              </div>
            </template>
            <template
              v-if="
                !(
                  !step.kpName &&
                  data.totalKps.raidBossKp &&
                  data.totalKps.raidBossKp[step.id] > 0
                ) && !(step.kpName && getTotalKps(step.kpName) > 0)
              "
            >
              <span class="li-display-number-details">{{ i18n.noKP }}</span>
              <div v-for="acc in data.accounts" :key="acc._id">
                <span
                  v-if="isDailyToday(wing, step, data.dayOfYear)"
                  :class="{
                    'wing-step-tooltip-mark': true,
                    'wing-step-tooltip-mark-open': !acc.completedStrikesDaily?.[firstTrigger(step)]
                  }"
                >
                  <img
                    v-if="isDailyToday(wing, step, data.dayOfYear)"
                    :src="img('./img/Daily_Strike_Mission.png')"
                    class="daily-strike-icon"
                    :title="i18n.isDailyToday"
                  />
                </span>
                <span
                  v-if="overviewStatusAcc(step, wing, acc).completed"
                  class="wing-step-tooltip-mark"
                  >✓</span
                >
                <span
                  v-if="!overviewStatusAcc(step, wing, acc).completed"
                  class="wing-step-tooltip-mark wing-step-tooltip-mark-open"
                  >🗙</span
                >
                <span
                  v-if="step.hasCM && overviewStatusAcc(step, wing, acc).completedCM"
                  class="wing-step-tooltip-mark-cm"
                  >CM✓</span
                >
                <span
                  v-if="step.hasCM && !overviewStatusAcc(step, wing, acc).completedCM"
                  class="wing-step-tooltip-mark-cm wing-step-tooltip-mark-open"
                  >CM🗙</span
                >
                <strong v-if="acc.accountInfo?.name" :style="{ color: acc.color }">{{
                  acc.accountInfo.name
                }}</strong>
              </div>
            </template>
            <span
              v-if="(wing.isStrike && !wing.isStrikeWeekly) || wing.isFractal"
              class="li-display-number-details"
              >{{ i18n.dailyResetInfo }}</span
            >
            <span v-else class="li-display-number-details">{{ i18n.weeklyResetInfo }}</span>
            <span v-if="isDailyToday(wing, step, data.dayOfYear)" class="li-display-number-details">
              <img
                :src="img('./img/Daily_Strike_Mission.png')"
                class="daily-strike-icon"
                :title="i18n.isDailyToday"
              />
              {{ i18n.isDailyToday }}
            </span>
          </div>
          <img
            v-if="isDailyToday(wing, step, data.dayOfYear)"
            :src="img('./img/Daily_Strike_Mission.png')"
            class="wing-boss-is-daily-today"
            :title="i18n.isDailyToday"
          />
        </a>
      </div>
    </div>
    <div class="li-section">
      <div class="li-display">
        <img class="li-display-img" :src="img('./img/1302744.png')" :alt="i18n.labelLi" />
        <span class="li-display-number">{{ data.totalKps.li }}</span>
        <span class="li-display-number-per-acc">
          <span v-for="acc in data.accounts" :key="acc._id" class="li-display-acc">
            <span
              v-if="acc.accountInfo?.name"
              class="li-display-acc-name"
              :style="{ color: acc.color }"
              >{{ acc.accountInfo.name }}</span
            >:
            <span class="li-display-acc-kp">{{ i18n.showLiLd(acc.kps.li || 0) }}</span>
          </span>
        </span>
      </div>
      <div class="li-display">
        <img class="li-display-img" :src="img('./img/1202328.png')" :alt="i18n.labelFractal" />
        <span class="li-display-number">{{ data.totalKps.fractal }}</span>

        <span class="li-display-number-per-acc">
          <span v-for="acc in data.accounts" :key="acc._id" class="li-display-acc">
            <span
              v-if="acc.accountInfo?.name"
              class="li-display-acc-name"
              :style="{ color: acc.color }"
              >{{ acc.accountInfo.name }}</span
            >:
            <span class="li-display-acc-kp">{{ i18n.showKp(acc.kps.fractal || 0) }}</span>
          </span>
        </span>
      </div>
      <div class="li-display">
        <img class="li-display-img" :src="img('./img/2314490.png')" :alt="i18n.labelBoneSkinner" />
        <span class="li-display-number">{{ data.totalKps.boneSkinner }}</span>
        <span class="li-display-number-per-acc">
          <span v-for="acc in data.accounts" :key="acc._id" class="li-display-acc">
            <span
              v-if="acc.accountInfo?.name"
              class="li-display-acc-name"
              :style="{ color: acc.color }"
              >{{ acc.accountInfo.name }}</span
            >:
            <span class="li-display-acc-kp">{{ i18n.showKp(acc.kps.boneSkinner || 0) }}</span>
          </span>
        </span>
      </div>
      <div v-if="data.zhaitaffy" class="li-display">
        <img class="li-display-img" :src="img('./img/591443.png')" :alt="i18n.labelZhaitaffy1000" />
        <span class="li-display-number">{{ Math.floor(data.totalKps.zhaitaffy / 1000) }}</span>
        <img class="li-display-img" :src="img('./img/591442.png')" :alt="i18n.labelZhaitaffy" />
        <span class="li-display-number">{{ data.totalKps.zhaitaffy % 1000 }}</span>
      </div>
    </div>
    <template
      v-for="acc in data.accounts.filter(
        (acc) => acc.kps?.unopenedBoxes && acc.kps.unopenedBoxes.length > 0 && acc.accountInfo?.name
      )"
      :key="acc._id"
    >
      <template v-for="wing in wings" :key="wing.id">
        <template v-for="step in wing.steps" :key="wing.id + '/' + step.id">
          <template
            v-for="box in acc.kps.unopenedBoxes.filter((box) => step.id === box.boss)"
            :key="box.boss + '/' + box.item['@char']"
          >
            <div class="li-display">
              <img class="li-display-img" :src="img('./img/1302747.png')" />
              <span class="li-display-number"
                >{{ box.item.count }}x {{ step[localizeName(data.lang)] }}</span
              >
              <span class="li-display-number-details"
                >{{ box.item['@char'] || '' }}
                <template v-if="acc.accountInfo?.name">{{
                  '(' + acc.accountInfo.name + ') '
                }}</template></span
              >
              <span v-if="box.bossKp > 0" class="li-display-number"
                >{{ box.bossKp }}-{{ box.bossKp * 5 }}x
                <img class="li-display-img" :src="img('./img/' + step.img)"
              /></span>
              <span class="li-display-number"
                >{{ box.item.count }}x <img class="li-display-img" :src="img('./img/1302744.png')"
              /></span>
            </div>
          </template>
        </template>
      </template>
    </template>
  </main>
  <template v-if="!data.baseConfig?.boringBg">
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
</template>
