(function (exports) {
  const fs = require("fs");
  const path = require("path");
  const { exec, execSync } = require("child_process");
  const URL = require("url");
  const http = require("http");
  const https = require("https");
  const jwt = require("jsonwebtoken");
  const tmp = require("tmp");
  const { js } = require("just-simple").JustSimple;
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

  const LOCAL = path.join(__dirname, "../local");
  const LANG_MAP = {
    ja: "jpn",
  };

  const JWT_SECRET = `JWT${Math.random()}`;
  const APP_NAME = "scv"; // DO NOT CHANGE THIS

  var fwsEn;

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

    async get_statfs(req, res) {
      const msg = 'ScvApi.get_statfs()';
      let path = LOCAL;
      let result = await fs.promises.statfs(path);
      //result.path = path;
      result.ffree_percent = 
        Math.round(100 * result.ffree / result.files);
      result.bavail_percent = 
        Math.round(100 * result.bavail / result.blocks);
      return result;
    }

    async getMonitors(req, res) {
      const msg = 'ScvApi.getMonitors()';
      this.info(msg, this.monitors.length);
      let { monitors } = this;
      return this.monitors;
    }
    
    async getProbes(req, res) {
      const msg = 'ScvApi.getProbes()';
      this.info(msg, this.monitors.length);
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
          Links = (await Links).default;
        }
        let links = new Links();
        let { sutta_uid, lang, author } = req.params;
        let link =  links.ebtSuttaRefLink({sutta_uid, lang, author});
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

    /*
    async getAwsCreds(req, res) {
      let creds = new S3Creds();
      return creds.obfuscated();
    }
    */

    async getPlaySegment(req, res) {
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
      this.debug(`GET ${req.url}`);
      var usage = voice.usage || 'recite';
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
      var voiceTrans = Voice.createVoice({
        name: voice.name,
        usage,
        soundStore: soundStore,
        localeIPA: "pli",
        audioFormat: soundStore.audioFormat,
        audioSuffix: soundStore.audioSuffix,
        scAudio,
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

    async getAudio(req, res) {
      var { 
        filename, guid, sutta_uid, langTrans, translator, vnameTrans 
      } = req.params;
      var volume =
        !sutta_uid || sutta_uid === "word"
          ? "play-word"
          : SoundStore.suttaVolumeName(sutta_uid, langTrans, translator, vnameTrans);
      var soundOpts = { volume };
      var filePath = this.soundStore.guidPath(guid, soundOpts);
      var data = fs.readFileSync(filePath);
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

  /*TODO

  class ScvApi extends RestBundle {
    constructor(
      opts = {
        audioFormat: "mp3",
      }
    ) {
      super(
        APP_NAME,
        Object.assign(
          {
            srcPkg,
          },
          opts
        )
      );
      var that = this;
      var soundStore = (this.soundStore =
        opts.soundStore || new SoundStore(opts));
      this.audioMIME = this.soundStore.audioMIME;
      this.audioUrls = opts.audioUrls || new AudioUrls();
      var scAudio = (this.scAudio = opts.scAudio || new SCAudio());
      this.voiceFactory =
        opts.voiceFactory ||
        new VoiceFactory({
          scAudio,
          soundStore,
        });
      this.scApi =
        opts.scApi ||
        new ScApi({
          logger: this,
        });
      this.suttaFactory = new SuttaFactory({
        scApi: this.scApi,
        suttaLoader: (opts) => that.suttaStore.loadBilaraSutta(opts),
        autoSection: true,
      });
      this.vsmFactoryTask = new Task({
        name: "VSMFactory",
      });
      this.updateContentTask = new Task({
        name: "ContentUpdater",
      });
      this.userStore =
        opts.userStore ||
        new UserStore({
          defaultUser: DEFAULT_USER,
        });
      this.mdAria = opts.mdAria || new MdAria();
      English.wordSet().then((fws) => (fwsEn = fws));
      this.mj = new MerkleJson();
      this.bilaraData = this.suttaStore.bilaraData;
      var resourceMethods = [
        ["get", "audio/:guid", this.getAudio, this.audioMIME],
        ["get", "audio/:guid/:filename", this.getAudio, this.audioMIME],
        [
          "get",
          "audio/:sutta_uid/:lang/:translator/:voice/:guid",
          this.getAudio,
          this.audioMIME,
        ],
        ["get", "play/word/:langTrans/:vname/:word", this.getPlayWord],
        [
          "get",
          "play/segment/" +
            ":sutta_uid/:langTrans/:translator/:scid/:vnameTrans",
          this.getPlaySegment,
        ],
        [
          "get",
          "play/segment/:sutta_uid/" +
            ":langTrans/:translator/:scid/:vnameTrans/:vnameRoot",
          this.getPlaySegment,
        ],
        [
          "get",
          "play/section/:sutta_uid/" +
            ":langTrans/:translator/:iSection/:vnameTrans",
          this.getPlaySection,
        ],
        [
          "get",
          "play/section/:sutta_uid/:langTrans/" +
            ":translator/:iSection/:vnameTrans/:vnameRoot",
          this.getPlaySection,
        ],
        ["get", "authors", this.getAuthors],
        ["get", "voices", this.getVoices],
        ["get", "voices/:langTrans", this.getVoices],
        ["get", "audio-urls/:sutta_uid", this.getAudioUrls],
        [
          "get",
          "build-download/:type/:langs/:voice/:pattern",
          this.getBuildDownload,
        ],
        [
          "get",
          "build-download/:type/:langs/:voice/:pattern/:vroot",
          this.getBuildDownload,
        ],
        [
          "get",
          "download/ogg/:langs/:voice/:pattern",
          this.getDownloadPlaylist,
          "audio/ogg",
        ],
        [
          "get",
          "download/ogg/:langs/:voice/:pattern/:vroot",
          this.getDownloadPlaylist,
          "audio/ogg",
        ],
        [
          "get",
          "download/opus/:langs/:voice/:pattern",
          this.getDownloadPlaylist,
          "audio/opus",
        ],
        [
          "get",
          "download/opus/:langs/:voice/:pattern/:vroot",
          this.getDownloadPlaylist,
          "audio/opus",
        ],
        [
          "get",
          "download/mp3/:langs/:voice/:pattern",
          this.getDownloadPlaylist,
          "audio/opus",
        ],
        [
          "get",
          "download/mp3/:langs/:voice/:pattern/:vroot",
          this.getDownloadPlaylist,
          "audio/mpeg",
        ],
        [
          "get",
          "download/playlist/:langs/:voice/:pattern",
          this.getDownloadPlaylist,
          this.audioMIME,
        ],
        [
          "get",
          "download/playlist/:langs/:voice/:pattern/:vroot",
          this.getDownloadPlaylist,
          this.audioMIME,
        ],
        ["get", "search/:pattern", this.getSearch],
        ["get", "search/:pattern/:lang", this.getSearch],
        ["get", "examples/:n", this.getExamples],
        ["get", "wiki-aria/:page", this.getWikiAria],
        ["get", "debug/ephemerals", this.getDebugEphemerals],
        ["post", "login", this.postLogin],
        ["get", "bilara/:scid", this.getBilara],

        ["get", "auth/logs", this.getLogs],
        ["get", "auth/log/:ilog", this.getLog, "text/plain"],
        ["get", "auth/users", this.getUsers],
        ["get", "auth/sound-store/volume-info", this.getSoundStoreVolumeInfo],
        ["get", "auth/sound-store/pruner", this.getSoundPruner],
        ["post", "auth/sound-store/pruner", this.postSoundPruner],
        [
          "post",
          "auth/sound-store/clear-volume",
          this.postSoundStoreClearVolume,
        ],
        ["post", "auth/delete-user", this.postDeleteUser],
        ["post", "auth/add-user", this.postAddUser],
        ["post", "auth/set-password", this.postSetPassword],
        ["get", "auth/vsm/list-objects", this.getVsmListObjects],
        ["get", "auth/vsm/s3-credentials", this.getVsmS3Credentials],
        ["get", "auth/vsm/factory-task", this.getVsmFactoryTask],
        ["post", "auth/vsm/s3-credentials", this.postVsmS3Credentials],
        ["post", "auth/vsm/create-archive", this.postVsmCreateArchive],
        ["post", "auth/vsm/restore-s3-archives", this.postVsmRestoreS3Archives],
        ["post", "auth/update-bilara", this.postUpdateBilara],
        ["post", "auth/update-content", this.postUpdateContent],
        ["get", "auth/update-content/task", this.getUpdateContentTask],
        ["post", "auth/reboot", this.postReboot],
        ["post", "auth/update-release", this.postUpdateRelease],
        ["get", "auth/audio-info/:volume/:guid", this.getAudioInfo],
      ].map((h) => this.deprecated_resourceMethod.apply(this, h));
      Object.defineProperty(this, "resourceMethods", {
        value: super.resourceMethods.concat(resourceMethods),
      });
    }

    async getAudioInfo(req, res, next) {
      try {
        var { guid, volume } = req.params;
        this.info([`getAudioInfo()`, js.simpleString(req.params)].join(" "));
        var info = this.soundStore.soundInfo({ guid, volume });
        return info;
      } catch (e) {
        this.warn(e);
        throw e;
      }
    }

    async synthesizeSutta(sutta_uid, language, translator, usage) {
      try {
        var sutta = await this.suttaFactory.loadSutta({
          scid: sutta_uid,
          translator,
          language,
          expand: true,
        });
        var preamble = [
          `suttacentral voice recording\n`,
          `{${sutta.suttaCode}}\n`,
        ].join("");
        var lines = Sutta.textOfSegments(sutta.segments);
        var text = `${preamble}\n${lines.join("\n")}\n`;
        var voice = Voice.createVoice({
          language,
          usage,
          soundStore: this.soundStore,
          localeIPA: "pli",
          audioFormat: this.soundStore.audioFormat,
          audioSuffix: this.soundStore.audioSuffix,
        });
        var msStart = Date.now();
        if (lines.length > 750) {
          this.info(
            `synthesizeSutta()` +
              `lines:${lines.length} text:${text.length * 2}B`
          );
        }
        var result = await voice.speak(text, {
          cache: true, // minimize TTS web service use
          usage,
        });
        this.info(
          `synthesizeSutta() ms:${Date.now() - msStart} ` +
            `${text.substring(0, 50)}`
        );
        return {
          usage,
          name: voice.name,
          sutta_uid,
          language,
          translator,
          guid: result.signature.guid,
        };
      } catch (e) {
        this.warn(e);
        throw e;
      }
    }

    getAuthors(req, res, next) {
      return Promise.resolve(this.bilaraData.authors);
    }

    async getVoices(req, res, next) {
      try {
        var { langTrans } = req.params;
        var voices = this.voices.slice();
        if (!!langTrans) {
          voices = voices.filter(
            (v) => v.langTrans === "pli" || v.langTrans === langTrans
          );
        }
        voices.sort(Voice.compare);
        return voices;
      } catch (e) {
        this.warn(e);
        throw e;
      }
    }

    async getPlaySection(req, res, next) {
      try {
        var {
          sutta_uid,
          translator,
          iSection,
          vnameRoot,
          vnameTrans,
          langTrans,
        } = this.suttaParms(req);
        var suttaRef = `${sutta_uid}/${langTrans}/${translator}`;
        this.info(`GET play/section/${suttaRef}/${iSection}/${vnameTrans}`);
        var voiceTrans =
          Voice.voiceOfName(vnameTrans) || Voice.voiceOfName("Amy");
        var usage = voiceTrans.usage;
        var voiceRoot = this.voiceFactory.voiceOfName("Aditi");
        var sutta = await this.suttaStore.loadSutta({
          scid: sutta_uid,
          translator,
          language: langTrans,
          expand: true,
        });
        var nSects = (sutta && sutta.sections.length) || 0;
        if (iSection < 0 || nSects <= iSection) {
          throw new Error(`Sutta ${suttaRef} ` + `has no section:${iSection}`);
        }
        var section = sutta.sections[iSection];
        var segments = [];
        var pali = new Pali();
        var sectSegs = section.segments;
        for (var iSeg = 0; iSeg < sectSegs.length; iSeg++) {
          var segment = Object.assign({}, sectSegs[iSeg]);
          segment.audio = {};
          segments.push(segment);
        }
        return {
          sutta_uid,
          language: langTrans,
          translator,
          title: section.title,
          section: iSection,
          nSections: sutta.sections.length,
          segments,
          vnameTrans: voiceTrans.name,
          vnameRoot: voiceRoot.name,
        };
      } catch (e) {
        this.warn(e);
        throw e;
      }
    }

    getPlaySegment(req, res, next) {
      var that = this;
      var { sutta_uid, langTrans, translator, scid, vnameTrans, vnameRoot } =
        this.suttaParms(req);
      if (/[0-9]+/.test(vnameTrans)) {
        var iVoice = Number(vnameTrans);
      }
      var scAudio = this.scAudio;
      var voice = Voice.voiceOfName(vnameTrans);
      var voiceRoot = this.voiceFactory.voiceOfName(vnameRoot);
      that.debug(`GET ${req.url}`);
      var usage = voice.usage || "recite";
      var pbody = (resolve, reject) => {
        (async function () {
          try {
            var sutta = await that.suttaStore.loadSutta({
              scid: sutta_uid,
              translator,
              language: langTrans, // deprecated
              langTrans,
              expand: true,
            });
            if (iSection < 0 || sutta.sections.length <= iSection) {
              var suttaRef = `${sutta_uid}/${langTrans}/${translator}`;
              throw new Error(`Sutta ${suttaRef} has no section:${iSection}`);
            }
            var voiceTrans = Voice.createVoice({
              name: voice.name,
              usage,
              soundStore: that.soundStore,
              localeIPA: "pli",
              audioFormat: that.soundStore.audioFormat,
              audioSuffix: that.soundStore.audioSuffix,
              scAudio,
            });
            var sections = sutta.sections;
            var iSegment = sutta.segments.reduce(
              (acc, seg, i) => (seg.scid == scid ? i : acc),
              null
            );
            if (iSegment == null) {
              throw new Error(`segment ${scid} not found`);
            }
            var segment = sutta.segments[iSegment];
            var iSection = 0;
            var section = sutta.sections[iSection];
            let nSegs = section.segments.length;
            for (let i = iSegment; section && nSegs.length <= i; ) {
              i -= section.segments.length;
              section = sutta.sections[++iSection];
            }
            segment.audio = {};
            if (segment[langTrans]) {
              var resSpeak = await voiceTrans.speakSegment({
                sutta_uid,
                segment,
                language: langTrans,
                translator,
                usage,
              });
              segment.audio[langTrans] = resSpeak.signature.guid;
              segment.audio.vnameTrans = resSpeak.altTts;
            }
            if (segment.pli) {
              var pali = new Pali();
              var resSpeak = await voiceRoot.speakSegment({
                sutta_uid,
                segment,
                language: "pli",
                translator,
                usage: "recite",
              });
              segment.audio.pli = resSpeak.signature.guid;
              segment.audio.vnamePali = resSpeak.altTts;
            }
            var audio = segment.audio;
            that.info(
              `GET ${req.url} =>`,
              audio[langTrans] ? `${langTrans}:${audio[langTrans]}` : ``,
              audio.pli ? `pli:${audio.pli}` : ``
            );
            resolve({
              sutta_uid,
              scid,
              language: langTrans, // deprecated
              langTrans,
              translator,
              title: section.title,
              section: iSection,
              nSections: sutta.sections.length,
              vnameTrans: voiceTrans.name,
              vnameRoot,
              iSegment,
              segment,
            });
          } catch (e) {
            that.warn(`GET ${req.url} => `, e.message);
            reject(e);
          }
        })();
      };
      return new Promise(pbody);
    }

    getPlayWord(req, res, next) {
      var that = this;
      var { langTrans, word, vname } = this.suttaParms(req);
      if (/[0-9]+/.test(vname)) {
        var iVoice = Number(vname);
      }
      if (langTrans !== "pli") {
        return Promise.resolve(
          new Error(`Only Pali words can be spoken individually`)
        );
      }
      if (vname !== "Aditi") {
        return Promise.resolve(new Error(`Only Aditi can speak Pali words`));
      }
      if (!word) {
        return Promise.resolve(new Error(`No word given to speak`));
      }
      var scAudio = this.scAudio;
      var voice = Voice.voiceOfName(vname);
      var voiceRoot = this.voiceFactory.voiceOfName(vname);
      that.info(`GET ${req.url}`);
      var usage = voice.usage || "recite";
      var pbody = (resolve, reject) => {
        (async function () {
          try {
            var voiceTrans = Voice.createVoice({
              name: voice.name,
              usage,
              soundStore: that.soundStore,
              localeIPA: "pli",
              audioFormat: that.soundStore.audioFormat,
              audioSuffix: that.soundStore.audioSuffix,
              scAudio,
              fwsEn,
            });
            var volume = "play-word";
            var translator = "ms";
            var resSpeak = await voiceTrans.speak(word, {
              language: langTrans,
              translator,
              usage,
              volume,
            });
            var { hits, misses, signature } = resSpeak || {};
            resolve({
              word,
              langTrans,
              voice: voice.name,
              hits,
              misses,
              signature,
            });
          } catch (e) {
            reject(e);
          }
        })();
      };
      return new Promise(pbody);
    }

    async getSearch(req, res, next) {
      try {
        var language = req.params.lang || "en";
        LANG_MAP[language] && (language = LANG_MAP[language]);

        var pattern = req.params.pattern;
        if (!pattern) {
          throw new Error("Search pattern is required");
        }
        var maxResults = Number(
          req.query.maxResults || this.suttaStore.maxResults
        );
        if (isNaN(maxResults)) {
          throw new Error("Expected number for maxResults");
        }
        var srOpts = {
          pattern,
          language,
          maxResults,
        };
        var sr = await this.suttaStore.search(srOpts);
        var { method, results, mlDocs } = sr;
        this.info(
          `GET search(${pattern}) ${language} ${method}`,
          `=> ${results.map((r) => r.uid)}`
        );
        return sr;
      } catch (e) {
        this.warn(`getSearch(${JSON.stringify(srOpts)})`, e.message);
        throw e;
      }
    }

    async buildDownload(args) {
      try {
        var { soundStore, suttaStore, voiceFactory, bilaraData } = this;
        var {
          audioSuffix,
          vroot,
          langs,
          language,
          vname,
          pattern,
          maxResults,
        } = args;

        if (isNaN(maxResults)) {
          throw new Error("Expected number for maxResults");
        }
        try {
          var playlist = await suttaStore.createPlaylist({
            pattern,
            languages: langs,
            language,
            maxResults,
            audioSuffix,
          });
        } catch (e) {
          console.log(`oopsie`, e.stack);
          return e.stack.toString();
        }

        var voiceLang = voiceFactory.voiceOfName(vname);
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
        var audio = await playlist.speak({
          voices: {
            pli: voiceRoot,
            [language]: voiceLang,
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
        var filename = `${uriPattern}_${langs.join(
          "+"
        )}_${vname}${audioSuffix}`;
        return {
          filepath,
          filename,
          guid,
          stats,
          buildDate,
        };
      } catch (e) {
        this.warn(`buildDownload()`, JSON.stringify(args, null, 2), e.message);
        throw e;
      }
    }

    async getBuildDownload(req, res, next) {
      try {
        var { initialized, soundStore, suttaStore, mj, downloadMap } = this;
        if (!initialized) {
          throw new Error(`${this.constructor.name} is not initialized`);
        }
        var type = req.params.type || "unknown-type";
        let audioSuffix = soundStore.audioSuffix;
        audioSuffix = type === "opus" ? ".opus" : audioSuffix;
        audioSuffix = type === "ogg" ? ".ogg" : audioSuffix;
        audioSuffix = type === "mp3" ? ".mp3" : audioSuffix;
        var vroot = req.params.vroot || "Aditi";
        var langs = (req.params.langs || "pli+en")
          .toLowerCase()
          .split("+")
          .map((l) => LANG_MAP[l] || l);
        var language = langs.filter((l) => l !== "pli")[0];
        var language =
          language || LANG_MAP[req.query.lang] || req.query.lang || "en";
        var vname = (req.params.voice || "Amy").toLowerCase();
        var pattern = req.params.pattern;
        if (!pattern) {
          throw new Error("Search pattern is required");
        }
        var maxResults = Number(req.query.maxResults || suttaStore.maxResults);

        let downloadArgs = {
          audioSuffix,
          vroot,
          langs,
          language,
          vname,
          pattern,
          maxResults,
        };
        let hash = mj.hash(downloadArgs);
        let value = downloadMap[hash];
        if (value && !(value instanceof Promise)) {
          if (!fs.existsSync(value.filepath)) {
            // downloadMap is stale.
            downloadMap[hash] = value = null;
          }
        }
        if (value == null) {
          this.info(`buildDownload(${hash}) started`);
          value = this.buildDownload(downloadArgs);
          downloadMap[hash] = value;
          value.then((v) => {
            downloadMap[hash] = v;
            this.info(`buildDownload(${hash}) ok:`, JSON.stringify(v));
          });
        }
        if (value && !(value instanceof Promise)) {
          downloadArgs.filename = value.filename;
          downloadArgs.guid = value.guid;
        }
        return downloadArgs;
      } catch (e) {
        this.warn(`getBuildDownload`, JSON.stringify({}), e.message);
        throw e;
      }
    }

    async getDownloadPlaylist(req, res, next) {
      try {
        var { initialized, soundStore, suttaStore, mj, downloadMap } = this;
        if (!initialized) {
          throw new Error(`${this.constructor.name} is not initialized`);
        }
        let route = req.route.path.split("/");
        let audioSuffix = soundStore.audioSuffix;
        audioSuffix = route[2] === "opus" ? ".opus" : audioSuffix;
        audioSuffix = route[2] === "ogg" ? ".ogg" : audioSuffix;
        var vroot = req.params.vroot || "Aditi";
        var langs = (req.params.langs || "pli+en")
          .toLowerCase()
          .split("+")
          .map((l) => LANG_MAP[l] || l);
        var language = langs.filter((l) => l !== "pli")[0];
        var language =
          language || LANG_MAP[req.query.lang] || req.query.lang || "en";
        var vname = (req.params.voice || "Amy").toLowerCase();
        var pattern = req.params.pattern;
        if (!pattern) {
          throw new Error("Search pattern is required");
        }
        var maxResults = Number(req.query.maxResults || suttaStore.maxResults);

        let downloadArgs = {
          audioSuffix,
          vroot,
          langs,
          language,
          vname,
          pattern,
          maxResults,
        };
        let hash = mj.hash(downloadArgs);
        let value = downloadMap[hash];
        if (!value || value instanceof Promise) {
          value = await this.buildDownload(downloadArgs);
        }
        let { filepath, filename, guid, stats } = value;
        var data = await fs.promises.readFile(filepath);
        res.set("Content-disposition", "attachment; filename=" + filename);
        this.info(
          `GET download/${langs}/${pattern} => ` +
            `${filename} size:${data.length} ` +
            `secs:${stats.duration} ${guid}`
        );
        let date = new Date();
        res.cookie("download-date", date.toISOString()); // DEPRECATED
        return data;
      } catch (e) {
        this.warn(`getDownloadPlaylist`, JSON.stringify({}), e.message);
        throw e;
      }
    }

    getExamples(req, res, next) {
      var that = this;
      let { bilaraData } = this;
      let lang = req.query.lang;
      lang = LANG_MAP[lang] || lang || "en";
      var n = Number(req.params.n);
      let langExamples = bilaraData.examples[lang] || bilaraData.examples.en;
      var nShuffle = langExamples.length;
      for (var i = 0; i < nShuffle; i++) {
        var j = Math.trunc(Math.random() * langExamples.length);
        var t = langExamples[i];
        langExamples[i] = langExamples[j];
        langExamples[j] = t;
      }

      return Number.isInteger(n) && n > 0
        ? langExamples.slice(0, n)
        : langExamples.sort();
    }

    getWikiAria(req, res, next) {
      var that = this;
      var page = req.params.page || "Home.md";
      return new Promise((resolve, reject) => {
        (async function () {
          try {
            var result = `${page} not found`;
            var wikiUrl = `${that.wikiUrl}/${page}`;
            var httpx = wikiUrl.startsWith("https") ? https : http;
            var urlObj = URL.parse(wikiUrl);
            var httpOpts = Object.assign(
              {
                headers: {
                  "Cache-Control": "no-cache",
                  //"Pragma": "no-cache",
                },
              },
              urlObj
            );
            var wikiReq = httpx
              .get(httpOpts, function (wikiRes) {
                const { statusCode } = wikiRes;
                const contentType = wikiRes.headers["content-type"];

                let error;
                let okStatus = {
                  200: true,
                  302: true,
                  304: true,
                };
                if (!okStatus[statusCode]) {
                  error = new Error(
                    `Request failed for ${wikiUrl}\n` +
                      `Status Code: ${statusCode}`
                  );
                } else if (/^text\/html/.test(contentType)) {
                  // OK
                } else if (/^text\/plain/.test(contentType)) {
                  // OK
                } else {
                  error = new Error(
                    "Invalid content-type.\n" +
                      `Expected application/json but received ${contentType}`
                  );
                }
                if (error) {
                  wikiRes.resume(); // consume response data to free up memory
                  that.warn(error.stack);
                  reject(error);
                  return;
                }

                wikiRes.setEncoding("utf8");
                let rawData = "";
                wikiRes.on("data", (chunk) => {
                  rawData += chunk;
                });
                wikiRes.on("end", () => {
                  try {
                    var md = rawData.toString();
                    var html = that.mdAria.toHtml(md);
                    resolve({
                      url: wikiUrl,
                      html: html,
                    });
                  } catch (e) {
                    that.warn(e.stack);
                    reject(e);
                  }
                });
              })
              .on("error", (e) => {
                that.warn(e.stack);
                reject(e);
              })
              .on("timeout", (e) => {
                that.warn(e);
                wikiReq.abort();
              });
          } catch (e) {
            reject(e);
          }
        })();
      });
    }

    getDebugEphemerals(req, res, next) {
      return {
        ephemeralAge: this.soundStore.ephemeralAge,
        ephemeralInterval: this.soundStore.ephemeralInterval,
        ephemerals: this.soundStore.ephemerals,
      };
    }

    postLogin(req, res, next) {
      var that = this;
      var us = that.userStore;
      var { username, password } = req.body || {};

      return new Promise((resolve, reject) => {
        (async function () {
          try {
            var authuser = await us.authenticate(username, password);
            if (authuser == null) {
              res.locals.status = 401;
              that.warn(`POST login ${username} => HTTP401 UNAUTHORIZED`);
              throw new Error("Invalid username/password");
            }
            delete authuser.credentials;
            that.info(`POST login ${username} => ${JSON.stringify(authuser)}`);
            var token = jwt.sign(authuser, JWT_SECRET, {
              expiresIn: that.jwtExpires,
            });
            authuser.token = token;
            resolve(authuser);
          } catch (e) {
            reject(e);
          }
        })();
      });
    }

    getUsers(req, res, next) {
      var that = this;
      return new Promise((resolve, reject) => {
        (async function () {
          try {
            var decoded = jwt.decode(req.headers.authorization.split(" ")[1]);
            var users = await that.userStore.users();
            if (!decoded.isAdmin) {
              users = {
                [decoded.username]: users[decoded.username],
              };
            }
            resolve(users);
          } catch (e) {
            reject(e);
          }
        })();
      });
    }

    getLogs(req, res, next) {
      var that = this;
      return new Promise((resolve, reject) => {
        (async function () {
          try {
            var logDir = path.join(LOCAL, "logs");
            fs.readdir(logDir, null, (err, files) => {
              if (err) {
                reject(err);
              } else {
                files.sort((a, b) => -a.localeCompare(b));
                resolve(
                  files.map((f) => {
                    var fpath = path.join(logDir, f);
                    var stats = fs.statSync(fpath);
                    return {
                      name: f,
                      size: stats.size,
                      mtime: stats.mtime,
                      ctime: stats.ctime,
                    };
                  })
                );

                //resolve(files.sort((a,b)=>-a.localeCompare(b)));
              }
            });
          } catch (e) {
            reject(e);
          }
        })();
      });
    }

    getLog(req, res, next) {
      var that = this;
      var { ilog } = req.params;
      if (ilog == null) {
        ilog = 0;
      }
      return new Promise((resolve, reject) => {
        (async function () {
          try {
            var logDir = path.join(LOCAL, "logs");
            fs.readdir(logDir, null, (err, files) => {
              if (err) {
                reject(err);
              } else {
                files.sort((a, b) => -a.localeCompare(b));
                var file = files[ilog];
                if (file) {
                  file = path.join(logDir, file);
                  fs.readFile(file, (err, data) => {
                    if (err) {
                      reject(err);
                    } else {
                      res.set("Content-Type", "text/plain");
                      resolve(data);
                    }
                  });
                } else {
                  reject(new Error(`Log file not found:${ilog}`));
                }
              }
            });
          } catch (e) {
            reject(e);
          }
        })();
      });
    }

    postDeleteUser(req, res, next) {
      var that = this;
      return new Promise((resolve, reject) => {
        (async function () {
          try {
            var { username } = req.body || {};
            var decoded = jwt.decode(req.headers.authorization.split(" ")[1]);
            if (decoded.username !== username && !decoded.isAdmin) {
              throw new Error(
                "Unauthorized user deletion" +
                  `of:${username} by:${decoded.username}`
              );
            }
            var result = await that.userStore.deleteUser(username);
            that.info(
              `POST delete-user ` +
                `user:${username} by:${decoded.username} => OK`
            );
            resolve(result);
          } catch (e) {
            reject(e);
          }
        })();
      });
    }

    postAddUser(req, res, next) {
      var that = this;
      return new Promise((resolve, reject) => {
        (async function () {
          try {
            var user = {
              username: req.body.username,
              password: req.body.password,
              isAdmin: req.body.isAdmin,
              isTranslator: req.body.isTranslator,
              isEditor: req.body.isEditor,
            };
            var decoded = jwt.decode(req.headers.authorization.split(" ")[1]);
            var result = await that.userStore.addUser(user);
            that.info(
              `POST add-user ` +
                `user:${user.username} by:${decoded.username} => OK`
            );
            resolve(result);
          } catch (e) {
            reject(e);
          }
        })();
      });
    }

    postSetPassword(req, res, next) {
      var that = this;
      return new Promise((resolve, reject) => {
        (async function () {
          try {
            var { username, password } = req.body || {};
            var decoded = jwt.decode(req.headers.authorization.split(" ")[1]);
            var result = await that.userStore.setPassword(username, password);
            that.info(
              `POST set-password ` +
                `for:${username} by:${decoded.username} => OK`
            );
            resolve(result);
          } catch (e) {
            reject(e);
          }
        })();
      });
    }

    static get JWT_SECRET() {
      return JWT_SECRET;
    }

    requireAdmin(req, res, msg) {
      var that = this;
      var authorization = req.headers.authorization || "";
      var decoded = jwt.decode(authorization.split(" ")[1]);
      var { username } = decoded;
      if (decoded.isAdmin) {
        that.info(`${msg}:${username} => AUTHORIZED`);
      } else {
        res.locals.status = 401;
        that.warn(`${msg}:${username} => HTTP401 UNAUTHORIZED (ADMIN)`);
        throw new Error("Admin privilege required");
      }
      return true;
    }

    getSoundStoreVolumeInfo(req, res, next) {
      var that = this;
      return new Promise((resolve, reject) => {
        (async function () {
          try {
            that.requireAdmin(req, res, "GET sound-store/volume-info");
            resolve(that.soundStore.volumeInfo());
          } catch (e) {
            reject(e);
          }
        })();
      });
    }

    async getSoundPruner(req, res, next) {
      this.requireAdmin(req, res, "GET sound-store/pruner");
      var {
        done,
        earliest,
        pruneDays,
        pruning,
        bytesScanned,
        bytesPruned,
        filesPruned,
        started,
      } = this.soundStore.filePruner;
      return {
        done,
        earliest,
        pruneDays,
        pruning,
        bytesScanned,
        bytesPruned,
        filesPruned,
        started,
      };
    }

    postSoundPruner(req, res, next) {
      var filePruner = this.soundStore.filePruner;
      this.requireAdmin(req, res, "POST sound-store/prune");
      filePruner.pruneDays = req.body.pruneDays;
      filePruner.pruneOldFiles().then((res) => {
        let { started, earliest, bytesScanned, bytesPruned, filesPruned } = res;
        this.info(`pruneOldFiles()`, res);
      });
      return this.getSoundPruner(req, res, next);
    }

    postSoundStoreClearVolume(req, res, next) {
      var that = this;
      return new Promise((resolve, reject) => {
        (async function () {
          try {
            that.requireAdmin(req, res, "POST sound-store/clear-volume");
            var { volume } = req.body || {};
            var result = await that.soundStore.clearVolume(volume);
            resolve(result);
          } catch (e) {
            reject(e);
          }
        })();
      });
    }

    postReboot(req, res, next) {
      var that = this;
      return new Promise((resolve, reject) => {
        (async function () {
          try {
            that.requireAdmin(req, res, "POST reboot");
            var cmd = `scripts/restart`;
            that.warn(`${cmd}`);
            var cwd = path.join(__dirname, "../..");
            var error = null;
            exec(cmd, { cwd }, (e, stdout, stderr) => {
              if (e) {
                that.warn(`POST reboot: ${cwd} => HTTP500`);
                that.warn(e.stack);
                error = e;
              }
            });
            setTimeout(() => {
              if (error) {
                reject(error);
              } else {
                resolve({
                  reboot: 59,
                });
              }
            }, 1000);
          } catch (e) {
            reject(e);
          }
        })();
      });
    }

    postUpdateRelease(req, res, next) {
      var that = this;
      return new Promise((resolve, reject) => {
        (async function () {
          try {
            that.requireAdmin(req, res, "POST update-release");
            var cmd = `scripts/update -r`;
            var cwd = path.join(__dirname, "../..");
            var error = null;
            exec(cmd, { cwd }, (e, stdout, stderr) => {
              if (e) {
                that.warn(`POST update-release: ${cwd} => HTTP500`);
                that.warn(e.stack);
                error = e;
              } else {
                error = false;
              }
              that.info(`postUpdateRelease-stdout: ${stdout.toString()}`);
              that.info(`postUpdateRelease-stderr: ${stderr.toString()}`);
            });
            setTimeout(() => {
              if (error) {
                reject(error);
              } else if (error === false) {
                that.info(`POST update-release: ${cwd} => release is current`);
                resolve({
                  updateRelease: false,
                });
              } else {
                that.info(`POST update-release: ${cwd} => updating...`);
                resolve({
                  updateRelease: true,
                });
              }
            }, 1000);
          } catch (e) {
            reject(e);
          }
        })();
      });
    }

    awsCredsBucket(Bucket) {
      var credPath = path.join(LOCAL, "aws-creds.json");
      var creds;
      if (fs.existsSync(credPath)) {
        creds = JSON.parse(fs.readFileSync(credPath));
        Bucket && (creds.Bucket = Bucket);
      }
      return new S3Bucket(creds).initialize();
    }

    getVsmListObjects(req, res, next) {
      var that = this;
      var { soundStore } = that;
      return new Promise((resolve, reject) => {
        (async function () {
          try {
            that.requireAdmin(req, res, `GET vsm/list-objects`);
            var s3Bucket = await that.awsCredsBucket();
            var params;
            var result = await s3Bucket.listObjects(params);
            var Contents = result.Contents;
            for (var iCon = 0; iCon < Contents.length; iCon++) {
              var c = Contents[iCon];
              var volume = path.basename(c.Key, `.tar.gz`);
              var manifestPath = path.join(
                soundStore.storePath,
                volume,
                `manifest.json`
              );
              c.upToDate = false;
              if (fs.existsSync(manifestPath)) {
                var manifest = JSON.parse(fs.readFileSync(manifestPath));
                c.upToDate = c.ETag === manifest.ETag;
                c.restored = manifest.restored;
              }
            }
            resolve(result);
          } catch (e) {
            reject(e);
          }
        })();
      });
    }

    getVsmFactoryTask(req, res, next) {
      var that = this;
      return new Promise((resolve, reject) => {
        (async function () {
          try {
            that.requireAdmin(req, res, "GET vsm/factory-task");
            resolve(that.vsmFactoryTask);
          } catch (e) {
            reject(e);
          }
        })();
      });
    }

    getVsmS3Credentials(req, res, next) {
      var that = this;
      return new Promise((resolve, reject) => {
        (async function () {
          try {
            that.requireAdmin(req, res, "GET vsm/s3-credentials");
            var creds = new S3Creds();
            resolve(creds.obfuscated());
          } catch (e) {
            reject(e);
          }
        })();
      });
    }

    async postVsmS3Credentials(req, res, next) {
      try {
        this.requireAdmin(req, res, "POST vsm/s3-credentials");
        var creds = req.body;
        var { Bucket, s3, polly } = creds;
        var { endpoint, region } = s3;

        // validate S3 creds
        this.info(
          `POST vsm/s3-credentials ` +
            `Bucket:${Bucket} endpoint:${endpoint} region:${region}`
        );
        var s3Bucket = await new S3Bucket(creds).initialize();

        var credPath = path.join(LOCAL, "aws-creds.json");
        var s3Creds = new S3Creds({ awsConfig: creds });
        var json = JSON.stringify(s3Creds.awsConfig, null, 2);
        await fs.promises.writeFile(credPath, json);
        this.info(`vsm/s3-credentials verified and saved to: ${credPath}`);
        return {
          Bucket,
          s3: {
            endpoint,
            region,
          },
        };
      } catch (e) {
        this.warn(`postVsmS3Credentials()`, e.message);
        throw e;
      }
    }

    postVsmCreateArchive(req, res, next) {
      var that = this;
      var { soundStore } = that;
      var task = that.vsmFactoryTask;
      if (task.isActive) {
        return Promise.reject(
          new Error(
            `VSM Factory is busy started:${task.started} summary:${task.summary}`
          )
        );
      }
      return new Promise((resolve, reject) => {
        (async function () {
          try {
            that.requireAdmin(req, res, "POST vsm/create-archive");
            var { maxSuttas, nikaya, lang, author, voice, postArchive } =
              req.body;
            task.start(
              `Building VSM for ` +
                `nikaya:${nikaya} language:${lang} voice:${voice}`,
              1
            );
            postArchive = postArchive == null ? true : postArchive;
            var s3Bucket = await that.awsCredsBucket();
            var tmpDirObj = tmp.dirSync({
              unsafeCleanup: true,
            });
            var vsm = new VsmStore({
              s3Bucket,
              soundStore,
              storePath: tmpDirObj.name,
            });
            vsm
              .importNikaya({
                nikaya,
                voice,
                maxSuttas,
                lang,
                author,
                task,
              })
              .then((resImport) => {
                (async function () {
                  try {
                    if (postArchive) {
                      var resArchive = await vsm.archiveNikaya({
                        nikaya,
                        voice,
                        maxSuttas,
                        lang,
                        author,
                        task,
                      });
                    }
                    that.info(`removing ${tmpDirObj.name}`);
                    tmpDirObj.removeCallback();
                    task.actionsDone++;
                  } catch (e) {
                    task.error = e.message;
                    reject(e);
                  }
                })();
              })
              .catch((e) => {
                task.error = e.message;
                reject(e);
              });
            resolve({
              voice: typeof voice === "string" ? voice : voice.name,
              maxSuttas,
              nikaya,
              lang,
              author,
              postArchive,
              task,
            });
          } catch (e) {
            reject(e);
          }
        })();
      });
    }

    postVsmRestoreS3Archives(req, res, next) {
      var that = this;
      var { soundStore } = that;
      return new Promise((resolve, reject) => {
        (async function () {
          try {
            that.requireAdmin(req, res, "POST vsm/restore-s3-archives");
            var { Bucket, restore, clearVolume } = req.body;
            if (restore == null) {
              throw new Error(`Missing required property: restore`);
            }
            var s3Bucket = await that.awsCredsBucket(Bucket);
            var { Bucket, s3 } = s3Bucket;
            var { endpoint, region } = s3.config;
            var vsm = new VsmStore({
              s3Bucket,
              soundStore,
            });
            var resRestore = await vsm.restoreS3Archives({
              s3Bucket,
              restore,
              clearVolume,
            });
            that.info(
              `POST vsm/restore-s3-archives ` +
                `Bucket:${Bucket} endpoint:${endpoint} region:${region}`
            );
            resolve({
              restore,
              clearVolume,
              Bucket,
              s3: {
                endpoint,
                region,
              },
            });
          } catch (e) {
            reject(e);
          }
        })();
      });
    }

    getAudioUrls(req, res, next) {
      var sutta_uid = req.params.sutta_uid;
      if (!sutta_uid) {
        return Promise.reject(new Error("Expected sutta_uid"));
      }
      return this.audioUrls.sourceUrls(sutta_uid);
    }

    getUpdateContentTask(req, res, next) {
      var that = this;
      return new Promise((resolve, reject) => {
        (async function () {
          try {
            that.requireAdmin(req, res, "GET update-content/task");
            var task = Object.assign({}, that.updateContentTask);
            task.error && (task.error = task.error.message);
            resolve(task);
          } catch (e) {
            reject(e);
          }
        })();
      });
    }

    postUpdateContent(req, res, next) {
      var that = this;
      var { nikayas, suids, token } = req.body || {};
      var task = that.updateContentTask;
      if (task.isActive) {
        return Promise.reject(
          new Error(
            [
              `ContentUpdater is busy`,
              `started:${task.started}`,
              `summary:${task.summary}`,
            ].join(" ")
          )
        );
      }
      var { suttaStore } = that;

      return new Promise((resolve, reject) => {
        (async function () {
          try {
            that.requireAdmin(req, res, "POST update-content");
            if (nikayas instanceof Array) {
              if (suids != null) {
                that.warn(`Ignoring provided suids:${suids}`);
              }
              suids = [];
              for (var i = 0; i < nikayas.length; i++) {
                var nikaya = nikayas[i];
                var nikaya_suids = await suttaStore.nikayaSuttaIds(nikaya);
                suids = suids.concat(nikaya_suids);
              }
            }
            task.start(`Updating content for ${suids.length} suttas`);
            var updater = await new ContentUpdater({
              token,
            }).initialize();
            updater
              .update(suids, {
                task,
                suids,
              })
              .then((res) => {
                that.info(
                  `postUpdateContent()`,
                  `completed: ${suids.length} suttas`
                );
              })
              .catch((e) => {
                that.warn(`postUpdateContent()`, `failed: ${e.message}`);
              });
            resolve(task);
          } catch (e) {
            that.warn(`postUpdateContent() failed: ${e.message}`);
            reject(e);
          }
        })();
      });
    }

    async postUpdateBilara(req, res, next) {
      try {
        var { token, purge } = req.body || {};
        var { suttaStore } = this;

        this.requireAdmin(req, res, "POST update-content");
        var date = new Date();
        await suttaStore.bilaraData.sync({ purge });
        var error = null;
        return {
          date,
          elapsed: ((Date.now() - date) / 1000).toFixed(1),
          summary: "Update completed",
          error,
        };
      } catch (e) {
        this.warn(`postUpdateBilara() failed: ${e.message}`);
        throw e;
      }
    }

    async getBilara(req, res, next) {
      try {
        var scid = req.params.scid;
        return {
          message: `Hello World, this is Bilara!`,
          scid,
        };
      } catch (e) {
        this.warn(e);
        throw e;
      }
    }
  }

  module.exports = exports.ScvApi = ScvApi;
})(typeof exports === "object" ? exports : (exports = {}));
TODO*/
