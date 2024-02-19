import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'

const pinia = createPinia();

// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

import cs from './i18n/cs.ts';
import da from './i18n/da.ts';
import de from './i18n/de.ts';
import en from './i18n/en.ts';
import fr from './i18n/fr.ts';
import hi from './i18n/hi.ts';
import is from './i18n/is.ts';
import jpn from './i18n/jpn.ts';
import nb from './i18n/nb.ts';
import nl from './i18n/nl.ts';
import pl from './i18n/pl.ts';
import pt from './i18n/pt.ts';
import ro from './i18n/ro.ts';
import si from './i18n/si.ts';
import vi from './i18n/vi.ts';

const vuetifyOpts = {
  theme: {
    defaultTheme: 'dark',
  },
};

// Vuetify
import { createVuetify, } from "vuetify"
const vuetify = createVuetify(vuetifyOpts);

import { loadFonts } from './plugins/webfontloader'
loadFonts()

var app = createApp(App);
app.use(pinia);
//app.use(i18n)
app.use(vuetify)
app.mount('#app')
