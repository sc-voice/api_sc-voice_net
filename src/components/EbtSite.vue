<template>
  <v-expansion-panel variant="popout">
    <v-expansion-panel-title expand-icon="mdi-dots-vertical">
      GET /scv/ebt-site/:sutta_uid/:lang/:author
    </v-expansion-panel-title>
    <v-expansion-panel-text>
      <v-container>
        <v-row centered>
          <v-col >
            <v-text-field v-model="settings.sutta_uid" 
              clearable density="compact" variant="underlined"
              label="pattern"
              @click:append="onInput"
              @click:clear="onInput"
              @keypress="onInput"
              :append-icon="settings.sutta_uid ? 'mdi-magnify' : ''"
              hint="Required"
              placeholder="Enter sutta id">
            </v-text-field>
            <v-text-field v-model="settings.langTrans" 
              clearable density="compact" variant="underlined"
              label="lang" 
              @click:append="onInput"
              @click:clear="onInputCleared"
              @keypress="onInputKey"
              hint="Optional"
              placeholder="Enter two-letter ISO language code">
            </v-text-field>
            <v-text-field v-model="settings.translator" 
              clearable density="compact" variant="underlined"
              label="translator" 
              @click:append="onInput"
              @click:clear="onInputCleared"
              @keypress="onInputKey"
              hint="Optional"
              placeholder="Enter translator name">
            </v-text-field>
          </v-col>
        </v-row>
        <v-row>
          <div class="mr-5">
            <a v-if="settings.sutta_uid" :href="url" target="_blank">
              <v-icon>mdi-volume-high</v-icon>
            </a>
          </div>
          <div>
            <a v-if="settings.sutta_uid" :href="url" target="_blank">
              {{url}}
            </a>
          </div>
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
      `ebt-site`,
      encodeURIComponent(sutta_uid),
    ];
    if (langTrans) {
      url.push(langTrans);
      translator && url.push(translator);
    }
    return url.join('/');
  })

  onMounted(()=>{
  })

  function onInputCleared(evt) {
    results.value = undefined;
  }

  async function onInput(evt) {
    let res;
    try {
      console.log('onInput() url:', url.value);
      results.value = undefined;
      volatile.waiting = true;
      res = await fetch(url.value);
      results.value = res.ok
        ? await res.json()
        : res;
    } catch(e) {
      console.error("onInput() ERROR:", res, e);
      results.value = `ERROR: ${url.value} ${e.message}`;
    } finally {
      volatile.waiting = false;
    }
  }

  function onInputKey(evt) {
    if (evt.code === "Enter") {
      settings.sutta_uid && onInput(evt);
      evt.preventDefault();
    }
  }

</script>
