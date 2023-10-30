
<template>
  <v-expansion-panel variant="popout">
    <v-expansion-panel-title expand-icon="mdi-dots-vertical">
      GET /scv/play/segment/:sutta_uid/:langTrans/:translator/:scid/:vnameTrans
    </v-expansion-panel-title>
    <v-expansion-panel-text>
      <v-form :disabled="volatile.waiting">
        <v-container>
          <v-row centered>
            <v-col >
              <v-text-field v-model="settings.sutta_uid" 
                clearable density="compact" variant="underlined"
                label="sutta_uid"
                @keypress="onFetchKey"
                hint="E.g.: thig1.1"
                required
                placeholder="Enter sutta id (e.g., thig1.1">
              </v-text-field>
              <v-text-field v-model="settings.langTrans" 
                clearable density="compact" variant="underlined"
                @keypress="onFetchKey"
                label="langTrans" 
                required
                placeholder="Enter two-letter ISO language code">
              </v-text-field>
              <v-text-field v-model="settings.translator" 
                clearable density="compact" variant="underlined"
                @keypress="onFetchKey"
                label="translator" 
                required
                placeholder='E.g., "sujato"'>
              </v-text-field>
              <v-text-field v-model="settings.scid" 
                clearable density="compact" variant="underlined"
                @keypress="onFetchKey"
                label="scid (segment id)" 
                required
                placeholder='E.g., "thig1.1:1.1"'>
              </v-text-field>
              <v-text-field v-model="settings.vnameTrans" 
                clearable density="compact" variant="underlined"
                @keypress="onFetchKey"
                label="vnameTrans (AWS Polly voice)" 
                required
                placeholder='E.g., "Amy"'>
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
            <v-col cols="5">
              <audio controls :src="audioUrl.url">
                {{audioUrl.url}}
              </audio>
            </v-col>
            <v-col cols="7">
              {{audioUrl.text}}
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

  const results = ref(undefined); 
  const settings = useSettingsStore(); 
  const volatile = useVolatileStore();
  const guidRoot = ref(undefined);

  const valid = computed(()=>{
    let { sutta_uid, scid, langTrans, translator, vnameTrans } = settings;
    return sutta_uid && scid && langTrans && translator && vnameTrans != null;
  })

  const url = computed(()=>{
    let { sutta_uid, scid, langTrans, translator, vnameTrans } = settings;
    let endpoint = settings.scvEndpoint();
    let url = [
      endpoint,
      `play/segment`,
      encodeURIComponent(sutta_uid),
      encodeURIComponent(langTrans),
      encodeURIComponent(translator),
      encodeURIComponent(scid),
      encodeURIComponent(vnameTrans),
    ].join('/');
    return url;
  })

  const audioUrls = computed(()=>{
    let segment = results.value?.segment;
    let audio = segment?.audio;
    if ( audio == null ) {
      return null;
    }
    let { 
      sutta_uid, scid, langTrans, translator, vnameTrans, vnameRoot,
    } = settings;
    let endpoint = settings.scvEndpoint();
    return Object.keys(audio).reduce((a, k) => {
      if (k !== "vnameTrans") {
        let prefix = [endpoint, 'audio', sutta_uid, k];
        let guid = audio[k];
        let urlParts = k === "pli"
          ? prefix.concat(["ms", vnameRoot, guid])
          : prefix.concat([translator, vnameTrans, guid]);
        a.push({
          lang: k,
          url: urlParts.join('/'),
          text: segment[k],
        });
      }
      return a;
    }, []);
  })


  onMounted(()=>{
    console.log("PlaySegment.mounted()");
  })

  async function onFetch(evt) {
    let res;
    try {
      console.log('PlaySegment.onFetch() url:', url.value);
      results.value = undefined;
      let json = await volatile.fetchJson(url.value);
      res = json;
    } catch(e) {
      console.error("PlaySegment.onFetch() ERROR:", res, e);
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
