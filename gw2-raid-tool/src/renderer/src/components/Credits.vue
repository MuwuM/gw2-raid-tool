<script setup lang="ts">
import { api, data, i18n } from '@renderer/preload-api'
import { img } from '../util'
</script>
<template>
  <main id="credits" :class="{ 'with-bg': !data.baseConfig?.boringBg }">
    <div class="container pb-5">
      <img
        :src="img('/img/logo5-3.png')"
        alt="Logo of GW2 Raid Tool"
        style="display: block; width: 20rem; height: 20rem; margin: 0 auto"
      />
      <h1>Credits</h1>
      <h3 class="credits-name">GW2-Elite-Insights-Parser</h3>
      <div>
        {{ i18n.creditsEiPart1 }}
        <a href="https://baaron4.github.io/GW2-Elite-Insights-Parser/">Elite-Insights</a>
        {{ i18n.creditsEiPart2 }}
      </div>
      <span class="li-display-number-details">{{ i18n.licenseMit }}</span>

      <h3 class="credits-name">Electron</h3>
      <div>
        {{ i18n.creditsElectronPart1 }}
        <a :href="api.electronVersionUrl || 'https://www.electronjs.org/'">Electron</a>
        {{ i18n.creditsElectronPart2 }}
      </div>
      <div v-if="api.electronVersionString" class="li-display-number-details">
        {{ api.electronVersionString }}
      </div>
      <span class="li-display-number-details">{{ i18n.licenseMit }}</span>

      <h3 class="credits-name">Game-icons.net</h3>
      <div>
        {{ i18n.creditsGameIconsPart1 }}
        <a href="https://game-icons.net/">Game-icons.net</a>
        {{ i18n.creditsGameIconsPart2 }}
      </div>
      <span class="li-display-number-details">{{ i18n.licenseCCBY }}</span>

      <h2 class="credits-section">{{ i18n.licenseLabel }}</h2>
      <h3 class="credits-name">GW2 Raid Tool v{{ data.baseConfig.appVersion }}</h3>
      <div class="credits-law">
        <p>Copyright (c) 2021 MuwuM</p>
        <p>
          Permission is hereby granted, free of charge, to any person obtaining a copy of this
          software and associated documentation files (the "Software"), to deal in the Software
          without restriction, including without limitation the rights to use, copy, modify, merge,
          publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons
          to whom the Software is furnished to do so, subject to the following conditions:
        </p>
        <p>
          The above copyright notice and this permission notice shall be included in all copies or
          substantial portions of the Software.
        </p>
        <p>
          THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
          INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
          PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
          FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
          OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
          DEALINGS IN THE SOFTWARE.
        </p>
      </div>
      <span class="li-display-number-details">{{ i18n.licenseMit }}</span>

      <h2 class="credits-section">{{ i18n.creditsMorePackages }}</h2>
      <div class="credits-deps">
        <span v-for="dep of data.deps" :key="dep" class="credits-dep"
          ><a :href="'https://www.npmjs.com/package/' + encodeURIComponent(dep)">{{ dep }}</a
          ><template v-if="dep !== data.deps[data.deps.length - 1]">,</template></span
        >
      </div>
    </div>
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
