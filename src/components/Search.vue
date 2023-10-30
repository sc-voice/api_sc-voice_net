<template>
  <v-expansion-panel variant="popout">
    <v-expansion-panel-title expand-icon="mdi-dots-vertical">
      GET /scv/search/:pattern/:lang
    </v-expansion-panel-title>
    <v-expansion-panel-text>
      <v-container>
        <v-row centered>
          <v-col >
            <v-text-field v-model="settings.search" 
              clearable density="compact" variant="underlined"
              label="pattern"
              @click:append="onSearch"
              @click:clear="onSearchCleared"
              @keypress="onSearchKey"
              :append-icon="settings.search ? 'mdi-magnify' : ''"
              hint="Required"
              placeholder="Enter sutta id or search text">
            </v-text-field>
            <v-text-field v-model="lang" 
              clearable density="compact" variant="underlined"
              label="lang" 
              @click:append="onSearch"
              @click:clear="onSearchCleared"
              @keypress="onSearchKey"
              hint="Optional"
              placeholder="Enter two-letter ISO language code">
            </v-text-field>
          </v-col>
        </v-row>
        <a v-if="settings.search" :href="url" target="_blank">{{url}}</a>
        <v-row v-if="results">
          <v-col>
            <h3>Search results ({{settings.search}})</h3>
            <pre>{{
  JSON.stringify(results,null,2)
            }}</pre>
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

  const lang = ref('');
  const results = ref(undefined);
  const settings = useSettingsStore(); 
  const volatile = useVolatileStore();

  const url = computed(()=>{
    let { search } = settings;
    let pattern = search && search.toLowerCase().trim();
    let endpoint = settings.scvEndpoint();
    let url = [
      endpoint,
      `search`,
      encodeURIComponent(pattern),
    ].join('/');
    return lang.value ?  `${url}/${lang.value}` : url;
  })

  onMounted(()=>{
    console.log("Search.mounted()");
  })

  function onSearchCleared(evt) {
    results.value = undefined;
  }

  async function onSearch(evt) {
    let res;
    try {
      console.log('onSearch() url:', url.value);
      results.value = undefined;
      volatile.waiting = true;
      res = await fetch(url.value);
      results.value = res.ok
        ? await res.json()
        : res;
    } catch(e) {
      console.error("onSearch() ERROR:", res, e);
      results.value = `ERROR: ${url.value} ${e.message}`;
    } finally {
      volatile.waiting = false;
    }
  }

  function onSearchKey(evt) {
    if (evt.code === "Enter") {
      settings.search && onSearch(evt);
      evt.preventDefault();
    }
  }

</script>
