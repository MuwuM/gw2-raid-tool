<script setup lang="ts">
import { api, data, i18n, uniqueSpecs } from '@renderer/preload-api'
import { preventDefault, img } from '@renderer/util'
import {
  ChangeOnInputEvent,
  ChangeOnSelectEvent,
  ClickOnButtonEvent,
  UiBlockedKeyRules
} from 'src/raid-tool'
const validAhkKeys =
  /(^\S$)|(^F\d$)|(^F\d\d$)|(^CapsLock$)|(^Space$)|(^Tab$)|(^Enter$)|(^Escape$)|(^Esc$)|(^Backspace$)|(^ScrollLock$)|(^Delete$)|(^Del$)|(^Insert$)|(^Ins$)|(^Home$)|(^End$)|(^PgUp$)|(^PgDn$)|(^Up$)|(^Down$)|(^Left$)|(^Right$)|(^Numpad\d$)|(^NumpadDot$)|(^NumLock$)|(^NumpadDiv$)|(^NumpadMult$)|(^NumpadAdd$)|(^NumpadSub$)|(^NumpadEnter$)|(^[LR]Win$)|(^[LR]?Control$)|(^[LR]?Ctrl$)|(^[LR]?Alt$)|(^[LR]?Shift$)/

function updateKeyRuleSpec(keyRule: UiBlockedKeyRules, event: ChangeOnSelectEvent) {
  preventDefault(event)
  keyRule.spec = event.target.value || ''
  api.ipc.send.updateKeyRule({ keyRule })
}
function updateKeyRuleSlot(keyRule: UiBlockedKeyRules, event: ChangeOnSelectEvent) {
  preventDefault(event)
  keyRule.slot = event.target.value || ''
  api.ipc.send.updateKeyRule({ keyRule })
}
function updateKeyRuleKeys(keyRule: UiBlockedKeyRules, event: ChangeOnInputEvent) {
  preventDefault(event)
  keyRule.keys = event.target.value || ''
  api.ipc.send.updateKeyRule({ keyRule })
}
function updateKeyRuleActive(keyRule: UiBlockedKeyRules, event: ChangeOnInputEvent) {
  preventDefault(event)
  keyRule.active = event.target.checked
  api.ipc.send.updateKeyRule({ keyRule })
}
function deleteKeyRule(keyRule: UiBlockedKeyRules, event: ClickOnButtonEvent) {
  preventDefault(event)
  api.ipc.send.deleteKeyRule({ keyRule })
}
function addKeyRule(event: ClickOnButtonEvent) {
  preventDefault(event)
  api.ipc.send.addKeyRule({})
}
</script>
<template>
  <main id="keys">
    <div v-if="data.baseConfig.isAdmin">
      <table class="table">
        <thead>
          <tr class="sticky-top bg-dark">
            <th scope="col" class="col-3">
              <div>{{ i18n.buildClassHeaderName }}</div>
            </th>
            <th scope="col" class="col-2">
              <div>{{ i18n.keySlotHeaderName }}</div>
            </th>
            <th scope="col" class="col-2">
              <a href="https://www.autohotkey.com/docs/KeyList.htm#keyboard">
                {{ i18n.keyKeysHeaderName }}</a
              >
            </th>
            <th scope="col" class="col-2">{{ i18n.keyActiveHeaderName }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="keyRule in data.keyRules || []" :key="keyRule._id">
            <td>
              <div class="build-row-profession">
                <img
                  v-if="keyRule.spec"
                  class="build-row-profession-icon"
                  :src="img('/img/profession/' + keyRule.spec + '.png')"
                />

                <select
                  v-model="keyRule.spec"
                  class="form-control"
                  @change="updateKeyRuleSpec(keyRule, $event as ChangeOnSelectEvent)"
                >
                  <option value="">{{ i18n.keyRuleAllSpecs }}</option>
                  <option v-for="spec in uniqueSpecs" :key="spec" :value="spec">
                    {{ spec }}
                  </option>
                </select>
              </div>
            </td>
            <td>
              <select
                v-model="keyRule.slot"
                class="form-control"
                @change="updateKeyRuleSlot(keyRule, $event as ChangeOnSelectEvent)"
              >
                <option value="">{{ i18n.keyRuleNoSlot }}</option>
                <option
                  v-for="option in data.baseConfig.possibleSlots"
                  :key="option.slot"
                  :value="option.slot"
                >
                  {{ option.slot }}
                </option>
              </select>
            </td>
            <td>
              <input
                v-model="keyRule.keys"
                class="form-control"
                type="text"
                @change="updateKeyRuleKeys(keyRule, $event as ChangeOnInputEvent)"
              />
              <div>
                <span
                  v-for="key in (keyRule.keys || '').split(' ').filter((s) => s)"
                  :key="key"
                  class="m-1"
                  ><kbd :class="{ 'bg-danger': !key.match(validAhkKeys) }">{{ key }}</kbd></span
                >
              </div>
            </td>
            <td>
              <div class="build-row-profession">
                <input
                  class="form-check-input position-static"
                  type="checkbox"
                  :checked="keyRule.active"
                  @change="updateKeyRuleActive(keyRule, $event as ChangeOnInputEvent)"
                />
                <button
                  v-if="!keyRule.active"
                  class="btn btn-outline-danger ms-3"
                  @click="deleteKeyRule(keyRule, $event as ClickOnButtonEvent)"
                >
                  {{ i18n.keyRuleDelete }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <button class="btn btn-primary" @click="addKeyRule($event as ClickOnButtonEvent)">
        {{ i18n.addKeyRule }}
      </button>
    </div>
    <div v-if="!data.baseConfig.isAdmin">
      <h2>{{ i18n.keyRuleRequireAdmin }}</h2>
    </div>
  </main>
</template>
