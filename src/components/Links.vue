<template>
  <v-expansion-panel variant="popout">
    <v-expansion-panel-title expand-icon="mdi-dots-vertical">
      GET /scv/links/:sutta_uid/:lang/:author
    </v-expansion-panel-title>
    <v-expansion-panel-text>
      <v-container>
        <v-row centered>
          <v-col >
            <v-text-field v-model="settings.sutta_uid" 
              clearable density="compact" variant="underlined"
              label="pattern"
              @click:append="onLinks"
              @click:clear="onLinks"
              @keypress="onLinks"
              :append-icon="settings.sutta_uid ? 'mdi-magnify' : ''"
              hint="Required"
              placeholder="Enter sutta id">
            </v-text-field>
            <v-text-field v-model="settings.langTrans" 
              clearable density="compact" variant="underlined"
              label="lang" 
              @click:append="onLinks"
              @click:clear="onLinksCleared"
              @keypress="onLinksKey"
              hint="Optional"
              placeholder="Enter two-letter ISO language code">
            </v-text-field>
            <v-text-field v-model="settings.translator" 
              clearable density="compact" variant="underlined"
              label="translator" 
              @click:append="onLinks"
              @click:clear="onLinksCleared"
              @keypress="onLinksKey"
              hint="Optional"
              placeholder="Enter translator name">
            </v-text-field>
          </v-col>
        </v-row>
        <a v-if="settings.sutta_uid" :href="url" target="_blank">
          {{url}}
        </a>
        <v-row v-if="results">
          <v-col>
            <h3>Links results ({{settings.sutta_uid}})</h3>
            <pre>{{
  JSON.stringify(results,null,2)
            }}</pre>
            <div>
              <a target="_blank" :href="results.link">{{results.link}}</a>
            </div>
          </v-col>
        </v-row>
      </v-container>
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

  const url = computed(()=>{
    let { sutta_uid, langTrans, translator } = settings;
    sutta_uid = sutta_uid && sutta_uid.toLowerCase().trim();
    let endpoint = settings.scvEndpoint();
    let url = [
      endpoint,
      `links`,
      encodeURIComponent(sutta_uid),
    ];
    if (langTrans) {
      url.push(langTrans);
      translator && url.push(translator);
    }
    return url.join('/');
  })

  onMounted(()=>{
    console.log("Links.mounted()");
  })

  function onLinksCleared(evt) {
    results.value = undefined;
  }

  async function onLinks(evt) {
    let res;
    try {
      console.log('onLinks() url:', url.value);
      results.value = undefined;
      volatile.waiting = true;
      res = await fetch(url.value);
      results.value = res.ok
        ? await res.json()
        : res;
    } catch(e) {
      console.error("onLinks() ERROR:", res, e);
      results.value = `ERROR: ${url.value} ${e.message}`;
    } finally {
      volatile.waiting = false;
    }
  }

  function onLinksKey(evt) {
    if (evt.code === "Enter") {
      settings.sutta_uid && onLinks(evt);
      evt.preventDefault();
    }
  }

</script>
