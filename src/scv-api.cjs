(function (exports) {
  const fs = require("fs");
  const path = require("path");
  const { exec, execSync } = require("child_process");
  const URL = require("url");
  const http = require("http");
  const https = require("https");
  const jwt = require("jsonwebtoken");
  const tmp = require("tmp");
  const { BilaraData, English, Pali } = require("scv-bilara");
  const { logger } = require("log-instance");
  const { MerkleJson } = require("merkle-json");
  const srcPkg = require("../package.json");
  const AudioUrls = require("./audio-urls.cjs");
  const SCAudio = require("./sc-audio.cjs");
  const SoundStore = require("./sound-store.cjs");
  const SuttaStore = require("./sutta-store.cjs");
  const STATE_LOG = import("@sc-voice/state-log");
  var Links = import("./links.mjs");
  //const S3Creds = require("./s3-creds.cjs");
  const Task = require("./task.cjs");
  const Voice = require("./voice.cjs");
  const VoiceFactory = require("./voice-factory.cjs");
  const PACKAGE = require("../package.json");
  const { DBG } = require("./defines.cjs");

  const LOCAL = path.join(__dirname, "../local");
  const LANG_MAP = {
    ja: "jpn",
  };

  const JWT_SECRET = `JWT${Math.random()}`;
  const APP_NAME = "scv"; // DO NOT CHANGE THIS

  var fwsEn;

  const msg = 'ScvApi.';

  var customIpaLimit = 10;
  var cacheHits = 0;

  class ScvApi {
    constructor(
      opts = {
        audioFormat: "mp3",
      }
    ) {
      const msg = 'ScvApi.ctor() ';
      (opts.logger || logger).logInstance(this);
      this.name = APP_NAME;
      this.info(`ScvApi.ctor(${this.name})`);
      this.wikiUrl =
        opts.wikiUrl || "https://github.com/sc-voice/sc-voice/wiki";
      this.examples = opts.examples;
      this.jwtExpires = opts.jwtExpires || "1h";
      this.downloadMap = {};
      this.mj = new MerkleJson();
      let soundStore = opts.soundStore || new SoundStore(opts);
      this.audioMIME = soundStore.audioMIME;
      let scAudio = opts.scAudio || new SCAudio();
      let voiceFactory = opts.voiceFactory 
        || new VoiceFactory({ scAudio, soundStore, });
      let bilaraData = opts.bilaraData || new BilaraData({
        name: "ebt-data",
        branch: "published",
      });
      this.info(msg, bilaraData.root);
      this.download = null;
      let { autoSyncSeconds } = opts;
      this.monitorOpts = opts.monitors;

      Object.defineProperty(this, "audioUrls", {
        value: opts.audioUrls || new AudioUrls(),
      });
      Object.defineProperty(this, "bilaraData", { value: bilaraData});
      Object.defineProperty(this, "scAudio", { value: scAudio, });
      Object.defineProperty(this, "voiceFactory", { value: voiceFactory, });
      Object.defineProperty(this, "soundStore", { value: soundStore, });
      Object.defineProperty(this, "suttaStore", {
        value: new SuttaStore({
          scApi: this.scApi,
          suttaFactory: this.suttaFactory,
          voice: null,
          autoSyncSeconds,
        }),
      });
    }

    async initialize() {
      try {
        const msg = 'ScvApi.initialize()';
        if (this.initialized) {
          return this;
        }
        let { monitorOpts } = this;
        this.initialized = false;
        this.info(`ScvApi initialize() BEGIN`);
        //await this.scApi.initialize();
        //await this.suttaFactory.initialize();
        await this.suttaStore.initialize();
        this.voices = Voice.loadVoices();
        if (monitorOpts) {
          var { StateLog, Monitor } = await STATE_LOG;
          this.monitors = monitorOpts.map(opts=>{
            let { interval, type, probes } = opts;
            let monitor = new Monitor({ interval, type, });
            probes.forEach(probeOpts=>{
              monitor.probeUrl(probeOpts);
              this.info(msg, `probe@${probeOpts.url}`);
            });
            monitor.start();
            this.info(msg, `monitor@${monitor.interval}ms`);
            return monitor;
          });
        }
        this.info(msg, 'COMPLETED');
        this.initialized = true;
        return this;
      } catch (e) {
        this.warn(e);
        throw e;
      }
    }

    static checkReq(req) {
      let { query, params } = req;
      if (query == null) { 
        throw new Error(`query is required:${res}`);
      }
      if (params == null) { 
        throw new Error(`params is required:${res}`);
      }
      return req;
    }

    suttaParms(req) {
      var parms = Object.assign({
        language: 'en', //deprecated
        voicename: 'amy',
        vnameTrans: 'Amy',
        vnameRoot: 'Aditi',
        usage: 'recite',
        iSection: 0,
        scid: null,
        iVoice: 0,
      }, req.params);
      parms.iSection = Number(parms.iSection);
      parms.iVoice = Number(parms.iVoice);
      parms.sutta_uid = parms.sutta_uid || parms.scid && parms.scid.split(':')[0];
      parms.langTrans = parms.langTrans || parms.language || 'en';
      return parms;
    }

    async getVoices(req, res) {
      let { voices } = this;
      return voices.map(voice=>{
        let {
          name, label, langTrans, gender, iVoice, locale, service,
        } = voice;
        return {
          name, label, langTrans, gender, iVoice, locale, service,
        }
      });
    }

    async get_statfs(req, res) {
      const msg = 'ScvApi.get_statfs()';
      let path = LOCAL;
      let result = await fs.promises.statfs(path);
      //result.path = path;
      result.ffree_percent = 
        Math.round(100 * result.ffree / result.files);
      result.bavail_percent = 
        Math.round(100 * result.bavail / result.blocks);
      result.api_scvoice_version = PACKAGE.version;
      return result;
    }

    async getMonitors(req, res) {
      // DANGER: Log explosion 
      // this.info("DANGER", msg+'getMonitors()', this.monitors.length);
      let { monitors } = this;
      return this.monitors;
    }
    
    async getProbes(req, res) {
      // DANGER: Log explosion 
      //this.info("DANGER", msg+'getProbes()', this.monitors.length);
      return this.monitors.reduce((a,m)=>[...a, ...m.probes], []);
    }

    async getEbtSite(req, res) {
      const msg = 'ScvApi.getEbtSite() ';
      let result = {};
      let emsg;
      let link;
      try {
        if (Links instanceof Promise) {
          Links = (await Links).default;
        }
        let links = new Links();
        let { sutta_uid, lang, author } = req.params;
        emsg = `${msg} ${sutta_uid} ${lang} ${author} [NOT FOUND]`;
        link =  links.ebtSuttaRefLink({sutta_uid, lang, author});
        logger.info(msg, link);
        result = {
          sutta_uid,
          lang,
          author,
          link,
        }
      } catch (e) {
        this.warn(msg, req.params, e.message);
        throw e;
      }

      if (!result.link) {
        this.warn(msg, req.params, emsg);
        throw new Error(emsg);;
      }
      res.redirect(link);
      return result;
    }

    async getLinks(req) {
      const msg = 'ScvApi.getLinks() ';
      try {
        if (Links instanceof Promise) {
          logger.info(msg, "before await");
          Links = (await Links).default;
          logger.info(msg, "after await");
        }
        let links = new Links();
        let { sutta_uid, lang, author } = req.params;
        let link =  links.ebtSuttaRefLink({sutta_uid, lang, author});
        logger.info(msg, link);
        return {
          sutta_uid,
          lang,
          author,
          link,
        };
      } catch (e) {
        this.warn(msg, req.params, e.message);
        throw e;
      }
    }

    async getSearch(req) {
      try {
        let { suttaStore } = this;
        req = ScvApi.checkReq(req);
        let { pattern } = req.params;
        let { maxResults=suttaStore.maxResults } = req.query;
        var language = req.params.lang || "en";
        LANG_MAP[language] && (language = LANG_MAP[language]);
        var srOpts = { pattern, language, maxResults, };

        if (!pattern) {
          throw new Error("Search pattern is required");
        }
        if (isNaN(maxResults)) {
          throw new Error("Expected number for maxResults");
        }
        var sr = await suttaStore.search(srOpts);
        var { method, results, mlDocs } = sr;
        this.info(
          `getSearch(${pattern}) ${language} ${method}`,
          `=> ${results.map((r) => r.uid)}`
        );
        return sr;
      } catch (e) {
        this.warn(`getSearch(${JSON.stringify(srOpts)})`, e.message);
        throw e;
      }
    }

    async getPlaySegment(req, res) {
      const msg = 's4i.getPlaySegment:';
      const dbg = DBG.S4I_GET_PLAY_SEGMENT;
      let { suttaStore, soundStore } = this;
      let { 
        sutta_uid, langTrans, translator, scid, vnameTrans, vnameRoot,
      } = this.suttaParms(req);
      if (/[0-9]+/.test(vnameTrans)) {
        var iVoice = Number(vnameTrans);
      }
      var scAudio = this.scAudio;
      var voice = Voice.voiceOfName(vnameTrans);
      var voiceRoot = this.voiceFactory.voiceOfName(vnameRoot);
      dbg && console.log(msg, '[1]', {
        sutta_uid, langTrans, translator, scid, 
        vnameTrans: vnameTrans + 
          (voice?.name===vnameTrans ? '\u2713' : '?'), 
        vnameRoot: vnameRoot + 
          (voiceRoot?.name===vnameRoot ? '\u2713' : '?'),
        iVoice,
      });
      var sutta = await suttaStore.loadSutta({
        scid: sutta_uid,
        translator,
        language: langTrans, // deprecated
        langTrans,
        expand: true,
        minLang: 1,
        trilingual: true,
      });
      if (iSection < 0 || sutta.sections.length <= iSection) {
        var suttaRef = `${sutta_uid}/${langTrans}/${translator}`;
        throw new Error(`Sutta ${suttaRef} has no section:${iSection}`);
      }
      let { name, localeIPA='pli', usage='recite' } = voice;
      var voiceTrans = Voice.createVoice({
        name,
        usage,
        soundStore: soundStore,
        localeIPA,
        audioFormat: soundStore.audioFormat,
        audioSuffix: soundStore.audioSuffix,
        scAudio,
      });
      dbg && console.log(msg, '[2]createVoice', {
        name: voiceTrans.name,
        localeIPA: voiceTrans.localeIPA,
      });
      var sections = sutta.sections;
      var iSegment = sutta.segments
        .reduce((acc,seg,i) => seg.scid == scid ? i : acc, null);
      if (iSegment == null) {
        throw new Error(`segment ${scid} not found`);
      }
      var segment = sutta.segments[iSegment];
      var iSection = 0;
      var section = sutta.sections[iSection];
      let nSegs = section.segments.length;
      for (let i=iSegment; section && (nSegs.length <= i); ) {
        i -= section.segments.length;
        section = sutta.sections[++iSection];
      }
      segment.audio = {};
      let result = {
        sutta_uid,
        scid,
        language: langTrans, // deprecated
        langTrans,
        translator,
        title: section.title,
        section:iSection,
        nSections: sutta.sections.length,
        vnameTrans: voiceTrans.name,
        vnameRoot,
        iSegment,
        segment,
      }
      try {
        if (segment[langTrans]) {
          var resSpeak = await voiceTrans.speakSegment({
            sutta_uid,
            segment,
            language: langTrans, 
            translator,
            usage,
          });
          segment.audio[langTrans] = resSpeak.signature.guid;
          let { voice, signature } = resSpeak;
          switch (signature.api) {
            case 'human-tts':
              result.vnameTrans = signature.reader || voice;
              break;
            default:
            case 'aws-polly':
              result.vnameTrans = signature.voice || voice;
              break;
          }
        }
        if (segment.pli) {
          var pali = new Pali();
          var resSpeak = await voiceRoot.speakSegment({
            sutta_uid,
            segment,
            language: 'pli',
            translator,
            usage: 'recite',
          });
          //segment.audio.vnamePali = resSpeak.altTts;
          let { signature } = resSpeak;
          segment.audio.pli = signature.guid;
          switch (signature.api) {
            case 'human-tts':
              result.vnameRoot = signature.reader;
              break;
            default:
            case 'ffmegConcat':
            case 'aws-polly':
              result.vnameRoot = signature.voice || 'Aditi';
              break;
          }
        }
        var audio = segment.audio;
        this.info(`GET ${req.url} =>`, 
          audio[langTrans] ? `${langTrans}:${audio[langTrans]}` : ``,
          audio.pli ? `pli:${audio.pli}` : ``,
        );
      } catch(e) {
        this.warn(e);
        result.error = e.message;
      }
      return result;
    }

    async getDictionary(req, res) {
      const msg = "ScvApi.getDictionary()";
      const dbg = DBG.GET_DICTIONARY;
      const dbgv = DBG.VERBOSE && dbg;
      let { 
        dictionary:dict, soundStore, voiceFactory,
      } = this;
      let { 
        paliWord='dhamma', 
        ipa='', 
        vnameRoot='Aditi', 
        vnameTrans='Amy',
      } = req.params;
      var volume = 'dpd';
      let result;
      try {
        const { Dictionary } = await import("@sc-voice/ms-dpd/main.mjs");
        const language = 'pli';
        if (!dict) {
          this.dictionary = dict = await Dictionary.create();
        }
        dict = await dict;

        var voiceRoot = voiceFactory.voiceOfName(vnameRoot);
        if (!voiceRoot || voiceRoot.locale !== 'hi-IN') {
          throw new Error(`${msg} vnameRoot? ${vnameRoot}`);
        }
        var voiceTrans = voiceFactory.voiceOfName(vnameTrans);
        if (!voiceTrans || !voiceTrans.locale.startsWith('en')) {
          throw new Error(`${msg} vnameTrans? ${vnameTrans}`);
        }
        let { usage, services } = voiceRoot;
        let service = services[usage];
        if (!service) {
          throw new Error(`${msg} service?`);
        }
        let entry = dict.entryOf(paliWord);
        if (!entry) {
          throw new Error(`${msg} entryOf? [${paliWord}]`);
        }
        let definition = dict.parseDefinition(entry.definition);
        let ssml = service.wordSSML(paliWord, language);
        let parts = ssml.split('"');
        if (ipa) { 
          if (customIpaLimit>0) {
            parts[3] = ipa; // custom ipa
          } else {
            ipa = parts[3]; // default ipa
          }
          ssml = parts.join('"');
        } else { 
          ipa = parts[3]; // default ipa
        }
        let resSpeak = await service.synthesizeSSML(ssml, {
          language,
          usage,
          volume,
        });
        let { misses, hits, signature={} } = resSpeak;
        let cached = hits - cacheHits;
        cacheHits = hits;
        dbg && console.log(msg, '[1] resSpeak', resSpeak);
        let { 
          guid:paliGuid,
        } = signature;
        if (!cached && req.params.ipa) {
          customIpaLimit--;
        }

        result = {
          customIpaLimit,
          cached,
          ipa,
          paliGuid,
          paliWord,
          ssml,
          vnameRoot,
          vnameTrans,
          volume,
          definition,
        }
      } catch(e) {
        this.warn(e);
        result = {
          error: e.message,

          customIpaLimit,
          ipa,
          paliWord,
          vnameRoot,
          vnameTrans,
          volume,
        }
      }
      dbgv && console.log(msg, '[2]result', result);
      return result;
    }

    async getAudio(req, res) {
      const msg = 's4i.getAudio:';
      const dbg = DBG.S4I_GET_AUDIO;
      var { 
        filename, guid, sutta_uid, langTrans, translator, vnameTrans 
      } = req.params;
      var volume;
      switch (sutta_uid) {
        case undefined:
        case null:
        case '':
        case 'word':
          volume = "play-word";
          break;
        case 'dpd':
          volume = "dpd";
          break;
        default:
          volume = SoundStore.suttaVolumeName(sutta_uid, 
            langTrans, translator, vnameTrans);
          break;
      }
      var soundOpts = { volume };
      var filePath = this.soundStore.guidPath(guid, soundOpts);
      var data = fs.readFileSync(filePath);
      dbg && console.log(msg, {
        filename, filePath, guid, volume,
        sutta_uid, langTrans, translator, vnameTrans,
      });
      res.set("accept-ranges", "bytes");
      res.set("do_stream", "true");
      filename &&
        res.set("Content-disposition", "attachment; filename=" + filename);

      return data;
    }

    downloadArgs(reqArgs) {
      let { suttaStore, soundStore, mj } = this;
      let { 
        audioSuffix = ".mp3", 
        vroot = 'Aditi', 
        vtrans = 'Amy',
        langs = 'pli+en', 
        lang = 'en',
        maxResults = suttaStore.maxResults,
        maxDuration,
        pattern,
        task,
      } = reqArgs;

      if (isNaN(maxResults)) {
        throw new Error("Expected number for maxResults");
      }
      const AUDIO_SUFFIXES = {
        ".opus": ".opus",
        "opus": ".opus",
        ".ogg": ".ogg",
        "ogg": ".ogg",
        ".mp3": ".mp3",
        "mp3": ".mp3",
      }

      lang = LANG_MAP[lang] || lang;

      audioSuffix = AUDIO_SUFFIXES[audioSuffix.toLowerCase()];
      if (audioSuffix == null) {
        throw new Error(`Unsupported audio type:${audioSuffix}`);
      }

      const MAX_DURATION = 8*60*60;
      maxDuration = Math.min(MAX_DURATION, Number(maxDuration));
      if (isNaN(maxDuration)) {
        maxDuration = undefined;
      }

      if (typeof langs === 'string') {
        langs = langs.toLowerCase() .split("+") .map(l=> LANG_MAP[l] || l);
      } else if (langs instanceof Array) {
        // ok
      } else {
        throw new Error(`downloadArgs() expected:array-or-string actual:${langs}`);
      }

      if (!pattern) {
        throw new Error("Search pattern is required");
      }
      pattern = decodeURIComponent(pattern);

      if (typeof lang !== 'string') {
        throw new Error("Expected 2- or 3-letter ISO language identifier");
      }
      lang = lang.toLowerCase();

      maxResults = Number(maxResults);
      if (isNaN(maxResults)) {
        throw new Error("Expected number for maxResults");
      }

      let result = { 
        audioSuffix, vroot, vtrans, langs, pattern, maxDuration, maxResults, lang, task
      }
      result.hash = mj.hash(result);
      return result;
    }

    async buildDownload(args) {
      let { 
        logLevel, download, soundStore, suttaStore, voiceFactory, bilaraData, 
      } = this;
      let {
        audioSuffix,
        langs,
        lang,
        maxResults,
        maxDuration,
        pattern,
        task,
        vroot,
        vtrans,
      } = this.downloadArgs(args);

      task && (task.actionsTotal += 2);
      var playlist = await suttaStore.createPlaylist({
        pattern,
        languages: langs,
        lang,
        maxResults,
        audioSuffix,
        logLevel,
        maxDuration,
      });
      task && (task.actionsDone++);

      var voiceLang = voiceFactory.voiceOfName(vtrans);
      var voiceRoot = voiceFactory.voiceOfName(vroot);
      let voices = langs.map((l) => {
        return l === "pli" ? voiceRoot.name : voiceLang.name;
      });
      let artists = playlist
        .author_uids()
        .map((a) => {
          let ai = bilaraData.authorInfo(a);
          return ai ? ai.name : a;
        })
        .concat(voices);
      let artist = artists.join(", ");
      var stats = playlist.stats();
      let buildDate = new Date();
      let yyyy = buildDate.toLocaleString(undefined, {
        year: "numeric",
      });
      let mm = buildDate.toLocaleString(undefined, {
        month: "2-digit",
      });
      let album = `${yyyy}-${mm} voice.suttacentral.net`;
      try {
        var audio = await playlist.speak({
          task,
          voices: {
            pli: voiceRoot,
            [lang]: voiceLang,
          },

          album,
          artist,
          album_artist: artist,
          languages: langs.join(","),
          audioSuffix,
          copyright: "https://suttacentral.net/licensing",
          publisher: "voice.suttacentral.net",
          title: pattern,
        });
      } catch(e) {
        let msg = `buildDownload() ERROR:${e.message}`;
        this.warn(msg);
        if (task) {
          task.error = e.message;
          task.summary = msg;
        }
        throw e;
      }
      var result = {
        audio,
      };
      var guid = audio.signature.guid;
      var filepath = soundStore.guidPath(guid, audioSuffix);
      var uriPattern = encodeURIComponent(
        decodeURIComponent(pattern)
          .replace(/[ ,\t]/g, "_")
          .replace(/[\/]/g, "-")
      );
      let langExpr = langs.join("+");
      var filename = `${uriPattern}_${langExpr}_${vtrans}${audioSuffix}`;
      if (task) {
        task.actionsDone++;
        this.debug(`buildDownload() done`,
          `task:${task.actionsDone}/${task.actionsTotal}`);
      }
      return {
        filepath,
        filename,
        guid,
        stats,
        buildDate,
      };
    }

    async getBuildDownload(req, res) {
      var {
        downloadMap, initialized, soundStore, suttaStore,
      } = this;
      if (!initialized) {
        throw new Error(`${this.constructor.name} is not initialized`);
      }
      let { 
        audioSuffix, vroot, vtrans, lang, langs, pattern, maxDuration, maxResults, hash,
      } = this.downloadArgs(Object.assign({}, req.params, req.query));
      let result = {
        audioSuffix,
        lang,
        langs,
        maxDuration,
        maxResults,
        pattern,
        vroot,
        vtrans,
        language: lang, // deprecated (used by Voice)
        vname: vtrans, // deprecated (used by Voice)
      };
      let task = downloadMap[hash];
      if (task && !task.isActive && task.download) {
        if (!fs.existsSync(task.download.filepath)) {
          downloadMap[hash] = null; // downloadMap is stale.
          task = null; // task is stale.
        }
      }
      if (task == null) {
        this.info(`buildDownload(${hash}) started`);
        task = new Task({name: `Create ${audioSuffix} audio download for:${pattern}`});
        downloadMap[hash] = task;
        let promise = this.buildDownload(Object.assign({task}, result));
        promise.then(v => {
          task.download = v;
          this.info(`getBuildDownload(${hash}) ok:`, JSON.stringify(v));
        }).catch(e=>{
          let msg = `Cannot build audio download:${pattern}`;
          this.warn(`getBuildDownload(${hash}) ${msg}`);
          task.error = e.message;
          task.summary = msg;
        });
      }
      if (task) {
        result.task = Object.assign({}, task);
        delete result.task.download;

        if (task.download) {
          result.filename = task.download.filename;
          result.guid = task.download.guid;
          result.stats = task.download.stats;
        }
      }
      return result;
    }

    async getDownloadPlaylist(req, res, next) { 
      var { 
        initialized, soundStore, suttaStore, downloadMap,
      } = this;
      if (!initialized) {
        throw new Error(`${this.constructor.name} is not initialized`);
      }
      let audioSuffix = req.url.split('/')[2];
      let opts = Object.assign({audioSuffix}, req.params, req.query);
      let { 
        vroot, vtrans, lang, langs, pattern, maxResults, hash,
      } = this.downloadArgs(opts);
      let spec = [
        audioSuffix, vtrans, langs.join('+'), pattern, vroot,
      ].join(',');
      let downloadInfo = downloadMap[hash]?.download;
      if (!downloadInfo) {
        this.info(`rebuilding download:${spec} guid:${hash}...`);
        try {
          downloadInfo = await this.buildDownload(opts);
        } catch(e) {
          this.warn(`getDownloadPlaylist() ERROR:${e.message}`);
          throw e;
        }
      }
      let { filepath, filename, guid, stats, } = downloadInfo;
      var data = await fs.promises.readFile(filepath);
      res.set('Content-disposition', 'attachment; filename=' + filename);
      this.info(`GET ${req.path} => ` +
          `${filename} size:${data.length} `+
          `secs:${stats.duration} guid:${guid}`);
      return data;
    }

  }

  module.exports = exports.ScvApi = ScvApi;
})(typeof exports === "object" ? exports : (exports = {}));

