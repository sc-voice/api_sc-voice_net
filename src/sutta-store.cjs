(function (exports) {
  const fs = require("fs");
  const path = require("path");
  const { logger, LogInstance } = require("log-instance");
  const { exec } = require("child_process");
  const { BilaraData, BilaraPath, ExecGit, Seeker } = require("scv-bilara");
  const { ScApi, SuttaCentralId } = require("suttacentral-api");
  const Playlist = require("./playlist.cjs");
  const Sutta = require("./sutta.cjs");
  const Task = require("./task.cjs");
  const SuttaDuration = require("./sutta-duration.cjs");
  const SuttaFactory = require("./sutta-factory.cjs");
  const Words = require("./words.cjs");
  const LOCAL_DIR = path.join(__dirname, "..", "local");
  const maxBuffer = 10 * 1024 * 1024;
  const MAXRESULTS_LEGACY = 5;
  const COLLECTIONS = {
    an: {
      name: "an",
      folder: "an",
      subchapters: true,
    },
    mn: {
      name: "mn",
      folder: "mn",
      subchapters: false,
    },
    dn: {
      name: "dn",
      folder: "dn",
      subchapters: false,
    },
    sn: {
      name: "sn",
      folder: "sn",
      subchapters: true,
    },
    thig: {
      name: "thig",
      folder: "kn",
      subchapters: true,
    },
    thag: {
      name: "thag",
      folder: "kn",
      subchapters: true,
    },
  };

  var suttaPaths = {};
  var _suttaStore;

  class SuttaStore {
    constructor(opts = {}) {
      const msg = 'SuttaStore.ctor() ';
      var that = this;
      (opts.logger || logger).logInstance(this, opts);
      this.scApi = opts.scApi || new ScApi();
      this.suttaFactory =
        opts.suttaFactory ||
        new SuttaFactory({
          scApi: this.scApi,
          autoSection: true,
          suttaLoader: (scid) => that.loadBilaraSutta(scid),
        });
      this.autoSyncSeconds = opts.autoSyncSeconds || 0;
      this.autoSyncCount = 0;

      let execGit = new ExecGit({
        repo: "https://github.com/ebt-site/ebt-data.git",
        logger: this,
      });
      this.bilaraData =
        opts.BilaraData ||
        new BilaraData({
          name: "ebt-data",
          branch: "published",
          execGit,
          logger: this,
        });
      let root = opts.root || path.join(LOCAL_DIR, this.bilaraData.name);
      this.info(msg, {root});
      this.seeker =
        opts.Seeker ||
        new Seeker({
          bilaraData: this.bilaraData,
          root,
          logger: this,
          matchHighlight: false,
        });
      this.maxDuration = opts.maxDuration || 3 * 60 * 60;
      this.maxResults = opts.maxResults || MAXRESULTS_LEGACY;
      this.voice = opts.voice;
      this.words = opts.words || new Words();
      this.suttaDuration = opts.suttaDuration || new SuttaDuration();
      Object.defineProperty(this, "isInitialized", {
        writable: true,
        value: false,
      });
    }

    static get suttaStore() {
      if (_suttaStore == null) {
        _suttaStore = new SuttaStore();
      }
      return _suttaStore;
    }

    async initialize() {
      try {
        if (this.isInitialized) {
          return Promise.resolve(this);
        }
        this.isInitialized = true;
        let { suttaFactory, seeker, autoSyncSeconds, bilaraData } = this;
        await suttaFactory.initialize();
        await seeker.initialize();
        if (autoSyncSeconds) {
          let that = this;
          let autoSync = async ()=>{
            while (that.autoSyncSeconds) {
              that.info(`autoSync @ ${autoSyncSeconds}s => syncEbtData()`);
              bilaraData.syncEbtData()
              .then(()=>{
                that.autoSyncCount++;
              }).catch(e=>{
                that.warn("autoSync failed:", e.message);
                that.warn("autoSync disabled");
                that.autoSyncSeconds = 0;
              });
              await new Promise(r=>setTimeout(()=>r(), autoSyncSeconds*1000));
            }
          }
          autoSync();
        }

        return this;
      } catch (e) {
        this.warn(`initialize()`);
        throw e;
      }
    }

    static isUidPattern(pattern) {
      var commaParts = pattern
        .toLowerCase()
        .split(",")
        .map((p) => p.trim());
      return commaParts.reduce((acc, part) => {
        return acc && /^[a-z]+ ?[0-9]+[-0-9a-z.:\/]*$/i.test(part);
      }, true);
    }

    static sanitizePattern(pattern) {
      const msg = 'sutta-store.sanitizePattern() ';
      if (!pattern) {
        throw new Error(`${msg} pattern is required`);
      }
      const MAX_PATTERN = 1024;
      var excess = pattern.length - MAX_PATTERN;
      if (excess > 0) {
        throw new Error(`Search text too long by ${excess} characters.`);
      }
      // replace quotes (code injection on grep argument)
      pattern = pattern.replace(/["']/g, ".");
      // eliminate tabs, newlines and carriage returns
      pattern = pattern.replace(/\s/g, " ");
      // remove control characters
      pattern = pattern.replace(/[\u0000-\u001f\u007f]+/g, "");
      // must be valid
      new RegExp(pattern);

      return pattern;
    }

    static normalizePattern(pattern) {
      // normalize white space to space
      pattern = pattern.replace(/[\s]+/g, " +");

      return pattern;
    }

    static paliPattern(pattern) {
      return /^[a-z]+$/i.test(pattern)
        ? pattern
            .replace(/a/giu, "(a|ā)")
            .replace(/i/giu, "(i|ī)")
            .replace(/u/giu, "(u|ū)")
            .replace(/m/giu, "(m|ṁ|ṃ)")
            .replace(/d/giu, "(d|ḍ)")
            .replace(/n/giu, "(n|ṅ|ñ|ṇ)")
            .replace(/l/giu, "(l|ḷ)")
            .replace(/t/giu, "(t|ṭ)")
        : pattern;
    }

    async createPlaylist(...args) {
      try {
        var opts = args[0];
        if (typeof opts === "string") {
          opts = {
            pattern: args[0],
            maxResults: args[1],
          };
        }
        var { lang, language, method, suttaRefs, suttas, resultPattern } =
          await this.findSuttas(opts);
        lang = lang || language;
        let logLevel = opts.logLevel ?? this.logLevel;
        var maxDuration = opts.maxDuration || this.maxDuration;
        var languages = opts.languages || ["pli", lang];
        var playlist = new Playlist({ languages, logLevel });
        suttas.forEach((sutta) => playlist.addSutta(sutta));
        var duration = playlist.stats().duration;
        if (duration > this.maxDuration) {
          languages = opts.languages || [lang];
          playlist = new Playlist({ languages, logLevel });
          var minutes = (this.maxDuration / 60).toFixed(0);
          playlist.addTrack(
            "createPlaylist_error1",
            `Play list is too long to be played. ` +
              `All play lists must be less than ` +
              `${minutes} minutes long`
          );
        }
        return playlist;
      } catch (e) {
        this.warn(`createPlaylist()`, JSON.stringify(args), e.message);
        throw e;
      }
    }

    findSuttas(...args) {
      var that = this;
      var pbody = (resolve, reject) =>
        (async function () {
          try {
            var res = await that.search.apply(that, args);
            res.suttas = res.results.map((r) => r.sutta);
            resolve(res);
          } catch (e) {
            reject(e);
          }
        })();
      return new Promise(pbody);
    }

    async loadBilaraSutta(opts) {
      const msg = 'SuttaStore.loadBilaraSutta() ';
      try {
        if (typeof opts === "string") {
          opts = {
            scid: opts,
          };
        }
        var { 
          scid, language, langTrans, translator, expand, matchHighlight,
          trilingual, minLang,
        } = opts;
        var lang = langTrans || language || scid.split("/")[1] || "en";
        var pattern = translator
          ? `${scid}/${lang}/${translator}`
          : `${scid}/${lang}`;
        var findOpts = {
          pattern,
          lang,
          showMatchesOnly: false,
          matchHighlight,
          trilingual,
          minLang,
        };
        var bdres = await this.seeker.find(findOpts);
        var mld = bdres.mlDocs[0];
        if (mld == null) {
          return null;
        }
        var mldRes = await this.mldResult(mld, lang);
        return mldRes.sutta;
      } catch (e) {
        this.warn(`loadBilaraSutta(${JSON.stringify(opts)})`, e.message);
        throw e;
      }
    }

    async loadSutta(opts) {
      try {
        var sutta = await this.loadBilaraSutta(opts);
        if (!sutta) {
          var {
            scid,
            language,
            langTrans,
            translator,
            expand,
            matchHighlight,
          } = opts;
          var suttaRef = `${scid}/${language}/${translator}`;
          this.log(`loadSutta(${suttaRef}) legacy `);
          sutta = await this.suttaFactory.loadSutta({
            scid,
            translator,
            language,
          });
        }
        return sutta;
      } catch (e) {
        this.warn(e);
        throw e;
      }
    }

    async mldResult(mld, lang) {
      const msg = 'SuttaStore.mldResult() ';
      try {
        if (mld == null) {
          throw new Error(`Expected MLDoc`);
        }
        var { scApi, suttaFactory, bilaraData: bd } = this;
        var { trilingual, suid: sutta_uid, translations } = mld;
        lang = trilingual
          ? mld.docLang || lang || "en"
          : lang || mld.lang || "en";
        let trans = translations.filter((t) => t.lang === lang)[0];
        if (!trans) { 
          trans = translations[0];
          lang = trans?.lang || 'pli';
        }
        let author_uid = trans?.author_uid || 'ms';
        var blurb = await bd.readBlurb({suid: sutta_uid, lang});
        var suttaplex = {};
        try {
          suttaplex = await bd.loadSuttaplexJson(
            sutta_uid, lang, author_uid);
        } catch(e) {
          logger.warn(msg, e.message);
        }
        //console.log(msg, {trans, lang, author_uid, blurb, suttaplex});
        var authorInfo = bd.authorInfo(author_uid);
        var author = (authorInfo && authorInfo.name) || author_uid;
        var segments = mld.segments();
        var titles = mld.titles();
        var translation = {
          author_uid,
          lang,
        };
        var sutta = new Sutta({
          sutta_uid,
          author,
          author_uid,
          lang,
          titles,
          support: true,
          suttaplex,
          segments,
          translation,
        });
        var sectSutta = suttaFactory.sectionSutta(sutta);
        var quote = // prefer non-title quotes
          segments.filter((s, i) => s.matched && i > 1)[0] || segments[0];
        var blurb = await this.bilaraData.readBlurb({
          suid: sutta_uid,
          lang,
        });
        sectSutta.blurb = blurb;
        let author_short = author_uid
          ? author_uid.charAt(0).toUpperCase() + author_uid.slice(1)
          : null
        let stats = this.suttaDuration.measure(sutta);
        return {
          count: mld.score,
          uid: sutta_uid,
          lang,
          author,
          author_short,
          author_uid,
          author_blurb: authorInfo && authorInfo.blurb,
          blurb,
          nSegments: segments.length,
          title: titles.slice(1).join(" \u2022 "),
          collection_id: trans?.collection,
          quote,
          suttaplex,
          sutta: sectSutta,
          stats,
        };
      } catch (e) {
        this.warn(`mldResult()`, {
          mld: {
            suid: mld.suid,
            author_uid: mld.author_uid,
          },
          e,
        });
        throw e;
      }
    }

    async search(...args) {
      const msg = 'sutta-store.search()';
      try {
        if (!this.isInitialized) {
          throw new Error(`initialize() is required`);
        }
        var opts = args[0];
        if (typeof opts === "string") {
          opts = {
            pattern: args[0],
            maxResults: args[1],
          };
        }
        // strip search options from pattern
        var findArgs = this.seeker.findArgs([{pattern:opts.pattern}]);
        let { 
          pattern,
          minLang,
          docLang,
          docAuthor,
          refLang,
          refAuthor,
          trilingual,
        } = findArgs;

        pattern = SuttaStore.sanitizePattern(pattern);
        var lang = opts.language || opts.lang || "en";
        var maxDoc = opts.maxResults ?? this.maxResults;
        var maxDoc = Number(maxDoc);
        if (isNaN(maxDoc)) {
          throw new Error("search() maxResults must be a number");
        }
        var bdres;

        let matchHighlight = '<span class="scv-matched">$&</span>';
        var maxGrepResults = Math.max(500, maxDoc * 3);
        var findOpts = {
          pattern,
          lang,
          maxDoc, // user max documents
          maxResults: maxGrepResults,
          showMatchesOnly: false,
          matchHighlight,
          minLang,
          docAuthor,
          docLang,
          refAuthor,
          refLang,
          trilingual,
        };
        try {
          bdres = await this.seeker.find(findOpts);
        } catch (e) {
          bdres = { error: e, mlDocs: [] };
        }
        bdres.results = [];
        for (var i = 0; i < bdres.mlDocs.length; i++) {
          var mld = bdres.mlDocs[i];
          var mldRes = await this.mldResult(mld, lang);
          bdres.results.push(mldRes);
        }
        return bdres;
      } catch (e) {
        this.warn(`search()`, JSON.stringify(args), e.message);
        throw e;
      }
    }

    async nikayaSuttaIds(nikaya, language = "en", author = "sujato") {
      return this.bilaraData.nikayaSuttaIds(nikaya, language, author);
    }
  }

  module.exports = exports.SuttaStore = SuttaStore;
})(typeof exports === "object" ? exports : (exports = {}));
