
<template>
  <v-expansion-panel variant="popout">
    <v-expansion-panel-title expand-icon="mdi-dots-vertical">
      GET /scv/dictionary/en/dpd/:paliWord/:vnameRoot/:vnameTrans
    </v-expansion-panel-title>
    <v-expansion-panel-text>
      <v-form :disabled="volatile.waiting">
        <v-container>
          <v-row centered>
            <v-col >
              <v-text-field v-model="settings.paliWord" 
                clearable density="compact" variant="underlined"
                label="paliWord"
                @keypress="onFetchKey"
                hint="E.g.: dhamma"
                required
                placeholder="Enter Pāli word" >
              </v-text-field>
              <v-text-field v-model="settings.vnameRoot" 
                clearable density="compact" variant="underlined"
                @keypress="onFetchKey"
                label="vnameRoot (AWS Polly voice)" 
                required
                placeholder='E.g., "Aditi"'>
              </v-text-field>
              <v-text-field v-model="settings.vnameTrans" 
                v-if="!ipa"
                clearable density="compact" variant="underlined"
                @keypress="onFetchKey"
                label="vnameTrans (AWS Polly voice)" 
                required
                placeholder='Default is "Amy"'>
              </v-text-field>
              <v-text-field v-model="ipa" 
                clearable density="compact" variant="underlined"
                @keypress="onFetchKey"
                label="custom IPA (optional)"
                optional
                >
              </v-text-field>
            </v-col>
          </v-row>
          <v-row align="center">
            <v-col cols="2">
              <v-btn :disabled="!valid" @click="onFetch">
                GET
              </v-btn>
            </v-col>
            <v-col>
              <a v-if="valid" :href="url" target="_blank">{{url}}</a>
            </v-col>
          </v-row>
          <v-row v-for="audioUrl in audioUrls" align="center">
            <div>
              <audio controls :src="audioUrl.url">
                {{audioUrl.url}}
              </audio>
            </div>
            <div class="ml-5">
              <a :href="audioUrl.url" target="_blank">{{audioUrl.text}}</a>
            </div>
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

  const results = ref(undefined); 
  const settings = useSettingsStore(); 
  const volatile = useVolatileStore();
  const guidRoot = ref(undefined);
  const audioUrls = ref([]);
  const ipa = ref('');

  const valid = computed(()=>{
    let { paliWord, vnameRoot, vnameTrans } = settings;
    return paliWord && vnameTrans && vnameRoot;
  })

  const url = computed(()=>{
    let { paliWord, vnameRoot, vnameTrans, } = settings;
    let endpoint = settings.scvEndpoint();
    let url = [ endpoint, 'dictionary', 'en' ];
    if (ipa.value) {
      url = [ ...url,
        'dpd-ipa',
        encodeURIComponent(paliWord),
        encodeURIComponent(vnameRoot),
        encodeURIComponent(ipa.value),
      ];
    } else {
      url = [ ...url,
        'dpd',
        encodeURIComponent(paliWord),
        encodeURIComponent(vnameRoot),
        encodeURIComponent(vnameTrans),
      ];
    }
    return url.join('/');
  })


  onMounted(()=>{
    console.log("Dictionary.mounted()");
  })

  async function onFetch(evt) {
    const msg = "Dictionary.onFetch()";
    let res;
    try {
      console.log(`${msg} url:`, url.value);
      results.value = undefined;
      let json = await volatile.fetchJson(url.value);
      res = json;
      let { 
        paliWord, paliGuid, ipa, definition, volume
      } = res;
      if ( paliGuid == null ) {
        console.log(msg, '[1]paliGuid?', res);
        return null;
      }
      let { 
        vnameTrans, vnameRoot,
      } = settings;
      let endpoint = settings.scvEndpoint();
      audioUrls.value = [{
        url: `${endpoint}/audio/dpd/pli/dpd/${vnameRoot}/${paliGuid}`,
        text: `${paliWord} (${ipa})`,
      }];
      console.log(msg, '[2] audioUrls', audioUrls);
    } catch(e) {
      const emsg = `${msg} ERROR: ${url.value} ${e.message}`;
      audioUrls.value = [{text:emsg}];
      console.error(`${msg} ERROR:`, res, e);
      res = emsg;
    } finally {
      console.log(msg, '[3]res', res);
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
