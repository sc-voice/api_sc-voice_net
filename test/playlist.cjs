typeof describe === "function" &&
  describe("playlist", function () {
    const should = require("should");
    const fs = require("fs");
    const { logger } = require("log-instance");
    logger.logLevel = "error";
    const path = require("path");
    const { ScApi } = require("suttacentral-api");
    const Playlist = require('../src/playlist.cjs');
    const Sutta = require('../src/sutta.cjs');
    const SuttaFactory = require('../src/sutta-factory.cjs');
    const SuttaStore = require('../src/sutta-store.cjs');
    const Voice = require('../src/voice.cjs');
    const Task = require('../src/task.cjs');
    this.timeout(20 * 1000);

    var suttaFactory;
    async function testSuttaFactory() {
      if (!suttaFactory) {
        let suttaStore = await new SuttaStore().initialize();
        let scApi = await new ScApi().initialize();
        suttaFactory = await new SuttaFactory({
          suttaLoader: (opts) => suttaStore.loadBilaraSutta(opts),
          scApi,
        }).initialize();
      }
      return suttaFactory;
    }

    var suttas = [
      new Sutta({
        sutta_uid: "test1",
        author_uid: "test-author1",
        sections: [
          {
            segments: [
              {
                scid: "test1:1.1",
                pli: "test1:pli1.1",
                en: "test1:en1.1",
                de: "test1:de1.1",
              },
              {
                scid: "test1:1.2",
                pli: "test1:pli1.2",
                de: "test1:de1.2",
              },
            ],
          },
        ],
      }),
      new Sutta({
        sutta_uid: "test2",
        author_uid: "test-author2",
        sections: [
          {
            segments: [
              {
                scid: "test2:1.1",
                pli: "test2:pli1.1",
                en: "test2:en1.1",
                de: "test2:de1.2",
              },
              {
                scid: "test2:1.2",
                pli: "test2:pli1.2",
              },
            ],
          },
        ],
      }),
      new Sutta({
        sutta_uid: "test3",
        author_uid: "test-author3",
        sections: [
          {
            segments: [
              {
                scid: "test3:1.1",
                pli: "Taṃ kissa hetu?",
                en: "Why is that?",
              },
            ],
          },
          {
            segments: [
              {
                scid: "test3:2.1",
                pli: "abhikkantaṃ, bhante",
                en: "Excellent, sir!",
              },
              {
                scid: "test3:2.2",
                pli: "Nandī dukkhassa mūlan’ti",
                en: "Delight is the root of suffering",
              },
            ],
          },
        ],
      }),
    ];
    it("playlist() constructs a playlist", function () {
      var pl = new Playlist();
      should(pl).instanceOf(Playlist);
      should.deepEqual(pl.languages, ["pli", "en"]);
      should.deepEqual(pl.tracks, []);
      should(pl.maxSeconds).equal(0); // unlimited
    });
    it("playlist(opts) constructs custom playlist", function () {
      var pl = new Playlist({
        languages: ["de", "fr"],
      });
      should(pl).instanceOf(Playlist);
      should.deepEqual(pl.languages, ["de", "fr"]);
      should.deepEqual(pl.tracks, []);
      should(pl.maxSeconds).equal(0); // unlimited
    });
    it("addSutta(sutta) adds a sutta", function () {
      var pl = new Playlist();

      pl.addSutta(suttas[0]);
      should(pl.tracks.length).equal(1);
      should.deepEqual(
        pl.tracks.map((s) => s.sutta_uid),
        ["test1"]
      );
      should.deepEqual(pl.author_uids(), ["test-author1"]);

      pl.addSutta(suttas[1]);
      should(pl.tracks.length).equal(2);
      should.deepEqual(
        pl.tracks.map((s) => s.sutta_uid),
        ["test1", "test2"]
      );
      should.deepEqual(pl.author_uids(), ["test-author1", "test-author2"]);
    });
    it("stats() adds a sutta", function () {
      var pl = new Playlist({
        languages: ["de", "pli"],
      });

      should.deepEqual(pl.stats(), {
        tracks: 0,
        duration: 0,
        chars: {
          de: 0,
          pli: 0,
        },
        segments: {
          de: 0,
          pli: 0,
        },
      });

      pl.addSutta(suttas[0]);
      should.deepEqual(pl.stats(), {
        tracks: 1,
        chars: {
          de: 22,
          pli: 24,
        },
        duration: 5,
        segments: {
          de: 2,
          pli: 2,
        },
      });

      pl.addSutta(suttas[1]);
      should.deepEqual(pl.stats(), {
        tracks: 2,
        chars: {
          de: 33,
          pli: 48,
        },
        duration: 8,
        segments: {
          de: 3,
          pli: 4,
        },
      });
    });
    it("addSutta(sutta) adds dn33", async () => {
      var factory = await testSuttaFactory();
      var sutta = await factory.loadSutta("dn33");
      var pl = new Playlist();
      pl.addSutta(sutta);
      let plstats = pl.stats();
      should(plstats.tracks).equal(12);
      should(plstats.chars.pli).equal(78866);
      should(plstats.chars.en).above(84800).below(86000);
      should(plstats.segments.en).equal(1129);
      should(plstats.segments.pli).equal(1167);
      should(plstats.duration).above(14500).below(14600);
    });
    it("addTrack(sutta_uid, segmentsOrMessage) adds a track", async()=>{
      var pl = new Playlist();
      pl.addTrack("error123", "this is a test");
      should.deepEqual(pl.stats(), {
        tracks: 1,
        chars: {
          en: 14,
          pli: 0,
        },
        segments: {
          en: 1,
          pli: 0,
        },
        duration: 2,
      });
    });
    it("speak(opts) adds voice audio", async () => {
      var factory = await testSuttaFactory();
      var sutta = await factory.loadSutta("an1.31-40");
      var voices = {
        pli: Voice.createVoice({
          name: "aditi",
          usage: "recite",
          language: "hi-IN",
          localeIPA: "pli",
          stripNumbers: true,
          stripQuotes: true,
        }),
        en: Voice.createVoice({ name: "amy" }),
      };
      var pl = new Playlist({
        languages: ["pli", "en"], // speaking order
      });
      pl.addSutta(sutta);
      var result = await pl.speak({
        voices,
        volume: "test-playlist",
      });
      should(result.signature.guid)
        .match(/88edc5f59ba4cfc7d8864e44944c050e/);
    });
    it("speak(opts) adds break between suttas", async () => {
      var factory = await testSuttaFactory();
      var suttas = [
        await factory.loadSutta("thig2.6"),
        await factory.loadSutta("thig2.7"),
      ];
      var voices = {
        pli: Voice.createVoice({
          name: "aditi",
          usage: "recite",
          language: "hi-IN",
          localeIPA: "pli",
          stripNumbers: true,
          stripQuotes: true,
        }),
        en: Voice.createVoice({ name: "amy" }),
      };
      var pl = new Playlist({
        languages: ["en"], // speaking order
      });
      suttas.forEach((s) => pl.addSutta(s));
      var result = await pl.speak({
        voices,
        volume: "test-playlist",
      });
      should(result.signature.guid).match(/f497ee752fd1bb6fdbf578f1ec4f8da6/);
    });
    it("speak(opts) creates opus audio file", async () => {
      var factory = await testSuttaFactory();
      var sutta = await factory.loadSutta("sn2.3");
      var voiceTrans = Voice.createVoice({ name: "matthew" });
      var voices = { en: voiceTrans };
      var pl = new Playlist({
        languages: ["en"], // speaking order
      });
      pl.addSutta(sutta);
      var result = await pl.speak({
        voices,
        volume: "test-playlist",
      });
      should(result.signature.guid)
      .match(/043357f71f7bbc965f7c0fcac977eebe/);
    });
    it("speak(opts) => task progress", async () => {
      let factory = await testSuttaFactory();
      let pattern = 'thig1.1/en/soma';
      let sutta = await factory.loadSutta(pattern);
      let voiceTrans = Voice.createVoice({ name: "matthew" });
      let voices = { en: voiceTrans };
      let comment = `test ${pattern}`;
      let pl = new Playlist({
        languages: ["en"], // speaking order
      });
      pl.addSutta(sutta);
      let task = new Task({
        name: `test playlist ${pattern}`
      });
      task.start(`task ${pattern}`);
      let promise = pl.speak({
        voices,
        volume: "test-playlist",
        comment,
        task,
      });
      let nSegments = sutta.segments.length;
      should(task.actionsTotal).equal(nSegments+2);
      should(task.actionsDone).equal(0);

      let result = await promise;
      should(task.actionsDone).equal(task.actionsTotal);
      should(result.signature.guid).match(/9240cfb305646c1fd0d571b236fbc81a/);
    });
  })
