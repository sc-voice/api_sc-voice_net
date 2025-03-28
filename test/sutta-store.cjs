typeof describe === "function" &&
  describe("sutta-store", function () {
    const should = require("should");
    const fs = require("fs");
    const path = require("path");
    const { logger, LogInstance } = require("log-instance");
    logger.logLevel = "warn";
    const { ScApi, SuttaCentralId } = require("suttacentral-api");
    const { BilaraData, Seeker } = require("scv-bilara");
    const Playlist = require('../src/playlist.cjs');
    const Sutta = require('../src/sutta.cjs');
    const SuttaFactory = require('../src/sutta-factory.cjs');
    const SuttaStore = require('../src/sutta-store.cjs');
    const Voice = require('../src/voice.cjs');
    const LANG = "en";
    const LOCAL = path.join(__dirname, "..", "local");
    const EBT_DATA = path.join(LOCAL, "ebt-data");
    const MAXRESULTS = 5;
    const RAVEENA = Voice.createVoice({
      name: "raveena",
      localeIPA: "pli",
      usage: "recite",
    });
    const STAGING = {
      apiUrl: "http://staging.suttacentral.net/api",
    };
    const PRODUCTION = {
      apiUrl: "http://suttacentral.net/api",
    };
    const TEST_LEGACY = true; // give up on 9/3/2020 if we can't get it to work
    function checkSuttas(data) {
      should(data.suttas.length).equal(data.suttaRefs.length);
      for (var i = 0; i < data.suttaRefs.length; i++) {
        var refParts = data.suttaRefs[i].split("/");
        var sutta = data.suttas[i];
        should(sutta).instanceOf(Sutta);
        should(sutta.sutta_uid).equal(refParts[0]);
        should(sutta.translation.lang).equal(refParts[1]);
        should(sutta.translation.author_uid).equal(refParts[2]);
      }
    }
    this.timeout(30 * 1000);

    it("default ctor", () => {
      var store = new SuttaStore();
      should(store.bilaraData).instanceOf(BilaraData);
      should(store.bilaraData.root).equal(EBT_DATA);
      should(store.seeker).instanceOf(Seeker);
      should(store.seeker.bilaraData).equal(store.bilaraData);
      should(store.bilaraData.logger).equal(store);
      should(store.autoSyncSeconds).equal(0);
    });
    it("custom ctor", async () => {
      var logger = new LogInstance();
      logger.logLevel = "warn";
      var autoSyncSeconds = 1;
      var store = new SuttaStore({ logger, autoSyncSeconds });
      should(store.logger).equal(logger);
      should(store.bilaraData.logger).equal(store);
      should(store.seeker.logger).equal(store);
    });
    it("initialize() initializes SuttaStore", async () => {
      const msg = 'test.sutta-store@63';
      var autoSyncSeconds = 1;
      var store = new SuttaStore({autoSyncSeconds});
      should(store.maxDuration).equal(3 * 60 * 60);
      should(store.isInitialized).equal(false);

      should(await store.initialize()).equal(store);
      should(store.scApi).instanceOf(ScApi);
      should(store.bilaraData.initialized).equal(true);
      should(store.seeker.initialized).equal(true);
      should(store.seeker.logger).equal(store);

      //store.logLevel = 'info';
      console.warn(msg, 'WARNING BEGIN: fails intermittently');
      should(store.autoSyncSeconds).equal(autoSyncSeconds);
      await new Promise(r=>setTimeout(()=>r(),autoSyncSeconds*1000));
      should(store.autoSyncCount).equal(1);
      store.autoSyncSeconds = 0; // Disable autoSync
      await new Promise(r=>setTimeout(()=>r(),autoSyncSeconds*1000));
      should(store.autoSyncCount).equal(2);
      await new Promise(r=>setTimeout(()=>r(),autoSyncSeconds*1000));
      should(store.autoSyncCount).equal(2);
      console.warn(msg, 'WARNING END: rerun test on failure');
    });
    it("search() thig1.1/pt -ra sujato -ml1", async () => {
      // no pt translation, but reference is available
      var voice = RAVEENA;
      let lang = 'pt';
      let suid = 'thig1.1';
      let pattern = `${suid}/${lang} -ra sujato -ml1`;
      var scApi = await new ScApi().initialize();
      var suttaFactory = new SuttaFactory({ scApi, autoSection: true, });
      var store = await new SuttaStore({ scApi, suttaFactory, voice, })
        .initialize();

      var { method, results } = await store.search(pattern);
      should(results).instanceOf(Array);
      should(method).equal("sutta_uid");
      should.deepEqual(
        results.map((r) => r.count),
        [0]
      );
      should.deepEqual(results.map((r) => r.uid), [suid]);
      should.deepEqual( results.map((r) => r.author_uid), ['sujato']);
      should.deepEqual(
        results.map((r) => r.suttaplex.acronym),
        ["Thig 1.1"]
      );
      should(results[0].quote.ref).match(/An Unnamed Nun/);
      should(results[0].nSegments).equal(9);
      var sutta = results[0].sutta;
      should(sutta.sutta_uid).equal(suid)
      should(sutta.author_uid).equal("sujato");
      should.deepEqual(sutta.segments[0], {
        scid: `${suid}:0.1`,
        ref: 'Verses of the Senior Nuns 1.1 ',
        pli: 'Therīgāthā 1.1 ',
        matched: true,
      });
    });
    it("search() cnd1/pt -ra sujato -ml1", async () => {
      // no pt or en translation
      var voice = RAVEENA;
      let lang = 'pt';
      let suid = 'cnd1';
      let pattern = `${suid}/${lang} -ra sujato -ml1`;
      var scApi = await new ScApi().initialize();
      var suttaFactory = new SuttaFactory({ scApi, autoSection: true, });
      var store = await new SuttaStore({ scApi, suttaFactory, voice, })
        .initialize();

      var { method, results } = await store.search(pattern);
      should(results).instanceOf(Array);
      should(method).equal("sutta_uid");
      should.deepEqual(
        results.map((r) => r.count),
        [0]
      );
      should.deepEqual(results.map((r) => r.uid), [suid]);
      should.deepEqual( results.map((r) => r.author_uid), ['ms']);
      should.deepEqual(
        results.map((r) => r.suttaplex.acronym),
        ["Cnd 1"]
      );
      should.deepEqual(results[0].quote, {
        matched: true,
        pli: '1. Vatthugāthā ',
        scid: `${suid}:0.3`,
      });
      should(results[0].nSegments).equal(235);
      var sutta = results[0].sutta;
      should(sutta.sutta_uid).equal(suid)
      should(sutta.author_uid).equal("ms");
      should.deepEqual(sutta.segments[0], {
        scid: `${suid}:0.1`,
        pli: 'Cūḷaniddesa ',
        matched: true,
      });
    });
    it("search() sn3.3/fr -dl en -da sujato", async () => {
      var voice = Voice.createVoice({
        name: "raveena",
        localeIPA: "pli",
        usage: "recite",
      });
      let lang = 'fr';
      let suid = 'sn3.3';
      let pattern = `${suid}/${lang} -dl en -da sujato`;
      var scApi = await new ScApi().initialize();
      var suttaFactory = new SuttaFactory({
        scApi,
        autoSection: true,
      });
      var store = await new SuttaStore({
        scApi,
        suttaFactory,
        voice,
      }).initialize();

      // multiple results
      var { method, results } = await store.search(pattern);
      should(results).instanceOf(Array);
      should(method).equal("sutta_uid");
      should.deepEqual(
        results.map((r) => r.count),
        [0]
      );
      should.deepEqual(results.map((r) => r.uid), [suid]);
      should.deepEqual( results.map((r) => r.author_uid), ['noeismet']);
      should.deepEqual(
        results.map((r) => r.suttaplex.acronym),
        ["SN 3.3"]
      );
      should(results[0].quote[lang]).match(/La Vieillesse et la Mort/);
      should(results[0].nSegments).equal(16);
      var sutta = results[0].sutta;
      should(sutta.sutta_uid).equal(suid)
      should(sutta.author_uid).equal("noeismet");
      should.deepEqual(sutta.segments[0], {
        scid: "sn3.3:0.1",
        fr: 'Discours Groupés 3 ',
        ref: 'Linked Discourses 3.3 ',
        pli: 'Saṁyutta Nikāya 3.3 ',
        matched: true,
      });
    });
    it("search('thig16.1') returns segmented sutta", async () => {
      var voice = Voice.createVoice({
        name: "raveena",
        localeIPA: "pli",
        usage: "recite",
      });
      var scApi = await new ScApi().initialize();
      var suttaFactory = new SuttaFactory({
        scApi,
        autoSection: true,
      });
      var store = await new SuttaStore({
        scApi,
        suttaFactory,
        voice,
      }).initialize();

      // multiple results
      var { method, results } = await store.search("thig16.1");
      should(results).instanceOf(Array);
      should(method).equal("sutta_uid");
      should.deepEqual(
        results.map((r) => r.count),
        [0]
      );
      should.deepEqual(
        results.map((r) => r.uid),
        ["thig16.1"]
      );
      should.deepEqual(
        results.map((r) => r.author_uid),
        ["sujato"]
      );
      should.deepEqual(
        results.map((r) => r.suttaplex.acronym),
        ["Thig 16.1"]
      );
      should(results[0].quote.en).match(/Sumedhā/);
      should(results[0].nSegments).equal(311);
      var sutta = results[0].sutta;
      should(sutta.sutta_uid).equal("thig16.1");
      should(sutta.author_uid).equal("sujato");
      should.deepEqual(sutta.segments[0], {
        matched: true,
        en: "Verses of the Senior Nuns 16.1 ",
        pli: "Therīgāthā 16.1 ",
        scid: "thig16.1:0.1",
      });
      var sections = sutta.sections;
      should.deepEqual(sections[0].segments[0], {
        en: "Verses of the Senior Nuns 16.1 ",
        matched: true,
        pli: "Therīgāthā 16.1 ",
        scid: "thig16.1:0.1",
      });
      should(sections.length).equal(2);
      should.deepEqual(
        sections.map((s) => s.segments.length),
        [3, 308]
      );
    });
    it("search('sona') finds 'Soṇa'", async () => {
      var voice = Voice.createVoice("raveena");
      var scApi = await new ScApi().initialize();
      var suttaFactory = new SuttaFactory({
        scApi,
        autoSection: true,
      });
      var store = await new SuttaStore({
        scApi,
        suttaFactory,
        voice,
        maxResults: 50,
      }).initialize();

      // multiple results
      var { method, results } = await store.search("sona");
      should(results).instanceOf(Array);
      should(method).equal("phrase");
      should(results.length).equal(25);
    });
    it("search('thig1.1') returns segmented sutta", async () => {
      var voice = Voice.createVoice({
        name: "raveena",
        localeIPA: "pli",
        usage: "recite",
      });
      var scApi = await new ScApi(PRODUCTION).initialize();
      var suttaFactory = new SuttaFactory({
        scApi,
        autoSection: true,
      });
      var store = await new SuttaStore({
        scApi,
        suttaFactory,
        voice,
      }).initialize();

      // multiple results
      var { method, results } = await store.search("thig1.1");
      should(results).instanceOf(Array);
      should(method).equal("sutta_uid");
      should.deepEqual(
        results.map((r) => r.count),
        [0]
      );
      should.deepEqual(
        results.map((r) => r.uid),
        ["thig1.1"]
      );
      should.deepEqual(
        results.map((r) => r.author_uid),
        ["sujato"]
      );
      should.deepEqual(
        results.map((r) => r.suttaplex.acronym),
        ["Thig 1.1"]
      );
      should(results[0].quote.en).match(/An Unnamed Nun \(1st\)/);
      should(results[0].nSegments).equal(9);
      var sutta = results[0].sutta;
      should(sutta.sutta_uid).equal("thig1.1");
      should(sutta.author_uid).equal("sujato");
      should.deepEqual(sutta.segments[0], {
        matched: true,
        en: "Verses of the Senior Nuns 1.1 ",
        pli: "Therīgāthā 1.1 ",
        scid: "thig1.1:0.1",
      });
      var sections = sutta.sections;
      should.deepEqual(sections[0].segments[0], {
        matched: true,
        en: "Verses of the Senior Nuns 1.1 ",
        pli: "Therīgāthā 1.1 ",
        scid: "thig1.1:0.1",
      });
      should.deepEqual(
        sections.map((s) => s.segments.length),
        [3, 6]
      );
    });
    it("search(pattern) => multiple results", async () => {
      var voice = Voice.createVoice({
        name: "raveena",
        localeIPA: "pli",
        usage: "recite",
      });
      var scApi = await new ScApi(PRODUCTION).initialize();
      var store = await new SuttaStore({
        scApi,
        voice,
      }).initialize();

      // multiple results
      var { method, results } = await store.search("is the root of suffering");
      should(results).instanceOf(Array);
      should.deepEqual(
        Object.keys(results[0]).sort(),
        [
          "author",
          "author_blurb",
          "author_short",
          "author_uid",
          "blurb",
          "collection_id",
          "count",
          "lang",
          "nSegments",
          "quote",
          "stats",
          "sutta",
          "suttaplex",
          "title",
          "uid",
        ].sort()
      );
      should(method).equal("phrase");
      should.deepEqual(
        results.map((r) => r.count),
        [5.091, 3.016, 2.006, 1.005]
      );
      should.deepEqual(
        results.map((r) => r.uid),
        ["sn42.11", "mn105", "mn1", "mn66"]
      );
      should.deepEqual(
        results.map((r) => r.author_uid),
        ["sujato", "sujato", "sujato", "sujato"]
      );
      should.deepEqual(
        results.map((r) => r.suttaplex.acronym),
        ["SN 42.11", "MN 105", "MN 1", "MN 66"]
      );
      should(results[0].quote.en).match(/is the root of suffering/);
      should(results[1].quote.en).match(/is the root of suffering/);
      should(results[2].quote.en).match(/is the root of suffering/);
      should(results[3].quote.en).match(/is the root of suffering/);
      var jsonPath = path.join(__dirname, 
        "./data/search-root-of-suffering.json");
      fs.writeFileSync(
        jsonPath,
        JSON.stringify(
          {
            method,
            results,
          },
          null,
          2
        )
      );
    });
    it("search() => thig1.1-3/en/soma maxResults", async () => {
      var scApi = await new ScApi(PRODUCTION).initialize();
      var store = await new SuttaStore({ scApi, }).initialize();

      var opts = {
        pattern: "thig1.1-3/en/soma",
        maxResults: 2,
      };
      var { method, results } = await store.search(opts);
      should(results).instanceOf(Array);
      should(method).equal("sutta_uid");
      should.deepEqual(results.map((r) => r.uid), [
        "thig1.1", "thig1.2", "thig1.3"]);
      should.deepEqual(results.map((r) => r.author_uid), [
        "soma", "soma", "soma"]);
    });
    it("search(pattern) => dn7/de", async () => {
      var voice = Voice.createVoice({
        name: "raveena",
        localeIPA: "pli",
        usage: "recite",
      });
      var scApi = await new ScApi(PRODUCTION).initialize();
      var store = await new SuttaStore({
        scApi,
        voice,
      }).initialize();

      var opts = {
        pattern: "dn7",
        language: "de",
        maxResuts: 3,
      };
      var { method, results } = await store.search(opts);
      should(results).instanceOf(Array);
      should(method).equal("sutta_uid");
      should.deepEqual(
        results.map((r) => r.uid),
        ["dn7"]
      );
      should(results[0].blurb).match(/Diese Lehrrede über die stufenweise/);
    });
    it("search(pattern) => regular expression results", async () => {
      var voice = Voice.createVoice({
        name: "raveena",
        localeIPA: "pli",
        usage: "recite",
      });
      var scApi = await new ScApi(PRODUCTION).initialize();
      var store = await new SuttaStore({
        scApi,
        voice,
      }).initialize();

      // regular expression
      var { method, results } = await store.search("is.*root .*suffering");
      should(results).instanceOf(Array);
      should(method).equal("phrase");
      should.deepEqual(
        results.map((r) => r.uid),
        ["sn42.11", "mn105", "mn1", "mn66"]
      );
    });
    it("search(pattern) => no results", async () => {
      var voice = Voice.createVoice({
        name: "raveena",
        localeIPA: "pli",
        usage: "recite",
      });
      var scApi = await new ScApi(PRODUCTION).initialize();
      var store = await new SuttaStore({
        scApi,
        voice,
      }).initialize();

      // no results
      var { method, results } = await store.search("not-in-suttas");
      should(results.length).equal(0);
    });
    it("sanitizePattern(pattern) prevents code injection attacks", ()=>{
      var testPattern = (pattern, expected) => {
        should(SuttaStore.sanitizePattern(pattern)).equal(expected);
      };
      testPattern('"doublequote"', ".doublequote.");
      testPattern("'singlequote'", ".singlequote.");
      testPattern("a$b", "a$b");
      testPattern("a.b", "a.b");
      testPattern("a.*b", "a.*b");
      testPattern("a\\'b", "a\\.b");
      testPattern("a\u0000b", "ab");
      testPattern("a\u0001b", "ab");
      testPattern("a\u007Fb", "ab");
      testPattern("sattānaṃ", "sattānaṃ");
      should.throws(() => SuttaStore.sanitizePattern("not [good"));
    });
    it("normalizePattern(pattern) prevents code injection attacks", function () {
      var testPattern = (pattern, expected) => {
        should(SuttaStore.normalizePattern(pattern)).equal(expected);
      };
      testPattern("root of suffering", "root +of +suffering");
      testPattern("a\nb\n\r\n\rc", "a +b +c");
      testPattern("a\tb\t\t\rc", "a +b +c");
      testPattern("a$b", "a$b");
      testPattern("a.b", "a.b");
      testPattern("a.*b", "a.*b");
      testPattern("a.+b", "a.+b");
      testPattern("sattānaṃ", "sattānaṃ");
    });
    it("search(pattern) is sanitized", function (done) {
      (async function () {
        try {
          var store = await new SuttaStore().initialize();
          var { method, results } = await store.search('"`echo doublequote`"');
          should(results.length).equal(0);
          var { method, results } = await store.search("'`echo singlequote`'");
          should(results.length).equal(0);
          var { method, results } = await store.search("${PATH}");
          should(results.length).equal(0);
          var { method, results } = await store.search(
            "is\tthe\rroot\nof\nsuffering"
          );
          should.deepEqual(
            results.map((r) => r.uid),
            ["sn42.11", "mn105", "mn1", "mn66"]
          );
          done();
        } catch (e) {
          done(e);
        }
      })();
    });
    it("search(pattern) handles long text", async()=>{
      let eCaught;
      try {
        var store = await new SuttaStore().initialize();
        store.logLevel = 'error';
        var longstring = new Array(100)
          .fill("abcdefghijklmnopqrstuvwxyz")
          .join(" ");
        await store.search(longstring);
      } catch (e) { eCaught = e; }
      should(eCaught.message).match(/text too long/);
    });
    it("search(pattern) handles invalid regexp", async()=>{
      let eCaught;
      try {
        var store = await new SuttaStore().initialize();
        store.logLevel = "error";
        await store.search("not[good");
      } catch (e) {eCaught = e}
      should(eCaught.message).match(/Invalid regular expression/);
    });
    it("search(pattern) returns voice guid", async()=>{
      var voice = Voice.createVoice({
        language: "en",
        localeIPA: "pli",
        usage: "recite",
      });
      var store = await new SuttaStore({
        voice,
      }).initialize();

      var { method, results } = await store.search("root of suffering");
      should(results).instanceOf(Array);
      should.deepEqual(
        results.map((r) => r.count),
        [5.091, 3.016, 2.006, 1.043, 1.01]
      );
    });
    it("search(pattern) sorts by numeric count", function (done) {
      (async function () {
        try {
          var store = await new SuttaStore().initialize();
          var { method, results } = await store.search("Sāriputta");
          // numerical sort has 174 greater than 90
          // standard sort has 90 greater than 174
          should.deepEqual(
            results.map((r) => r.count),
            [167.449, 82.752, 73.315, 69.185, 47.348]
          );
          done();
        } catch (e) {
          done(e);
        }
      })();
    });
    it("paliPattern(pattern) should return the Pali pattern", function () {
      should(SuttaStore.paliPattern("jhana")).equal("jh(a|ā)(n|ṅ|ñ|ṇ)(a|ā)");
      should(SuttaStore.paliPattern("abcdefghijklmn")).equal(
        "(a|ā)bc(d|ḍ)efgh(i|ī)jk(l|ḷ)(m|ṁ|ṃ)(n|ṅ|ñ|ṇ)"
      );
      should(SuttaStore.paliPattern("nopqrstuvwxyz")).equal(
        "(n|ṅ|ñ|ṇ)opqrs(t|ṭ)(u|ū)vwxyz"
      );
      should(SuttaStore.paliPattern("[abcdefghijklmnopqrstuvwxyz]")).equal(
        "[abcdefghijklmnopqrstuvwxyz]"
      );
    });
    it("search(pattern) finds romanized Pali keywords ", async () => {
      var store = await new SuttaStore().initialize();
      var res = await store.search("jhana");
      var { method, results, maxDoc, resultPattern } = res;
      should(method).equal("phrase");
      should.deepEqual(
        results.map((r) => ({
          uid: r.uid,
          count: r.count,
        })),
        [
          {
            count: 16.186,
            uid: "an9.36",
          },
          {
            count: 16.163,
            uid: "an6.60",
          },
          {
            count: 16.1,
            uid: "mn108",
          },
          {
            count: 15.013,
            uid: "dn33",
          },
          {
            count: 12.126,
            uid: "an9.35",
          },
        ]
      );
      should(resultPattern).equal("\\bjh(a|ā)(n|ṅ|ñ|ṇ)(a|ā)");
      should(results.length).equal(5);
    });
    it("search(pattern) finds exact Pali", function (done) {
      (async function () {
        try {
          var store = await new SuttaStore().initialize();
          var res = await store.search("abhisambuddhā");
          var { method, results, maxDoc, resultPattern } = res;
          should(method).equal("phrase");
          should(resultPattern).equal("abhisambuddhā");
          done();
        } catch (e) {
          done(e);
        }
      })();
    });
    it("isUidPattern(pattern) is true for sutta_uid patterns", function () {
      // unsupported sutta
      should(SuttaStore.isUidPattern("t1670b2.8")).equal(true);

      // fully specified sutta
      should(SuttaStore.isUidPattern("mn1/en/sujato")).equal(true);
      should(SuttaStore.isUidPattern("mn1/en/sujato,mn1/en/bodhi")).equal(true);
      should(
        SuttaStore.isUidPattern("dn7/de/kusalagnana-maitrimurti-traetow")
      ).equal(true);

      // valid collection with a number
      should(SuttaStore.isUidPattern("mn2000")).equal(true);
      should(SuttaStore.isUidPattern("an1")).equal(true);
      should(SuttaStore.isUidPattern("sn22.1")).equal(true);
      should(SuttaStore.isUidPattern("sn22.1-20")).equal(true);
      should(SuttaStore.isUidPattern("mn8-11")).equal(true);
      should(SuttaStore.isUidPattern("mn8-11,mn9-12")).equal(true);

      // unknown but valid sutta
      should(SuttaStore.isUidPattern("a1")).equal(true);
      should(SuttaStore.isUidPattern("mn01")).equal(true);

      // not a sutta_uid pattern
      should(SuttaStore.isUidPattern("red")).equal(false);
      should(SuttaStore.isUidPattern("thig")).equal(false);
      should(SuttaStore.isUidPattern("mn")).equal(false);

      // lists
      should(SuttaStore.isUidPattern("mn1, mn2")).equal(true);
      should(SuttaStore.isUidPattern("sn22-25")).equal(true);
      should(SuttaStore.isUidPattern("sn22.1-20,mn1")).equal(true);
      should(SuttaStore.isUidPattern("sn22.1-20   ,   mn1")).equal(true);
      should(SuttaStore.isUidPattern("sn22.1-20,red")).equal(false);
      should(SuttaStore.isUidPattern("red,sn22.1-20,mn1")).equal(false);
      should(SuttaStore.isUidPattern("sn22.1-20    ,   red")).equal(false);
      should(SuttaStore.isUidPattern("red,sn22.1-20")).equal(false);
    });
    it("search(pattern) finds mn1/en/sujato", function (done) {
      (async function () {
        try {
          var store = await new SuttaStore().initialize();

          // fully specified
          var data = await store.search({ pattern: "mn1/en/sujato" });
          var results = data.results;
          should.deepEqual(
            data.results.map((r) => r.uid),
            ["mn1"]
          );
          should.deepEqual(
            data.results.map((r) => r.lang),
            ["en"]
          );
          should.deepEqual(
            data.results.map((r) => r.author_uid),
            ["sujato"]
          );
          should(data.results.length).equal(1);
          var sutta = data.results[0].sutta;
          should(sutta.segments.length).above(333).below(841);

          done();
        } catch (e) {
          done(e);
        }
      })();
    });
    it("search(pattern) finds suttas in range", async () => {
      var store = await new SuttaStore().initialize();

      // spaces
      var data = await store.search({ pattern: "sn 45.161" });
      should.deepEqual(
        data.results.map((r) => r.uid),
        ["sn45.161"]
      );

      var data = await store.search({ pattern: "sn29.9-999" });
      should.deepEqual(
        data.results.map((r) => r.uid),
        ["sn29.9", "sn29.10", "sn29.11-20", "sn29.21-50"]
      );
      should(data.results.length).equal(4);
      should(data.method).equal("sutta_uid");

      // maxResults
      var data = await store.search({ pattern: "sn29.1-5" });
      should.deepEqual(
        data.results.map((r) => r.uid),
        ["sn29.1", "sn29.2", "sn29.3", "sn29.4", "sn29.5"]
      );
      should(data.results.length).equal(MAXRESULTS);
      should(data.method).equal("sutta_uid");
      var result0 = data.results[0];
      should(result0.author).match(/Sujato/);
      should(result0.author_short).equal("Sujato");
      should(result0.author_uid).equal("sujato");
      should(result0.lang).equal("en");
      should(result0.nSegments).equal(9);
      should(result0.title).match(/Plain Version/);
      should(result0.collection_id).equal("sn");
      should(result0.suttaplex.acronym).equal("SN 29.1");
      should(result0.suttaplex.uid).equal("sn29.1");
      should(result0.suttaplex.original_title).equal("Suddhikasutta");
      should(result0.suttaplex.root_lang).equal("pli");
    });
    it("createPlaylist(opts) => Soma playlist", async()=>{
      var store = await new SuttaStore().initialize();
      var playlist = await store.createPlaylist({
        pattern: "thig1.1/en/soma, thig1.2/en/soma",
      });
      should(playlist.tracks.length).equal(4);
      should.deepEqual(
        playlist.tracks.map((track) => track.segments[0].scid),
        ["thig1.1:0.1", "thig1.1:1.0", "thig1.2:0.1", "thig1.2:1.1"]
      );
      let stats = playlist.stats();
      should(stats).properties({
        tracks: 4,
        segments: {
          pli: 17,
          en: 17,
        },
      });
      let thigSeg1 = playlist.tracks[1].segments[1];
      should(thigSeg1.scid).match(/thig1.1:1.1/);
      should(thigSeg1.en).match(/sleep with ease, elder/i);
      should(thigSeg1.pli).match(/Sukhaṁ supāhi therike/i);
      let thigSeg3 = playlist.tracks[3].segments[0];
      should(thigSeg3.scid).match(/thig1.2:1.1/);
      should(thigSeg3.en).match(/free yourself from/i);
      should(thigSeg3.pli).match(/Mutte muccassu yogehi/i);
    });
    it("createPlaylist(opts) creates playlist", async()=>{
      var store = await new SuttaStore().initialize();
      var playlist = await store.createPlaylist({
        pattern: "an3.76-77",
      });
      should(playlist.tracks.length).equal(4);
      should.deepEqual(
        playlist.tracks.map((track) => track.segments[0].scid),
        ["an3.76:0.1", "an3.76:1.1", "an3.77:0.1", "an3.77:1.1"]
      );
      should.deepEqual(playlist.stats(), {
        tracks: 4,
        chars: {
          en: 3122,
          pli: 2408,
        },
        duration: 490,
        segments: {
          pli: 40,
          en: 38,
        },
      });

      // Pali only
      var playlist = await store.createPlaylist({
        pattern: "an3.76-77",
        languages: ["pli"],
      });
      should(playlist.tracks.length).equal(4);
      should.deepEqual(
        playlist.tracks.map((track) => track.segments[0].scid),
        ["an3.76:0.1", "an3.76:1.1", "an3.77:0.1", "an3.77:1.1"]
      );
      should.deepEqual(playlist.stats(), {
        tracks: 4,
        chars: {
          pli: 2408,
        },
        duration: 220,
        segments: {
          pli: 40,
        },
      });
    });
    it("maxDuration limits createPlaylist()", function (done) {
      (async function () {
        try {
          var store = await new SuttaStore({
            maxDuration: 450,
          }).initialize();
          var eCaught;
          var playlist = await store.createPlaylist({
            pattern: "an3.76-77",
          });
          should.deepEqual(playlist.stats(), {
            tracks: 1,
            chars: {
              en: 83,
            },
            duration: 8,
            segments: {
              en: 1, // error message
            },
          });
          should.deepEqual(playlist.tracks[0], {
            lang: "en",
            sutta_uid: "createPlaylist_error1",
            segments: [
              {
                en:
                  "Play list is too long to be played. All play lists " +
                  "must be less than 8 minutes long",
                scid: "createPlaylist_error1:0.1",
              },
            ],
          });

          // Pali only
          var playlist = await store.createPlaylist({
            pattern: "an3.76-77",
            languages: ["pli"],
          });
          should.deepEqual(playlist.stats(), {
            tracks: 4,
            chars: {
              pli: 2408,
            },
            duration: 220,
            segments: {
              pli: 40,
            },
          });

          done();
        } catch (e) {
          done(e);
        }
      })();
    });
    it("an4.6 has no HTML", function (done) {
      (async function () {
        try {
          var store = await new SuttaStore({
            maxDuration: 450,
          }).initialize();
          var { method, results } = await store.search("an4.6");
          var sutta = results[0].sutta;
          should(sutta.sutta_uid).equal("an4.6");
          var en5 = sutta.segments[5].en;
          should(en5).not.match(/<ol>/);
          should(en5).not.match(/<li>/);

          done();
        } catch (e) {
          done(e);
        }
      })();
    });
    it("nikayaSuttaIds(...) returns sutta_uids", async () => {
      var store = await new SuttaStore({
        maxDuration: 450,
      }).initialize();
      var language = "en";
      const KNSTART = [
        'cp1', 'cp2', 'cp3',
        //'iti1', 'iti2', 'iti3',
        //"dhp1-20", "dhp21-32", "dhp33-43",
        //'kp1', 'kp2', 'kp3',
        //'thag1.1', 'thag1.2', 'thag1.3',
      ];
      const KNEND = [
        "ud8.8",
        "ud8.9",
        "ud8.10",
        //'thig14.1', 'thig15.1', 'thig16.1',
      ];

      // nikaya, language, author/translator
      var ids = await store.nikayaSuttaIds("kn", "en", "sujato");
      should(ids).instanceOf(Array);
      should.deepEqual(ids.slice(0, 3), KNSTART);
      should.deepEqual(ids.slice(ids.length - 3, ids.length), KNEND);

      // nikaya
      var ids = await store.nikayaSuttaIds("kn");
      should(ids).instanceOf(Array);
      should(ids.length).equal(672);
      should.deepEqual(ids.slice(0, 3), KNSTART);
      should.deepEqual(ids.slice(ids.length - 3, ids.length), KNEND);

      // nikaya an
      var ids = await store.nikayaSuttaIds("an");
      should(ids).instanceOf(Array);
      should(ids.length).equal(1408);

      // nikaya sn
      var ids = await store.nikayaSuttaIds("sn");
      should(ids).instanceOf(Array);
      should(ids.length).equal(1819);

      // nikaya dn
      var ids = await store.nikayaSuttaIds("dn");
      should(ids).instanceOf(Array);
      should(ids.length).equal(34);

      // nikaya mn
      var ids = await store.nikayaSuttaIds("mn");
      should(ids).instanceOf(Array);
      should(ids.length).equal(152);

      // Bad input
      var ids = await store.nikayaSuttaIds("nonikaya", "yiddish", "nobody");
      should.deepEqual(ids, []);

      // LEGACY TEST: Pali is in English folder
      //var ids = await store.nikayaSuttaIds('kn', 'pli', 'sujato');
      //should(ids).instanceOf(Array);
      //should.deepEqual(ids.slice(0,3), KNSTART);
      //should.deepEqual(ids.slice(ids.length-3,ids.length), KNEND);
    });
    it("search('sn12.3') returns Deutsch", async () => {
      var voice = Voice.createVoice("Amy");
      var scApi = await new ScApi().initialize();
      var suttaFactory = new SuttaFactory({
        scApi,
        autoSection: true,
      });
      var store = await new SuttaStore({
        scApi,
        suttaFactory,
        voice,
      }).initialize();

      // multiple results
      var pattern = "sn12.3";
      var language = "de";
      var maxResults = 5;
      var res = await store.search({
        pattern,
        language,
        maxResults,
      });
      var { method, results } = res;

      should(results).instanceOf(Array);
      should(method).equal("sutta_uid");
      should.deepEqual(
        results.map((r) => r.count),
        [0]
      );
      should.deepEqual(
        results.map((r) => r.uid),
        ["sn12.3"]
      );
      var sutta = results[0].sutta;
      should(sutta.sutta_uid).equal("sn12.3");
      if (sutta.author_uid === "sabbamitta") {
        should.deepEqual(
          results.map((r) => r.author_uid),
          ["sabbamitta"]
        );
        should.deepEqual(
          results.map((r) => r.suttaplex.acronym),
          ["SN 12.3"]
        );
        should(results[0].quote.de).match(/Übung /);
        should(sutta.author_uid).equal("sabbamitta");
        should.deepEqual(sutta.segments[0], {
          matched: true,
          de: "Verbundene Lehrreden 12.3 ",
          en: "Linked Discourses 12.3 ",
          pli: "Saṁyutta Nikāya 12.3 ",
          scid: "sn12.3:0.1",
        });
        should(results[0].nSegments).equal(19);
        var sections = sutta.sections;
        should.deepEqual(sections[0].segments[0], {
          matched: true,
          de: "Verbundene Lehrreden 12.3 ",
          en: "Linked Discourses 12.3 ",
          pli: "Saṁyutta Nikāya 12.3 ",
          scid: "sn12.3:0.1",
        });
        should(sections.length).equal(2);
        should.deepEqual(
          sections.map((s) => s.segments.length),
          [3, 16]
        );
      } else {
        // legacy
        should(sutta.author_uid).equal("geiger");
        should(results[0].nSegments).equal(9);
      }
    });
    it("loadSutta(...) returns scv-bilara sutta", async () => {
      var voice = Voice.createVoice("Amy");
      var scApi = await new ScApi().initialize();
      var suttaFactory = new SuttaFactory({
        scApi,
        autoSection: true,
      });
      var store = await new SuttaStore({
        scApi,
        suttaFactory,
        voice,
      }).initialize();
      var sutta = await store.loadSutta({
        scid: "an1.2/de/sabbamitta",
      });
      should(sutta).properties({
        author: "Sabbamitta",
        sutta_uid: "an1.1-10",
        lang: "de",
      });
    });
  });
