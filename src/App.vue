<template>
  <v-app>
    <v-main>
      <v-app-bar color="brown-darken-2" flat >
        <v-app-bar-title > 
          api.sc-voice.net 
          <div class="text-caption" style="margin-top:-5px"> 
            <div>{{settings.endpoint()}}</div>
          </div>
        </v-app-bar-title>
        <v-spacer/>
        <div class="pr-5"> <Version/> </div>
      </v-app-bar>
      <v-expansion-panels variant="inset">
        <EbtSite/>
        <Links/>
        <Search/>
        <PlaySegment/>
        <Download/>
        <v-expansion-panel variant="popout">
          <v-expansion-panel-title expand-icon="mdi-dots-vertical">
            Settings...
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-container>
              <v-row centered>
                <v-col >
                  <v-checkbox-btn v-model="settings.localApi" 
                    density="compact"
                    label="local endpoint"
                  />
                </v-col>
              </v-row>
            </v-container>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-main>
  </v-app>
</template>

<script>
import { useSettingsStore } from './stores/settings'
import { useVolatileStore } from './stores/volatile'
import Version from './components/Version.vue'
import EbtSite from './components/EbtSite.vue'
import Links from './components/Links.vue'
import Search from './components/Search.vue'
import PlaySegment from './components/PlaySegment.vue'
import Download from './components/Download.vue'

export default {
  data: ()=>({
    settings: useSettingsStore(),
    volatile: useVolatileStore(),
    unsubscribe: undefined,
  }),
  components: {
    Version,
    EbtSite,
    Links,
    Search,
    PlaySegment,
    Download,
  },
  methods: {
    allowLocalStorage() {
      let { settings } = this;
      settings.saveSettings();
      console.log("allowLocalStorage()", settings);
    },
  },
  mounted() {
    let { $vuetify, settings, } = this;
    $vuetify.theme.global.name = settings.theme === 'dark' ? 'dark' : 'light';;
    this.unsubscribe = settings.$subscribe((mutation, state) => {
      $vuetify.theme.global.name = settings.theme === 'dark' ? 'dark' : 'light';;
      console.debug("App.mounted() App.mounted() subscribe =>", {mutation, state});
      if (settings.isLocalStorage) {
        settings.saveSettings();
      }
    });
  },
}
</script>
