typeof describe === "function" &&
  describe("voice", function () {
    const should = require("should");
    const fs = require("fs");
    const path = require("path");
    const { logger, LogInstance } = require("log-instance");
    logger.logLevel = "warn";
    const { SayAgain } = require("say-again");
    const { DBG } = require('../src/defines.cjs');
    const Polly = require("../src/polly.cjs");
    const S3Creds = require("../src/s3-creds.cjs");
    const SCAudio = require("../src/sc-audio.cjs");
    const SoundStore = require("../src/sound-store.cjs");
    const Voice = require("../src/voice.cjs");
    const Words = require("../src/words.cjs");
    const BREAK = `<break time="0.001s"/>`;
    const ELLIPSIS_BREAK = `<break time="0.300s"/>`;
    const tmp = require("tmp");
    this.timeout(5 * 1000);

    function phoneme(ph, word) {
      var ph = `<phoneme alphabet="ipa" ph="${ph}">${word}</phoneme>${BREAK}`;
      return ph;
    }

    it("custom ctor", async () => {
      const msg = 'v3e.custom-ctor:';
      let soundStore = new SoundStore();
      let voiceVersion = 1;
      let raveena = Voice.createVoice({
        locale: "en-IN",
        soundStore,
        voiceVersion,
      });
      should(raveena.voiceVersion).equal(voiceVersion);
      should(raveena.usage).equal("review");
      should(raveena.soundStore).equal(soundStore);
    });
    it("loadVoices(voicePath) should return voices", () => {
      var voices = Voice.loadVoices();
      should(voices).instanceOf(Array);
      should(voices.length).greaterThan(0);
      should.deepEqual(
        voices.map((v) => v.name).sort(),
        [
          "Aditi",
          "Amy",
          "Bianca",
          "Brian",
          "Celine",
          "Enrique",
          "Giorgio",
          "Ines",
          "Lucia",
          "Hans",
          "Marlene",
          "Matthew",
          "Mathieu",
          "Maxim",
          "Mizuki",
          "Raveena",
          "Ricardo",
          "Takumi",
          "Tatyana",
          "Vicki",
          "sujato_en",
          "sujato_pli",
        ].sort()
      );
      let maxim = voices.filter(v=>v.name === 'Maxim')[0];
      should(maxim.voiceVersion).equal(1);

      var amy = voices.filter((voice) => voice.name === "Amy")[0];
      var raveena = voices.filter((voice) => voice.name === "Raveena")[0];
      should(raveena).instanceOf(Voice);
      should(raveena).properties({
        locale: "en-IN",
        langTrans: "en",
        localeIPA: "en-IN",
        name: "Raveena",
        service: "aws-polly",
        gender: "female",
        rates: {
          navigate: "+5%",
          recite: "-30%",
        },
        voiceVersion: 0,
      });
      should(!!raveena.ipa).equal(true);
      should(!!raveena.ipa.pli).equal(true);

      should(amy).instanceOf(Voice);
      should(amy).properties({
        locale: "en-GB",
        langTrans: "en",
        localeIPA: "pli",
        name: "Amy",
        service: "aws-polly",
        gender: "female",
        syllableVowels: undefined,
        syllabifyLength: undefined,
        rates: {
          navigate: "+5%",
          recite: "-30%",
        },
      });
      should(!!amy.ipa).equal(true);
      should(!!amy.ipa.pli).equal(true);
    });
    it("createVoice(opts) returns voice for a language", function () {
      // Default
      var voice = Voice.createVoice();
      should(voice).instanceOf(Voice);
      should(voice.locale).equal("en-IN");
      should(voice.name).equal("Raveena");
      should(voice.usage).equal("review");
      should(voice.scAudio).equal(undefined);
      should(voice.altTts).equal(undefined);

      // Custom
      var amy = Voice.createVoice("en-GB");
      should(amy).instanceOf(Voice);
      should(amy.locale).equal("en-GB");
      should(amy.name).equal("Amy");
      should(amy.usage).equal("recite");

      // Custom
      var scAudio = new SCAudio();
      var altTts = amy.services.recite;
      should(altTts).instanceOf(Polly);
      var matthew = Voice.createVoice({
        locale: "en-US",
        scAudio,
        altTts,
      });
      should(matthew).instanceOf(Voice);
      should(matthew.locale).equal("en-US");
      should(matthew.name).equal("Matthew");
      should(matthew.usage).equal("recite");
      should(matthew.scAudio).equal(scAudio);
      should(matthew.altTts).equal(altTts);

      // human
      var sujato_pli = Voice.createVoice({
        name: "sujato_pli",
      });
      should(sujato_pli.altTts.voice).equal("Aditi");
    });
    it("createVoice(voiceName) returns a default voice", function () {
      var voice = Voice.createVoice("aditi");
      should(voice).instanceOf(Voice);
      should(voice.locale).equal("hi-IN");
      should(voice.name).equal("Aditi");
      should(voice.usage).equal("recite");
      should(voice.localeIPA).equal("pli");
      should(voice.stripNumbers).equal(true);
      should(voice.stripQuotes).equal(true);
      should(voice.altTts).equal(undefined);

      var voice = Voice.createVoice("amy");
      should(voice).instanceOf(Voice);
      should(voice.locale).equal("en-GB");
      should(voice.name).equal("Amy");
      should(voice.usage).equal("recite");
      should(voice.localeIPA).equal("pli");
      should(voice.stripNumbers).equal(false);
      should(voice.stripQuotes).equal(false);

      var voice = Voice.createVoice("raveena");
      should(voice).instanceOf(Voice);
      should(voice.locale).equal("en-IN");
      should(voice.name).equal("Raveena");
      should(voice.usage).equal("review");
      should(voice.localeIPA).equal("en-IN");
      should(voice.stripNumbers).equal(false);
      should(voice.stripQuotes).equal(false);

      var voice = Voice.createVoice("Matthew");
      should(voice).instanceOf(Voice);
      should(voice.locale).equal("en-US");
      should(voice.name).equal("Matthew");
      should(voice.usage).equal("recite");
      should(voice.localeIPA).equal("pli");
      should(voice.stripNumbers).equal(false);
      should(voice.stripQuotes).equal(false);
    });
    it("createVoice(opts) => recite Voice instance", ()=>{
      var reciteVoice = Voice.createVoice({
        locale: "en",
        usage: "recite",
      });
      should(reciteVoice.name).equal("Amy");
      should(reciteVoice.services.navigate).instanceOf(Polly);
      should(reciteVoice.services.recite).instanceOf(Polly);
      should(reciteVoice.usage).equal("recite");
      should(reciteVoice.usages).properties(["navigate", "recite", "review"]);
      should(reciteVoice.usages.review).properties(["rate", "breaks"]);
      should.deepEqual(reciteVoice.services.navigate.prosody, {
        pitch: "-0%",
        rate: "+5%",
      });
      should.deepEqual(reciteVoice.services.recite.prosody, {
        pitch: "-0%",
        rate: "-30%",
      });

      var navVoice = Voice.createVoice({
        locale: "en",
        usage: "navigate",
      });
      should(navVoice.name).equal("Raveena");
      should(navVoice.services.navigate).instanceOf(Polly);
      should(navVoice.services.recite).instanceOf(Polly);
      should(navVoice.usage).equal("navigate");
      should.deepEqual(navVoice.services.navigate.prosody, {
        pitch: "-0%",
        rate: "+5%",
      });
    });
    it("TESRTTESTcreateVoice(opts) => review Voice instance", ()=>{
      var logger = new LogInstance();
      var reviewVoice = Voice.createVoice({
        locale: "en",
        usage: "review",
        logger,
      });
      should(reviewVoice.logger).equal(logger);
      should(reviewVoice).instanceOf(Voice);
      var polly = reviewVoice.services.review;
      should(polly).instanceOf(Polly);
      should(polly.logger).equal(reviewVoice);
      should(reviewVoice.name).equal("Raveena");
      should(reviewVoice.usage).equal("review");
      should(reviewVoice.usages).properties(["navigate", "recite", "review"]);
      should(reviewVoice.usages.review).properties(["rate", "breaks"]);
      should(reviewVoice.services.navigate).instanceOf(Polly);
      should(reviewVoice.services.recite).instanceOf(Polly);
      should(reviewVoice.services.review).instanceOf(Polly);
      should.deepEqual(reviewVoice.services.navigate.prosody, {
        pitch: "-0%",
        rate: "+5%",
      });
      should.deepEqual(reviewVoice.services.recite.prosody, {
        pitch: "-0%",
        rate: "-20%",
      });
      should.deepEqual(reviewVoice.services.review.prosody, {
        pitch: "-0%",
        rate: "-5%",
      });
      should.deepEqual(
        reviewVoice.services.navigate.breaks,
        [0.001, 0.1, 0.2, 0.3, 0.4]
      );
      should.deepEqual(
        reviewVoice.services.recite.breaks,
        [0.001, 0.1, 0.2, 0.6, 1]
      );
      should.deepEqual(
        reviewVoice.services.review.breaks,
        [0.001, 0.1, 0.2, 0.4, 0.5]
      );

      var navVoice = Voice.createVoice({
        name: "Raveena",
        usage: "navigate",
      });
    });
    it("speak(...) => sound file for array of text", async () => {
      var raveena = Voice.createVoice({ locale: "en-IN" });
      var text = ["Tomatoes are", "red.", "Tomatoes are red."];
      var cache = true;
      var opts = {
        cache,
        usage: "navigate",
        volume: "test",
        chapter: "voice",
      };
      var result = await raveena.speak(text, opts);

      should(result).properties([
        "file",
        "hits",
        "misses",
        "signature",
        "cached",
      ]);
      var storePath = raveena.soundStore.storePath;
      var files = result.signature.files.map((f) => path.join(storePath, f));
      should(files.length).equal(3);
      should(fs.statSync(files[0]).size).greaterThan(1000); // Tomatoes are
      should(fs.statSync(files[1]).size).greaterThan(1000); // red.
      should(fs.statSync(files[2]).size).greaterThan(1000); // Tomatoes are red.
      should(fs.statSync(result.file).size).greaterThan(5000);
    });
    it("placeholder words are expanded with voice ipa", ()=>{
      // TTS services such as AWS Polly tend to speak IPA phonemes
      // in a voice-dependent manner. For example, the lower greek
      // letter theta will be voiced differently by en-IN and en-GB voices.
      // Because of this, each voice has its own IPA lexicon ("ipa")
      // for pronunciation. Because the voice IPA lexicon represents
      // a dialect, it overrides the default locale IPA lexicon.
      //
      // This subtle change manifests via the wordSSML() function of
      // abstractTTS.
      var raveena = Voice.createVoice({
        locale: "en-IN",
        localeIPA: "pli",
      });
      var amy = Voice.createVoice({
        locale: "en-GB",
        localeIPA: "pli",
      });
      should(raveena.services.navigate.localeIPA).equal("pli");
      should(amy.services.navigate.localeIPA).equal("pli");

      should(raveena.services.recite.wordSSML(`Ubbhaṭaka`)).equal(
        `<break time="0.001s"/><phoneme alphabet="ipa" ph="ubbʰɐtɐka">` +
          `Ubbhaṭaka</phoneme><break time="0.001s"/>`
      );
      should(amy.services.recite.wordSSML(`Ubbhaṭaka`)).equal(
        `<break time="0.001s"/><phoneme alphabet="ipa" ph="ubbʰɐtɐka">` +
          `Ubbhaṭaka</phoneme><break time="0.001s"/>`
      );

      should(raveena.services.recite.wordSSML(`don't`)).equal(`don't`);
      should(amy.services.recite.wordSSML(`don't`)).equal(`don't`);
      should(
        raveena.services.recite.wordSSML(`don${Words.U_APOSTROPHE}t`)
      ).equal(`don${Words.U_APOSTROPHE}t`);
      should(amy.services.recite.wordSSML(`don${Words.U_APOSTROPHE}t`)).equal(
        `don${Words.U_APOSTROPHE}t`
      );

      should(raveena.services.recite.wordSSML(`ariyasaccan’ti`)).equal(
        `<phoneme alphabet="ipa" ph="ɐˈɺɪjɐsɐccɐn’θɪ">` +
          `ariyasaccan’ti</phoneme><break time="0.001s"/>`
      );
      should(amy.services.recite.wordSSML(`ariyasaccan’ti`)).equal(
        `<phoneme alphabet="ipa" ph="ɐɺɪjɐsɐccɐn’tɪ">` +
          `ariyasaccan’ti</phoneme><break time="0.001s"/>`
      );

      should(raveena.services.navigate.wordSSML("sati")).equal(
        `<phoneme alphabet="ipa" ph="s\u0250\u03b8\u026a">sati</phoneme>${BREAK}`
      );
      should(raveena.services.navigate.wordSSML("Saṅgha")).equal(
        `<phoneme alphabet="ipa" ph="s\u0250\u014bgʰa">Saṅgha</phoneme>${BREAK}`
      );

      should(amy.services.navigate.wordSSML("sati")).equal(
        `<phoneme alphabet="ipa" ph="s\u0250t\u026a">sati</phoneme>${BREAK}`
      );
      should(amy.services.navigate.wordSSML("Saṅgha")).equal(
        `<phoneme alphabet="ipa" ph="s\u0250\u014bgʰa">Saṅgha</phoneme>${BREAK}`
      );
    });
    it("placeholder words are expanded with voice ipa", ()=>{
      var raveena = Voice.createVoice("raveena");
      should(raveena).properties({
        name: "Raveena",
      });
      var tts = raveena.services.navigate;
      should(tts).properties({
        voice: "Raveena",
        language: "en-IN",
        localeIPA: "en-IN",
      });
      var segments = tts.segmentSSML("sati");
      should.deepEqual(segments, [phoneme(`s\u0250\u03b8\u026a`, `sati`)]);

      // Interpret unknown words as English
      var segments = tts.segmentSSML("Koalas and gummibears?");
      should.deepEqual(segments, ["Koalas and gummibears?"]);

      // Interpret unknown words as Pali
      tts.localeIPA = "pli";
      var segments = tts.segmentSSML("Taṃ kissa hetu?");
      should.deepEqual(segments, [
        `<phoneme alphabet="ipa" ph="\u03b8\u0250\u014b">Taṃ</phoneme>${BREAK} ` +
          `<phoneme alphabet="ipa" ph="k\u026assa">kissa</phoneme>${BREAK} ` +
          `<phoneme alphabet="ipa" ph="he\u03b8u">hetu</phoneme>${BREAK}?`,
      ]);
    });
    it("speak(text) trim German trailing en-dash", async()=>{
      var vicki = Voice.createVoice({
        name: "Vicki",
      });
      var text = "Von hier geht er zur Hölle –";
      var result = await vicki.speak(text, { usage: "recite" });
      should(result.signature.text).match(/>Von hier geht er zur Hölle</);
    });
    it("speak(text) speaks Pali", async()=>{
      var raveena = Voice.createVoice({
        name: "raveena",
        localeIPA: "pli",
      });
      var text = `Idha panudāyi, ekacco puggalo ‘upadhi dukkhassa mūlan’ti—`;
      var result = await raveena.speak(text, { usage: "recite" });
      should(result).properties([
        "file",
        "hits",
        "misses",
        "signature",
        "cached",
      ]);
      should(result.signature.text).match(/ph="ekɐcco"/);
      should(result.signature.text).match(/ph="dʊk.kʰɐssa"/);
    });
    it("speak(text) can handle lengthy Pali", async()=>{
      var aditi = Voice.createVoice({
        name: "aditi",
        usage: "recite",
        localeIPA: "pli",
        locale: "hi-IN",
        stripNumbers: true,
        stripQuotes: true,
      });
      should(aditi.maxSegment).equal(400);
      var text = `Cuddasa kho panimāni yonipamukhasatasahassāni saṭṭhi ca satāni cha ca satāni pañca ca kammuno satāni pañca ca kammāni, tīṇi ca kammāni, kamme ca aḍḍhakamme ca dvaṭṭhipaṭipadā, dvaṭṭhantarakappā, chaḷābhijātiyo, aṭṭha purisabhūmiyo, ekūnapaññāsa ājīvakasate, ekūnapaññāsa paribbājakasate, ekūnapaññāsa nāgavāsasate, vīse indriyasate, tiṃse nirayasate, chattiṃsarajodhātuyo, satta saññīgabbhā, satta asaññīgabbhā, satta nigaṇṭhigabbhā, satta devā, satta mānusā, satta pesācā, satta sarā, satta pavuṭā, satta papātā, satta ca papātasatāni, satta supinā, satta supinasatāni, cullāsīti mahākappino satasahassāni, yāni bāle ca paṇḍite ca sandhāvitvā saṃsaritvā dukkhassantaṃ karissanti."`;
      var result = await aditi.speak(text, { usage: "recite" });
      should(result.signature.api).equal("ffmegConcat");
      should(result.signature.files.length).equal(30);
    });
    it("Amy phonemes", ()=>{
      var amy = Voice.createVoice({
        locale: "en-GB",
        localeIPA: "pli",
      });
      should(amy.name).equal("Amy");
      var recite = amy.services.recite;
      should(recite.wordSSML("self-mortifiers")).equal("self-mortifiers");
      should(recite.wordSSML(`bow`)).equal(phoneme("baʊ", "bow"));
    });
    it("Raveena phonemes", ()=>{
      var raveena = Voice.createVoice({
        locale: "en-IN",
        localeIPA: "pli",
      });
      should(raveena.name).equal("Raveena");
      var recite = raveena.services.recite;
      should(recite.wordSSML(`bow`)).equal(phoneme("baʊ", "bow"));
      should(recite.wordSSML(`Nāmañca`)).equal(phoneme("nɑmaɲca", "Nāmañca"));
      should(recite.wordSSML(`anottappañca`)).match(/"ɐˈnoθθɐppɐɲca"/);
      should(recite.wordSSML(`Atthi`)).match(/"ɐˈθθhɪ"/);
      should(recite.wordSSML(`hoti`)).match(/"hoθɪ"/);
    });
    it("Aditi phonemes", ()=>{
      var aditi = Voice.createVoice({
        name: "aditi",
        localeIPA: "pli",
      });
      should(aditi.name).equal("Aditi");
      should(aditi.locale).equal("hi-IN");
      var recite = aditi.services.recite;
      should(recite.wordSSML(`vasala`)).equal(phoneme("v\\ə sə la", "vasala"));
      should(recite.wordSSML(`Nāmañca`)).equal(
        phoneme("nɑː məɳ cə", "Nāmañca")
      );
      should(recite.wordSSML(`anottappañca`)).match(/"ə not̪ t̪əp pəɳ cə"/);
      should(recite.wordSSML(`Atthi`)).match(/"ət̪.t̪ʰɪ"/);
      should(recite.wordSSML(`hoti`)).match(/"hot̪ɪ"/);
    });
    it("speak(text) can ignore numbers", async()=>{
      var raveena = Voice.createVoice({
        name: "raveena",
        stripNumbers: true,
        localeIPA: "pli",
      });
      var text = `Bhikkhu 123`;
      var result = await raveena.speak(text, { usage: "recite" });
      should(result.signature.api).equal("aws-polly");
      should(result.signature.text).not.match(/123/);

      var text = `Bhikkhu (123)`;
      var result = await raveena.speak(text, { usage: "recite" });
      should(result.signature.api).equal("aws-polly");
      should(result.signature.text).not.match(/\(.*\)/);
    });
    it("speak(text) can ignore quotes", async()=>{
      var raveena = Voice.createVoice({
        name: "raveena",
        stripQuotes: true,
        localeIPA: "pli",
      });
      var text = `“'‘Bhikkhu’'”`;
      var result = await raveena.speak(text, { usage: "recite" });
      should(result.signature.api).equal("aws-polly");
      should(result.signature.text).not.match(/[“'‘'”]/);
    });
    it("speakSegment(opts) trims segment", async()=>{
      var vicki = Voice.createVoice({
        name: "vicki",
      });
      var sutta_uid = "an3.29";
      var language = "de";
      var translator = "sujato";
      var usage = "recite";
      var segment = {
        scid: "an3.29:6.5",
        de: "Von hier geht er zur Hölle – ",
      };
      var resSpeak = await vicki.speakSegment({
        sutta_uid,
        segment,
        language,
        translator,
        usage,
      });
      var { api, text } = resSpeak.signature;
      should(api).equal("aws-polly");
      should(text).match(/>Von hier geht er zur Hölle</);
    });
    it("speakSegment(opts) speaks aws-polly", async()=>{
      var aditi = Voice.createVoice({
        name: "aditi",
      });
      var sutta_uid = "sn1.9";
      var language = "pli";
      var translator = "sujato";
      var usage = "recite";
      var segment = {
        scid: "sn1.9:1.1",
        pli: "purple squirrels",
      };
      var resSpeak = await aditi.speakSegment({
        sutta_uid,
        segment,
        language,
        translator,
        usage,
      });
      should(resSpeak.signature).properties({
        api: "aws-polly",
        guid: "23aba87c0acf41410b14e1de1658a7ae",
      });
    });
    it("speakSegment(opts) human-tts requires SCAudio", async()=>{
      var sutta_uid = "sn1.9999"; // not a sutta
      var language = "pli";
      var translator = "sujato";
      var usage = "recite";
      var segment = {
        scid: `${sutta_uid}:1.1`,
        pli: "purple squirrels",
      };
      var args = {
        sutta_uid,
        segment,
        language,
        translator,
        usage,
      };

      // scAudio is required
      var voice = Voice.createVoice({
        name: "sujato_pli",
      });
      var eCaught = null;
      var resSpeak = await voice
        .speakSegment(args)
        .catch((e) => (eCaught = e));
      should(eCaught).instanceOf(Error);
      should(eCaught.message).match(/scAudio is required/);
    });
    it("speakSegment(opts) human-tts uses altTts", async()=>{
      var sutta_uid = "sn1.9999"; // not a sutta
      var language = "pli";
      var translator = "sujato";
      var usage = "recite";
      var segment = {
        // fake segment
        scid: `${sutta_uid}:1.1`,
        pli: "purple squirrels",
      };
      var args = {
        sutta_uid,
        segment,
        language,
        translator,
        usage,
      };

      // sutta has no human audio
      var scAudio = new SCAudio();
      var voice = Voice.createVoice({
        name: "sujato_pli",
        scAudio,
      });
      voice.scAudio.logLevel = 'error';
      should(voice.altTts.voice).equal("Aditi");
      //voice.warn("EXPECTED WARNING BEGIN");
      var resSpeak = await voice.speakSegment(args);
      //voice.warn("EXPECTED WARNING END");
      voice.scAudio.logLevel = logger.logLevel;
      should(resSpeak).properties(["file", "signature"]);
      should(resSpeak.signature).properties({
        api: "aws-polly",
        voice: "Aditi",
        guid: "23aba87c0acf41410b14e1de1658a7ae",
      });
      should(resSpeak.file).match(/sn_pli_mahasangiti_aditi.*/);
      should(fs.existsSync(resSpeak.file)).equal(true);
    });
    it("speakSegment(opts) downloads human-tts", async()=>{
      var sutta_uid = "sn1.9";
      var storePath = tmp.tmpNameSync();
      var soundStore = new SoundStore({
        storePath,
      });
      var language = "pli";
      var translator = "sujato";
      var usage = "recite";
      var segment = {
        scid: `${sutta_uid}:1.1`,
        pli: "purple squirrels",
      };
      var args = {
        sutta_uid,
        segment,
        language,
        translator,
        usage,
      };
      var scAudio = new SCAudio();
      var voice = Voice.createVoice({
        name: "sujato_pli",
        scAudio,
        soundStore,
      });

      // Do not download if not present
      args.downloadAudio = false;
      var resSpeak = await voice.speakSegment(args);
      should(resSpeak).properties(["file", "signature"]);
      should(resSpeak.signature).properties({
        api: "aws-polly",
        voice: "Aditi",
      });
      should(resSpeak.file).match(new RegExp(resSpeak.signature.guid));
      should(fs.existsSync(resSpeak.file)).equal(true);

      // Force download audio
      args.downloadAudio = true;
      var resSpeak = await voice.speakSegment(args);
      should(resSpeak).properties(["file", "signature"]);
      should(resSpeak.signature).properties({
        api: "human-tts",
        reader: "sujato_pli",
      });
      should(resSpeak.file).match(new RegExp(resSpeak.signature.guid));
      should(fs.existsSync(resSpeak.file)).equal(true);

      // Audio has been downloaded, so return it
      delete args.downloadAudio; // default is download
      var resSpeak = await voice.speakSegment(args);
      should(resSpeak).properties(["file", "signature"]);
      should(resSpeak.signature).properties({
        api: "human-tts",
        reader: "sujato_pli",
      });
      should(resSpeak.file).match(new RegExp(resSpeak.signature.guid));
      should(fs.existsSync(resSpeak.file)).equal(true);
    });
    it("voiceOfName(name) returns voice of name", ()=>{
      should(Voice.voiceOfName("amy")).properties({ name: "Amy" });
      should(Voice.voiceOfName("Amy")).properties({ name: "Amy" });
      should(Voice.voiceOfName("0")).properties({ name: "Amy" });
      should(Voice.voiceOfName(0)).properties({ name: "Amy" });
      should(Voice.voiceOfName(1)).properties({ name: "Brian" });
      should(Voice.voiceOfName("Russell")).equal(null);
      should(Voice.voiceOfName("raveena")).properties({ name: "Raveena" });
      should(Voice.voiceOfName("vicki")).properties({ name: "Vicki" });
      should(Voice.voiceOfName("sujato_pli")).properties({
        name: "sujato_pli",
      });
    });
    it("synthesizeBreak() for HumanTts uses altTts", async()=>{
      var scAudio = new SCAudio();
      var voice = Voice.createVoice({
        name: "sujato_en",
        scAudio,
      });
      var altTts = voice.altTts;
      should(altTts.voice).equal("Amy");
      var tts = voice.services.recite;
      var result = await altTts.synthesizeBreak();
      should(result.signature.guid).match(
        /5a4ddf6b9c5cfd7e1ad8cf8a36e96c0f/
      );

      var result = await tts.synthesizeBreak();
      should(result.signature.guid).match(
        /5a4ddf6b9c5cfd7e1ad8cf8a36e96c0f/
      );
    });
    it("speak(text) => ellipsis in AN2.17:3.1 (pli)", async()=>{
      var deVoices = ["aditi"];
      deVoices.forEach((name) => {
        var v = Voice.createVoice({ name });
        var text = [
          `Abhikkantaṁ, bho gotama …pe… upāsakaṁ maṁ bhavaṁ`,
          `gotamo dhāretu ajjatagge pāṇupetaṁ saraṇaṁ gatan”ti`,
        ].join(" ");
        var tts = v.services.recite;
        should(tts.ellipsisBreak).equal(ELLIPSIS_BREAK);
        var segmented = tts.segmentSSML(tts.stripHtml(text));
        should(segmented[2]).equal(ELLIPSIS_BREAK);
        should(segmented[4]).equal(ELLIPSIS_BREAK);
        should(segmented.length).equal(7);
      });
    });
    it("speak(text) => ellipsis in AN2.17:3.1 (de)", async()=>{
      var deVoices = ["marlene", "vicki", "hans"];
      deVoices.forEach((name) => {
        //console.log(`test ellipsis ${name}`);
        var v = Voice.createVoice({ name });
        var text = [
          `„Vortrefflich, Meister Gotama! … Von diesem Tag an`,
          `soll Meister Gotama mich als Laienschüler kennen,`,
          `der für sein ganzes Leben Zuflucht gesucht hat.`,
        ].join(" ");
        var tts = v.services.recite;
        should(tts.ellipsisBreak).equal(ELLIPSIS_BREAK);
        var segmented = tts.segmentSSML(tts.stripHtml(text));
        should(segmented[1]).equal(ELLIPSIS_BREAK);
        should(segmented.length).equal(3);
      });
    });
    it("speak(text) => ellipsis in AN2.17:3.1 (en)", async()=>{
      var enVoices = ["amy", "raveena", "matthew", "brian"];
      enVoices.forEach((name) => {
        //console.log(`test ellipsis ${name}`);
        var v = Voice.createVoice({ name });
        var text = [
          `Excellent, Master Gotama! … From this day forth,`,
          `may Master Gotama remember me as a lay follower who`,
          `has gone for refuge for life.`,
        ].join(" ");
        var tts = v.services.recite;
        should(tts.ellipsisBreak).equal(ELLIPSIS_BREAK);
        var segmented = tts.segmentSSML(tts.stripHtml(text));
        should(segmented[1]).startWith(ELLIPSIS_BREAK);
        should(segmented.length).equal(3);
      });
    });
    it("speak(text) => ellipsis with period", async()=>{
      var v = Voice.createVoice({ name: "vicki" });
      var text = `akkosatipi, āpatti thullaccayassa …pe….`;
      var { segments } = await v.speak(text);
      should.deepEqual(segments, [
        "akkosatipi, āpatti thullaccayassa",
        '<break time="0.300s"/>',
        "pe",
        '<break time="0.300s"/>',
      ]);
    });
    it("supportedLanguages", ()=>{
      should.deepEqual(Voice.supportedLanguages, {
        "en": true,
        "fr": true,
        "it": true,
        "pt": true,
        "es": true,
        "de": true,
        "jpn": true, // Web:ja SC:jpn Polly:ja-JP
        "pli": true,
        "ru": true,
      });
    });
    it("createVoice() Tatyana", ()=>{
      const msg = 'tv3e.createVoice-tatyana:';
      const dbg = 0;
      let name = "Tatyana";
      let locale = 'ru-RU';
      let voice = Voice.createVoice({ name });
      should(voice).instanceOf(Voice);
      should(voice.locale).equal(locale);
      should(voice.name).equal(name);
      should(voice.usage).equal("recite");
      should(voice.voiceVersion).equal(1);
      let { recite } = voice.services;
      should(recite.language).equal('ru-RU');
      let sigRecite = recite.signature();
      should(sigRecite).properties({
        voiceVersion:1,
      });
    });
    it("createVoice() Maxim", ()=>{
      const msg = 'tv3e.createVoice-maxim:';
      const dbg = 0;
      let name = 'Maxim';
      let locale = 'ru-RU';
      let voice = Voice.createVoice({name});
      should(voice).instanceOf(Voice);
      should(voice.locale).equal(locale);
      should(voice.name).equal(name);
      should(voice.usage).equal("recite");
      should(voice.voiceVersion).equal(1);
      let { recite } = voice.services;
      should(recite.language).equal('ru-RU');
      let sigRecite = recite.signature();
      should(sigRecite).properties({
        voiceVersion:1,
      });
    });
    it("voiceOfName(name) RU", ()=>{
      let maxim = Voice.voiceOfName("Maxim");
      should(maxim).properties({
        name: "Maxim",
        locale: 'ru-RU',
        localeIPA: 'ru-RU',
        voiceVersion: 1,
      });
    });
  });
