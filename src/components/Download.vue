<template>
  <v-expansion-panel variant="popout">
    <v-expansion-panel-title expand-icon="mdi-dots-vertical">
      GET /scv/build-download/:audioSuffix/:langs/:vtrans/:pattern/:vroot
    </v-expansion-panel-title>
    <v-expansion-panel-text>
      <v-form :disabled="volatile.waiting">
        <v-container>
          <v-row centered>
            <v-col >
              <v-text-field v-model="settings.audioSuffix" 
                clearable density="compact" variant="underlined"
                label="audioSuffix"
                @keypress="onFetchKey"
                placeholder="mp3"
                required
                hint='Enter audio suffix (e.g., "opus")'>
              </v-text-field>
              <v-text-field v-model="settings.langs" 
                clearable density="compact" variant="underlined"
                @keypress="onFetchKey"
                label="langTrans" 
                required
                placeholder="pli+en"
                hint="Enter ISO language code/codes for monolingual/bilingual audio">
              </v-text-field>
              <v-text-field v-model="settings.vnameTrans" 
                clearable density="compact" variant="underlined"
                @keypress="onFetchKey"
                label="Translation Narrator" 
                required
                hint="Enter narrator (e.g., AWS Polly name)"
                placeholder='Amy'>
              </v-text-field>
              <v-text-field v-model="settings.langTrans" 
                clearable density="compact" variant="underlined"
                @keypress="onFetchKey"
                label="Translation language"
                required
                placeholder='E.g., "de"'
                >
              </v-text-field>
              <v-text-field v-model="settings.search" 
                clearable density="compact" variant="underlined"
                @keypress="onFetchKey"
                label="scid (segment id)" 
                required
                placeholder='E.g., "thig1.1-3/en/soma"'>
              </v-text-field>
              <v-text-field v-model="settings.vnameRoot" 
                clearable density="compact" variant="underlined"
                @keypress="onFetchKey"
                label="Root-Text Narrator" 
                required
                hint="Enter narrator (e.g., 'Raveena')"
                placeholder='Aditi'>
              </v-text-field>
              <v-text-field v-model="settings.maxResults" 
                clearable density="compact" variant="underlined"
                @keypress="onFetchKey"
                label="Maximum Results" 
                required
                hint="Enter maximum number of suttas to download"
                placeholder='5'>
              </v-text-field>
              <v-text-field v-model="settings.maxDuration" 
                clearable density="compact" variant="underlined"
                @keypress="onFetchKey"
                label="Maximum Audio Size (seconds)" 
                required
                hint="Enter maximum duration for audio download"
                placeholder='18000'>
              </v-text-field>
            </v-col>
          </v-row>
          <v-col>
          <v-row align="center">
            <v-col cols="12" align="center">
              <v-btn :disabled="!valid" @click="onFetch">
                Build Audio
              </v-btn>
            </v-col>
          </v-row>
          </v-col>
          <v-row align="center">
            <v-col cols="12" align="center">
              <a v-if="valid" :href="urlBuild" target="_blank">{{urlBuild}}</a>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" align="center">
              <v-card v-if="filename" hover elevation=4 width="90%">
                <v-card-title>
                  <v-btn @click='downloadLink.click()'>
                    Download Audio
                  </v-btn>
                </v-card-title>
                <v-container>
                  <v-row v-if="filename" >
                    <v-col cols="2" align="end"> File name </v-col>
                    <v-col align="start"> {{filename}} </v-col>
                  </v-row>
                  <v-row v-if="filename" >
                    <v-col cols="2" align="end"> Guid </v-col>
                    <v-col align="start"> {{guid}} </v-col>
                  </v-row>
                  <v-row v-if="filename" >
                    <v-col cols="2" align="end">
                      Download Url
                    </v-col>
                    <v-col align="start">
                      <a ref="downloadLink" type="audio" :href="urlDownload">
                        {{urlDownload}}
                      </a>
                    </v-col>
                  </v-row>
                </v-container>
              </v-card>
            </v-col>
          </v-row>
          <v-row v-if="results">
            <v-col>
              <div class="text-h5">JSON</div>
              <pre>{{ JSON.stringify(results,null,2) }}</pre>
            </v-col>
          </v-row>
        </v-container>
      </v-form>
    </v-expansion-panel-text>
  </v-expansion-panel>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue';
  import { useSettingsStore } from "../stores/settings";
  import { useVolatileStore } from "../stores/volatile";

  const downloadLink = ref(undefined);
  const results = ref(undefined); 
  const settings = useSettingsStore(); 
  const volatile = useVolatileStore();
  const guidRoot = ref(undefined);
  const filename = ref(undefined);
  const guid = ref(undefined);

  const valid = computed(()=>{
    let { audioSuffix, langs, vnameTrans, search, vnameRoot } = settings;
    return audioSuffix && langs && vnameTrans && search != null;
  })

  const urlBuild = computed(()=>{
    let { 
      audioSuffix, langs, maxDuration, maxResults, 
      vnameRoot, vnameTrans, search, langTrans
    } = settings;
    let endpoint = settings.scvEndpoint();
    let url = [
      endpoint,
      `build-download`,
      encodeURIComponent(audioSuffix),
      langs,
      encodeURIComponent(vnameTrans),
      encodeURIComponent(search),
      encodeURIComponent(vnameRoot ?? 'Aditi'),
    ].join('/');

    url = `${url}?maxResults=${maxResults}`;
    if (maxDuration != null) {
      url = `${url}&maxDuration=${maxDuration}`;
    }
    if (langTrans != null) {
      url += `&lang=${langTrans}`;
    }
    return url;
  })

  const urlDownload = computed(()=>{
    let { 
      audioSuffix, langs, maxDuration, maxResults, 
      vnameRoot, vnameTrans, search, langTrans 
    } = settings;
    let endpoint = settings.scvEndpoint();
    let url = [
      endpoint,
      `download`,
      encodeURIComponent(audioSuffix),
      langs,
      encodeURIComponent(vnameTrans),
      encodeURIComponent(search),
      encodeURIComponent(vnameRoot),
    ].join('/');

    url = `${url}?maxResults=${maxResults}`;
    if (maxDuration != null) {
      url += `&maxDuration=${maxDuration}`;
    }
    if (langTrans != null) {
      url += `&lang=${langTrans}`;
    }
    return url;
  })

  onMounted(()=>{
    console.log("Download.mounted()");
  })

  function debug() {
    console.log("downloadLink", downloadLink.value);
  }

  async function onFetch(evt) {
    let res;
    try {
      console.log('Download.onFetch() url:', urlBuild.value);
      results.value = undefined;
      let json = await volatile.fetchJson(urlBuild.value);
      res = json;
      filename.value = json.filename;
      guid.value = json.guid;
    } catch(e) {
      console.error("Download.onFetch() ERROR:", res, e);
      res = `ERROR: ${url.value} ${e.message}`;
    } finally {
      results.value = res;
    }
  }

  function onFetchKey(evt) {
    if (evt.code === "Enter") {
      valid.value && onFetch(evt);
      evt.preventDefault();
    }
  }

</script>
<style scoped>
.download {
  border: 1pt solid red;
  border-radius: 5pt;
}
</style>
