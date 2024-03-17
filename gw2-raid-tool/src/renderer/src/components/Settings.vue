<script setup lang="ts">
import { data, i18n, api } from "@renderer/preload-api";
import { preventDefault } from "../util";
import { ClickEvent, ClickOnButtonEvent, Lang } from "src/raid-tool";

function removeAccount(token: string, event: ClickEvent) {
  preventDefault(event);
  api.removeAccount({ token });
}
function addAccount(token: string, event: ClickEvent) {
  preventDefault(event);
  //console.log({ token });
  api.addAccount({ token });
  data.token = "";
}
function changeLang(lang: Lang, event?: ClickEvent) {
  preventDefault(event);
  api.changeLang({ lang });
}
function selectGw2Dir(event: ClickEvent) {
  preventDefault(event);
  api.selectGw2Dir({});
}
function selectLaunchBuddyDir(event: ClickEvent) {
  preventDefault(event);
  api.selectLaunchBuddyDir({});
}
function removeLaunchBuddyDir(event: ClickEvent) {
  preventDefault(event);
  api.removeLaunchBuddyDir({});
}
function resetAllLogs(confirmReset: string, event: ClickEvent) {
  preventDefault(event);
  api.resetAllLogs({ confirmReset });
  data.confirmReset = "";
}
function enableArcUpdates(event: ClickEvent) {
  preventDefault(event);
  api.enableArcUpdates({});
}
function updateArcDps11(event: ClickEvent) {
  preventDefault(event);
  api.updateArcDps11({});
}
function checkArcUpdates(event: ClickEvent) {
  preventDefault(event);
  api.checkArcUpdates({});
}
function disableArcUpdates(event: ClickEvent) {
  preventDefault(event);
  api.disableArcUpdates({});
}
</script>
<template>
  <main id="settings">
    <div class="container">
      <h1>{{ i18n.headerSettings }}</h1>
      <table class="table table-hover">
        <thead>
          <tr>
            <th scope="col">{{ i18n.headerSettingsAcount }}</th>
            <th scope="col">{{ i18n.headerSettingsToken }}</th>
            <!--<th scope="col"></th>-->
            <th scope="col"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="acc in data.accounts">
            <th scope="row">{{ acc.accountInfo?.name || "???" }}</th>
            <td>{{ acc.token ? "*****" : "" }}</td>
            <!--<td>Column content</td>-->
            <td>
              <button
                class="btn btn-danger"
                @click="removeAccount(acc.token, $event as ClickOnButtonEvent)"
              >
                Löschen
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="form-group mt-5">
        <div>
          {{ i18n.settingsApiKeyInfo
          }}<a href="https://account.arena.net/applications"
            >https://account.arena.net/applications</a
          >{{ i18n.settingsApiKeyInfo2 }}
        </div>
        <div class="input-group mb-3">
          <input
            class="form-control"
            type="text"
            name="token"
            :placeholder="i18n.settingsAddTokenTokenPlaceholder"
            v-model="data.token"
          />
          <button
            class="btn btn-primary"
            type="submit"
            @click="addAccount(data.token, $event as ClickOnButtonEvent)"
          >
            {{ i18n.settingsAddTokenToken }}
          </button>
        </div>
      </div>

      <div class="form-group mt-5">
        <div>{{ i18n.settingsLanguage }}</div>
        <div class="input-group mb-3">
          <select
            class="form-control"
            name="lang"
            v-model="data.lang"
            @change="changeLang(data.lang)"
          >
            <option v-for="ln in data.langs" :value="ln.id">{{ ln.label }}</option>
          </select>
          <div class="input-group-append" v-if="data.lang === data.baseConfig.lang">
            <span class="input-group-text">✔️</span>
          </div>
        </div>
      </div>

      <div class="form-group mt-5">
        <div>{{ i18n.settingsGw2Dir }}</div>
        <div>{{ data.baseConfig.gw2Dir }}\Gw2-64.exe</div>
        <button
          class="btn btn-primary"
          type="submit"
          @click="selectGw2Dir($event as ClickOnButtonEvent)"
        >
          {{ i18n.settingsChangeButton }}
        </button>
        {{ i18n.settingsRequiresRestart }}
      </div>

      <div class="form-group mt-5">
        <div>{{ i18n.settingsArcdpsLogDir }}</div>
        <div>{{ data.baseConfig.logsPath }}</div>
        <div class="font-italic">{{ i18n.fromArcConfig }}</div>
        <!--<input class="btn btn-primary" type="submit" :value="i18n.settingsChangeButton" @click="selectLogsPath($event)"> {{i18n.settingsRequiresRestart}}-->
      </div>

      <div class="form-group mt-5">
        <div>{{ i18n.settingsLaunchBuddyDir }}</div>

        <div v-if="data.baseConfig.launchBuddyDir">
          {{ data.baseConfig.launchBuddyDir }}\Gw2.Launchbuddy.exe
        </div>
        <div v-if="!data.baseConfig.launchBuddyDir" class="font-italic">
          {{ i18n.notInstalled }}
        </div>
        <button
          class="btn btn-primary"
          type="submit"
          @click="selectLaunchBuddyDir($event as ClickOnButtonEvent)"
        >
          {{ i18n.settingsChangeButton }}
        </button>
        <button
          v-if="data.baseConfig.launchBuddyDir"
          class="btn btn-danger"
          @click="removeLaunchBuddyDir($event as ClickOnButtonEvent)"
        >
          {{ i18n.settingsDeleteButton }}
        </button>
      </div>

      <div class="form-group mt-5">
        <input
          class="form-control"
          type="text"
          name="reset"
          v-model="data.confirmReset"
          :placeholder="i18n.settingsResetPlaceholder"
        />
        <button
          class="btn btn-primary"
          type="submit"
          @click="resetAllLogs(data.confirmReset, $event as ClickOnButtonEvent)"
        >
          {{ i18n.settingsResetButton }}
        </button>
        {{ i18n.settingsResetTakesLong }}
      </div>

      <div class="form-group mt-5">
        <div>{{ i18n.settingsArcDpsEnabled }}</div>

        <template v-if="data.baseConfig.arcDisabled">
          <div class="font-italic">{{ i18n.settingsArcDpsSetDisabled }}</div>
          <a
            class="btn btn-success"
            href="#"
            @click="enableArcUpdates($event as ClickEvent)"
            >{{ i18n.settingsEnableButton }}</a
          >
        </template>
        <template v-if="!data.baseConfig.arcDisabled">
          <div>
            <!--<div class="li-display-number-details">arcdps (Dx 9): {{baseConfig.arcdpsVersionDate}} <a v-if="baseConfig.arcdpsVersionHasUpdates" @click="updateArcDps($event)">Update verfügbar</a></div>-->
            <div class="li-display-number-details">
              arcdps (Dx 11): {{ data.baseConfig.arcdps11VersionDate }}
              <a
                v-if="data.baseConfig.arcdps11VersionHasUpdates"
                @click="updateArcDps11($event as ClickEvent)"
                >Update verfügbar</a
              >
            </div>
          </div>
          <a
            class="btn btn-success"
            href="#"
            @click="checkArcUpdates($event as ClickEvent)"
            >{{ i18n.settingsCheckUpdatesButton }}</a
          >
          <a
            class="btn btn-danger"
            href="#"
            @click="disableArcUpdates($event as ClickEvent)"
            >{{ i18n.settingsDisableButton }}</a
          >
        </template>
      </div>
    </div>
    <div class="container" style="margin: 5rem auto">
      <div class="li-display-number-details">
        GW2 Raid Tool: v{{ data.baseConfig.appVersion }}
      </div>
      <div class="li-display-number-details">
        EI-Version: {{ data.baseConfig.ei_version }}
      </div>
    </div>
  </main>
</template>
