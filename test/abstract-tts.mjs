import { describe, it, expect, afterEach } from '@sc-voice/vitest';
import should from 'should';
import fs from 'fs';
import path from 'path';
import tmp from 'tmp';
import { exec } from 'child_process';
import util from 'util';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const execPromise = util.promisify(exec);
const AudioTrans = require('../src/audio-trans.cjs');
const AbstractTTS = require('../src/abstract-tts.cjs');
const SoundStore = require('../src/sound-store.cjs');
const Words = require('../src/words.cjs');

const BREAK = `<break time="0.001s"/>`;
const PARA_BREAK = `<break time="1.5s"/>`;
const ELLIPSIS = "…";
const ELLIPSIS_BREAK = ".";
const ephemeralAge = 500;       // for testing
const ephemeralInterval = 100;  // for testing
var storePath = tmp.tmpNameSync();
const CHECK_LEAKS = 1;
var winr;

describe("abstract-tts", () => {
  afterEach(()=>{
    if (winr) {
      winr();  // show unreleased resources
      winr = undefined;
    }
  });

  it("default ctor", () => {
    var tts = new AbstractTTS();

    // options
    expect(tts).toMatchObject({
      api: null,
      apiVersion: null,
      audioFormat: "audio/ogg",
      audioSuffix: ".ogg",
      breaks: [0.001, 0.1, 0.2, 0.6, 1],
      customWords: undefined,
      ellipsisBreak: ".",
      fullStopComma: undefined,
      language: "en",
      localeIPA: "en",
      maxConcurrentServiceCalls: 5,
      maxCuddle: 1,
      maxSegment: 1000,
      maxSSML: 5000,
      noAudioPath: undefined,
      prosody: {
        rate: "-10%",
      },
      stripChars: /[​]/g,
      stripNumbers: undefined,
      stripQuotes: undefined,
      syllabifyLength: undefined,
      syllableVowels: undefined,
      unknownLang: undefined,
      usage: "recite",
      usages: {},
    });
    should(tts.soundStore).instanceOf(SoundStore);
    should(tts.words).instanceOf(Words);
    should(tts.audioTrans).instanceOf(AudioTrans);
    expect(fs.existsSync(tts.audioTrans.coverPath)).toBe(true);
    expect(tts.audioTrans).toMatchObject({
      publisher: "voice.suttacentral.net",
      genre: "Dhamma",
      cwd: tts.soundStore.storePath,
      album: "voice.suttacentral.net",
      audioSuffix: tts.audioSuffix,
    });
  });
  it("custom ctor", function () {
    var words = new Words();
    var unknownLang = "de";
    var usage = "review";
    var maxSSML = 6000;
    var tts = new AbstractTTS({
      words,
      unknownLang,
      usage,
      maxSSML,
    });
    expect(tts.words).toBe(words);
    expect(tts).toMatchObject({
      language: "en",
      localeIPA: "en",
      unknownLang,
      usage,
      maxSSML,
    });
  });
  it("signature(text) signature", ()=>{
    const msg = 'ta9s.signature:';
    // return signature that identifies synthesized speech
    let tts = new AbstractTTS();
    let sig = tts.signature("hello world");
    var guid = tts.mj.hash(sig);
    expect(sig).toEqual({
      api: null,
      apiVersion: null,
      audioFormat: "audio/ogg",
      language: "en",
      prosody: {
        rate: "-10%",
      },
      text: "hello world",
      voice: null,
      guid,
    });

    let voice = 'voice-test';
    tts.voice = voice;
    let sig1 = tts.signature("hello world");
    expect(sig1).toEqual({
      api: null,
      apiVersion: null,
      audioFormat: "audio/ogg",
      language: "en",
      voice,
      prosody: {
        rate: "-10%",
      },
      text: "hello world",
      guid: tts.mj.hash(sig1),
    });

    let voiceVersion = 2;
    tts.voiceVersion = voiceVersion;
    let sig2 = tts.signature("hello world");
    expect(sig2).toEqual({
      api: null,
      apiVersion: null,
      audioFormat: "audio/ogg",
      language: "en",
      voice,
      voiceVersion,
      prosody: {
        rate: "-10%",
      },
      text: "hello world",
      guid: tts.mj.hash(sig2),
    });
  });
  it("wordInfo(word) returns information about a word", function () {
    var tts = new AbstractTTS({
      customWords: {
        godzilla: {
          language: "en",
        },
        deutsch: {
          language: "de",
        },
      },
    });
    var bhikkhu = {
      ipa: "bɪkuː",
      language: "pli",
    };
    var bhikkhus = {
      ipa: "bɪkuːz",
      language: "pli",
    };

    // should.js bug
    expect(tts.wordInfo("should")).toEqual({ language: "en" });

    // word in en.json
    expect(tts.wordInfo("identity")).toEqual({ language: "en" });

    // word in en.json with symbols having isWordTrim:true
    expect(tts.wordInfo(`identity'`)).toEqual({ language: "en" });
    expect(tts.wordInfo(`identity’`)).toEqual({ language: "en" });

    // punctuation
    expect(tts.wordInfo(`.`)).toEqual(null);

    // custom words
    expect(tts.wordInfo(`godzilla`)).toEqual({ language: "en" });
    expect(tts.wordInfo(`deutsch`)).toEqual({ language: "de" });

    // Pali word in common.js
    expect(tts.wordInfo(`akkha`)).toEqual({ language: "pli" });

    // no information
    expect(tts.wordInfo("asdf")).toEqual(null);

    // singular variations
    expect(tts.wordInfo("Bhikkhu")).toEqual(bhikkhu);
    expect(tts.wordInfo("Bikkhu")).toEqual(bhikkhu);
    expect(tts.wordInfo("Bhikku")).toEqual(bhikkhu);
    expect(tts.wordInfo("bhikkhu")).toEqual(bhikkhu);
    expect(tts.wordInfo("bikkhu")).toEqual(bhikkhu);
    expect(tts.wordInfo("bhikku")).toEqual(bhikkhu);

    // plural variations
    expect(tts.wordInfo("Bhikkhus")).toEqual(bhikkhus);
    expect(tts.wordInfo("Bikkhus")).toEqual(bhikkhus);
    expect(tts.wordInfo("Bhikkus")).toEqual(bhikkhus);
    expect(tts.wordInfo("bhikkhus")).toEqual(bhikkhus);
    expect(tts.wordInfo("bikkhus")).toEqual(bhikkhus);
    expect(tts.wordInfo("bhikkus")).toEqual(bhikkhus);
  });
  it("wordSSML(word) returns SSML text for word", function () {
    var tts = new AbstractTTS({
      localeIPA: "pli",
    });
    var ttsStrip = new AbstractTTS({
      localeIPA: "pli",
      stripNumbers: true,
    });

    // symbols

    // Ellipsis substitution happens during segmenting
    // because ellipses stand alone
    // expect(tts.wordSSML(ELLIPSIS)).toBe(ELLIPSIS_BREAK);

    // numbers
    expect(tts.wordSSML("281–309")).toBe("281–309");
    expect(ttsStrip.wordSSML("281–309")).toBe("281–309");

    // word ending quote
    expect(tts.wordSSML(`identity'`)).toBe(`identity'`);

    // words without information
    const testWord = `ariyasaccan’ti`;
    expect(tts.wordSSML(testWord)).toBe(
      `<phoneme alphabet="ipa" ph="ɐˈɺɪjɐsɐccɐn’tɪ">` +
        `${testWord}</phoneme><break time="0.001s"/>`
    );
    expect(tts.wordSSML("meditation")).toBe("meditation");

    // words with information
    expect(tts.wordSSML("bhikkhu")).toBe(
      `<phoneme alphabet="ipa" ph="bɪkuː">bhikkhu</phoneme>${BREAK}`
    );

    // words with voice dependent information
    // are expanded with default words.ipa
    expect(tts.wordInfo("sati")).toEqual({
      language: "pli",
    });
    expect(tts.wordSSML("sati")).toBe(
      `<phoneme alphabet="ipa" ph="sɐtɪ">sati</phoneme>${BREAK}`
    );

    // english word variant
    expect(tts.wordSSML("bowed")).toBe(
      `<phoneme alphabet="ipa" ph="baʊd">bowed</phoneme>${BREAK}`
    );

    // hyphenated word
    expect(tts.wordSSML("well-to-do")).toBe(`well-to-do`);

    // acronyms
    expect(tts.wordSSML("{mn1.2-en-test}")).toBe(
      `<say-as interpret-as="spell">mn1.2-en-test</say-as>`
    );
  });
  it("tokensSSML(text) returns array of SSML tokens", function () {
    var tts = new AbstractTTS({
      localeIPA: "pli",
    });
    var text = "Bhikkhus, the well-to-do Tathagata, was at Ukkaṭṭhā today.";
    var tokens = tts.tokensSSML(text);
    expect(tokens).toEqual([
      `<phoneme alphabet="ipa" ph="bɪkuːz">Bhikkhus</phoneme>${BREAK}`,
      ",",
      "the",
      "well-to-do",
      `<phoneme alphabet="ipa" ph="təˈtɑːɡətə">Tathagata</phoneme>${BREAK}`,
      ",",
      "was",
      "at",
      `${BREAK}<phoneme alphabet="ipa" ph="uk.kɐʈ̆ʈʰɑ">Ukkaṭṭhā</phoneme>${BREAK}`,
      "today",
      ".",
    ]);

    var tokens = tts.tokensSSML(
      [`Life is good.`, `Why is that?\n`, `They perceive fire as fire.`].join(
        "\n"
      )
    );
    expect(tokens).toEqual([
      "Life",
      "is",
      "good",
      ".",
      "\n",
      "Why",
      "is",
      "that",
      "?",
      "\n",
      tts.break(4),
      "\n",
      "They",
      "perceive",
      "fire",
      "as",
      "fire",
      ".",
    ]);

    // XML
    var tokens = tts.tokensSSML([`Life is good & happy.`].join("\n"));
    expect(tokens).toEqual(["Life", "is", "good", "&amp;", "happy", "."]);
  });
  it("isNumber(text) returns true if text is a number", function () {
    var tts = new AbstractTTS();

    expect(tts.isNumber(" ")).toBe(false);
    expect(tts.isNumber("\n")).toBe(false);
    expect(tts.isNumber("a")).toBe(false);
    expect(tts.isNumber("a1")).toBe(false);
    expect(tts.isNumber("1a")).toBe(false);
    expect(tts.isNumber("123.")).toBe(false);
    expect(tts.isNumber(".123")).toBe(false);
    expect(tts.isNumber("123\n")).toBe(false);
    expect(tts.isNumber("\n123")).toBe(false);
    expect(tts.isNumber("281–309")).toBe(true);
    expect(tts.isNumber("1,234")).toBe(true);

    expect(tts.isNumber("1")).toBe(true);
    expect(tts.isNumber("123")).toBe(true);
    expect(tts.isNumber("-123")).toBe(true);
    expect(tts.isNumber("+123")).toBe(true);
    expect(tts.isNumber("+123.45")).toBe(true);
    expect(tts.isNumber("123.45")).toBe(true);
    expect(tts.isNumber("-0.45")).toBe(true);
  });
  it("maxSegment controls segment length", function () {
    var tts = new AbstractTTS({
      maxSegment: 5,
      maxCuddle: 0,
    });

    // lots of tokens
    var ssml = tts.segment(["a", "b", "c", "d", "e", "f", "g"]);
    expect(ssml).toEqual(["a b c", "d e f", "g"]);

    // punctuation
    var ssml = tts.segment(["a", "b", ",", "c", ",", "d", "e", "f", "g"]);
    expect(ssml).toEqual(["a b,", "c, d", "e f g"]);
  });
  it("segment(tokens) returns array of segments", function () {
    var tts = new AbstractTTS();
    expect(isNaN("\n")).toBe(false); // surprising
    var ssml = tts.segment(["a", "b", "\n", "\n", "c", "\n", "d"]);
    expect(ssml).toEqual(["a b\n\n", "c\n", "d"]);
    var segments = tts.segment([
      "Why",
      "is",
      "that",
      "?",
      "\n",
      "\n",
      "They",
      "perceive",
      "fire",
      "as",
      "fire",
      ".",
    ]);
    expect(segments).toEqual([
      "Why is that?\n\n",
      "They perceive fire as fire.",
    ]);
    var segments = tts.segment([
      "a",
      "<b/>",
      ",",
      "(",
      "c",
      "d",
      ")",
      "e",
      ".",
      "f",
      "g",
      "?",
      "h",
      "i",
      "!",
      "j",
      "‘",
      "k",
      ",",
      "’",
      "l",
      "5",
      "m",
    ]);
    expect(segments).toEqual([
      "a <b/>, (c d) e.",
      "f g?",
      "h i!",
      "j ‘k,’ l 5 m",
    ]);
  });
  it("segmentSSML(text) returns array of SSML text segments", function () {
    var tts = new AbstractTTS();
    var ttsStrip = new AbstractTTS({
      localeIPA: "pli",
      stripNumbers: true,
    });

    // nothing
    var ssml = tts.segmentSSML("123");
    expect(ssml).toEqual(["123"]);
    var ssml = ttsStrip.segmentSSML("123");
    expect(ssml).toEqual([" "]);

    // a paragraph of sentences
    var ssml = tts.segmentSSML(
      [
        "Bhikkhus, he does not conceive water to be ‘mine,’ he does not delight in water.",
        "Why is that?",
        "Because delight is the root of suffering.",
      ].join(" ")
    );
    expect(ssml).toEqual([
      `<phoneme alphabet="ipa" ph="bɪkuːz">Bhikkhus</phoneme>${BREAK}` +
        ", he does not conceive water to be ‘mine,’ he does not delight in water.",
      "Why is that?",
      "Because delight is the root of suffering.",
    ]);

    // two paragraphs
    var text = "a1, a2 a3.\n" + "b1 b2?\n\n" + "c1 c2 c3.\n";
    var tokens = tts.tokensSSML(text);
    expect(tokens).toEqual([
      "a1",
      ",",
      "a2",
      "a3",
      ".",
      "\n",
      "b1",
      "b2",
      "?",
      "\n",
      tts.break(4),
      "\n",
      "c1",
      "c2",
      "c3",
      ".",
      "\n",
    ]);
    var ssml = tts.segment(tokens);
    expect(ssml).toEqual([
      `a1, a2 a3.\n`,
      "b1 b2?\n",
      `${tts.break(4)}\n`,
      `c1 c2 c3.\n`,
    ]);
  });
  it("break(index) returns SSML break", function () {
    var tts = new AbstractTTS();
    expect(tts.break(0)).toBe('<break time="0.001s"/>');
    expect(tts.break(1)).toBe('<break time="0.1s"/>');
  });
  it("sectionBreak() returns longest SSML break", function () {
    var tts = new AbstractTTS();
    expect(tts.sectionBreak()).toBe('<break time="1s"/>');
  });
  it("tokenize(text) returns array of tokens", function () {
    var tts = new AbstractTTS();
    expect(tts.tokenize("281–309")).toEqual(["281–309"]);
    expect(tts.tokenize("1,234")).toEqual(["1,234"]);
    expect(tts.tokenize(`he does'nt conceive`)).toEqual([
      "he",
      `does'nt`,
      "conceive",
    ]);
    expect(tts.tokenize("to be ‘mine,’.")).toEqual([
      "to",
      "be",
      "‘",
      "mine",
      ",",
      "’",
      ".",
    ]);
    expect(tts.tokenize("Why is that?")).toEqual([
      "Why",
      "is",
      "that",
      "?",
    ]);
  });
  it("concatAudio(files) returns Opus file", async () => {
    var soundStore = new SoundStore();
    var abstractTTS = new AbstractTTS({soundStore});
    var files = [
      path.join(__dirname, "data/1d4e09ef9cd91470da56c84c2da481b0.ogg"),
      path.join(__dirname, "data/0e4a11bcb634a4eb72d2004a74f39728.ogg"),
    ];
    expect(fs.existsSync(files[0])).toBe(true);
    expect(fs.existsSync(files[1])).toBe(true);
    var cache = false;
    var title = "test_title";
    var artist = "test_artist";
    var album_artist = "test_album_artist";
    var comment = "test_comment";
    var album = "test_album";
    var date = new Date().toLocaleDateString();
    var audioSuffix = ".ogg";
    var result = await abstractTTS.concatAudio(files, {
      cache,
      title,
      date,
      album_artist,
      album,
      artist,
      comment,
      audioSuffix,
    });
    let guid = path.basename(result.file).split(".")[0];
    let cmd = `ffprobe -hide_banner ${result.file}`;
    var { stdout, stderr } = await execPromise(cmd);
    stderr = stderr.split("\n").join("\n");
    expect(stderr).toMatch(/title\s*:\s*test_title/imsu);
    expect(stderr).toMatch(/\bartist\s*:\s*test_artist/imsu);
    expect(stderr).toMatch(/album\s*:\s*test_album/imsu);
    expect(stderr).toMatch(/album_artist\s*:\s*test_album_artist/imsu);
    expect(stderr).toMatch(/comment\s*:\s*Cover/imsu);
    expect(stderr).toMatch(new RegExp(`version\\s*:\\s*${guid}`, `msiu`));
    expect(stderr).toMatch(new RegExp(`date\\s*:\\s*${date}`, `msiu`));

    // Verify defaults
    expect(stderr).toMatch(/genre\s*:\s*Dhamma/imsu);

    expect(result).toHaveProperty('file');
    expect(result).toHaveProperty('cached');
    expect(result).toHaveProperty('hits');
    expect(result).toHaveProperty('misses');
    expect(result).toHaveProperty('signature');
    expect(fs.existsSync(result.file)).toBe(true); // output file guid
    expect(result.file)
      .toMatch(new RegExp(`.*${result.signature.guid}.ogg`)); // output guid

    await soundStore.clearEphemerals(); // cleanup
  });
  it("concatAudio(files) returns sound file", async ()=>{
    var soundStore = new SoundStore();
    var abstractTTS = new AbstractTTS({soundStore});
    var files = [
      path.join(__dirname, "data/1d4e09ef9cd91470da56c84c2da481b0.ogg"),
      path.join(__dirname, "data/0e4a11bcb634a4eb72d2004a74f39728.ogg"),
    ];
    expect(fs.existsSync(files[0])).toBe(true);
    expect(fs.existsSync(files[1])).toBe(true);
    var cache = true;
    var result = await abstractTTS.concatAudio(files, { cache });
    expect(result).toHaveProperty('file');
    expect(result).toHaveProperty('cached');
    expect(result).toHaveProperty('hits');
    expect(result).toHaveProperty('misses');
    expect(result).toHaveProperty('signature');
    expect(fs.existsSync(result.file)).toBe(true); // output file guid
    expect(result.file)
      .toMatch(new RegExp(`.*${result.signature.guid}.*`)); // output guid
    await soundStore.clearEphemerals(); // cleanup
  });
  it("concatAudio(files) returns sound file", async () => {
    var soundStore = new SoundStore({ storePath, });
    var abstractTTS = new AbstractTTS({ soundStore, });
    var volume = "test-concatAudio";
    var files = [
      soundStore.guidPath({
        volume,
        guid: "test1",
      }),
      soundStore.guidPath({
        volume,
        guid: "test2",
      }),
    ];
    var data1 = path.join(
      __dirname,
      "data/1d4e09ef9cd91470da56c84c2da481b0.ogg"
    );
    var data2 = path.join(
      __dirname,
      "data/0e4a11bcb634a4eb72d2004a74f39728.ogg"
    );
    fs.writeFileSync(files[0], fs.readFileSync(data1));
    fs.writeFileSync(files[1], fs.readFileSync(data2));
    //console.log('concatAudio TEST', storePath);
    expect(fs.existsSync(files[0])).toBe(true);
    expect(fs.existsSync(files[1])).toBe(true);
    var cache = true;
    var result = await abstractTTS.concatAudio(files, { cache });
    expect(result).toHaveProperty('file');
    expect(result).toHaveProperty('cached');
    expect(result).toHaveProperty('hits');
    expect(result).toHaveProperty('misses');
    expect(result).toHaveProperty('signature');
    expect(fs.existsSync(result.file)).toBe(true); // output file guid
    expect(result.file).toMatch(new RegExp(`.*${result.signature.guid}.*`)); // output guid
    expect(result.signature.guid).toMatch(/5a38166405fb1a9884220d0a2bd6d97a/);
    await soundStore.clearEphemerals(); // cleanup
    winr && winr();
  });
  it("syllabify(word) spaces word by syllable", function () {
    var tts = new AbstractTTS({
      syllableVowels: "aeiouāīū",
    });
    expect(tts.syllableVowels).toBe("aeiouāīū");

    expect(tts.syllabify("tatetitotutātītū")).toBe(
      "ta te ti to tu tā tī tū"
    );
    expect(tts.syllabify("a")).toBe("a");
    expect(tts.syllabify("at")).toBe("at");
    expect(tts.syllabify("ta")).toBe("ta");
    expect(tts.syllabify("ata")).toBe("a ta");
    expect(tts.syllabify("tat")).toBe("tat");
    expect(tts.syllabify("taat")).toBe("ta at");
    expect(tts.syllabify("tatta")).toBe("tat ta");
    expect(tts.syllabify("tattat")).toBe("tat tat");
    expect(tts.syllabify("tatat")).toBe("ta tat");
    expect(tts.syllabify("atatat")).toBe("a ta tat");
    expect(tts.syllabify("atatata")).toBe("a ta ta ta");
    expect(tts.syllabify("atattata")).toBe("a tat ta ta");
    expect(tts.syllabify("atattatta")).toBe("a tat tat ta");
    expect(tts.syllabify("acchariyaabbhutasutta")).toBe(
      "ac cha ri ya ab bhu ta sut ta"
    );
  });
  it("stripHtml(html) cleans html", function () {
    var tts = new AbstractTTS();
    expect(tts.stripHtml("faithless")).toBe("faithless");
    expect(tts.stripHtml("faithless ...")).toBe("faithless …");
  });
  it("tokensSSML(text) RU", () => {
    var tts = new AbstractTTS({
      localeIPA: "ru-RU",
      language: 'ru-RU',
    });
    var text = "так я слышал.";
    var tssml = tts.tokensSSML(text);
    expect(tssml).toEqual([ 'так', 'я', 'слышал', '.' ]);
  });
  it("wordSSML(word) RU", function () {
    let localeIPA = 'ru-RU';
    let locale = 'ru-RU';
    var tts = new AbstractTTS({ localeIPA, language:locale });
    expect(tts.wordSSML(`отстранённым'`)).toBe(`отстранённым'`);
  });
});
