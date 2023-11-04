import { SuttaRef }  from "scv-esm/main.mjs";
import { logger } from "log-instance";

export default class Links {
  constructor() {
  }

  voiceLink(suttaRef) {
    let { sutta_uid, lang, author, segnum } = suttaRef;
    if (lang === 'pli') {
      lang = 'en';
    }
    return [
      `https://voice.suttacentral.net/scv/#`,
      `?search=${sutta_uid}&lang=${lang||'en'}`,
    ].join('/');
  }

  ebtSuttaRefLink(sref) {
    const msg = "Links.ebtSuttaRefLink() ";
    let { lang='en' }= sref;
    let suttaRef = SuttaRef.create(sref, lang);
    lang = suttaRef && suttaRef.lang || lang;
    let pathSutta = suttaRef == null
      ? ''
      : `#/sutta/${suttaRef.toString()}`;

    switch (lang) {
      case 'de':
        return `https://dhammaregen.net/${pathSutta}`;
      case 'pli':
      case 'en':
      default: 
        return `https://sc-voice.net/${pathSutta}`;
    }
  }
}
