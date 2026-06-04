import { describe, it, expect } from '@sc-voice/vitest';
import should from 'should';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import { logger, LogInstance } from 'log-instance';
import { SayAgain } from 'say-again';
import tmp from 'tmp';

logger.logLevel = 'warn';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { DBG } = require('../src/defines.cjs');
const Polly = require('../src/polly.cjs');
const S3Creds = require('../src/s3-creds.cjs');
const SCAudio = require('../src/sc-audio.cjs');
const SoundStore = require('../src/sound-store.cjs');
const Voice = require('../src/voice.cjs');
const Words = require('../src/words.cjs');

const BREAK = `<break time="0.001s"/>`;
const ELLIPSIS_BREAK = `<break time="0.300s"/>`;

function phoneme(ph, word) {
  return `<phoneme alphabet="ipa" ph="${ph}">${word}</phoneme>${BREAK}`;
}

describe('voice', () => {
  it('custom ctor', async () => {
    const msg = 'v3e.custom-ctor:';
    let soundStore = new SoundStore();
    let voiceVersion = 1;
    let raveena = Voice.createVoice({
      locale: 'en-IN',
      soundStore,
      voiceVersion,
    });
    should(raveena.voiceVersion).equal(voiceVersion);
    should(raveena.usage).equal('review');
    should(raveena.soundStore).equal(soundStore);
  });

  it('loadVoices(voicePath) should return voices', () => {
    const voices = Voice.loadVoices();
    should(voices).instanceOf(Array);
    should(voices.length).greaterThan(0);
    should.deepEqual(
      voices.map((v) => v.name).sort(),
      [
        'Aditi',
        'Amy',
        'Bianca',
        'Brian',
        'Celine',
        'Enrique',
        'Giorgio',
        'Ines',
        'Lucia',
        'Hans',
        'Marlene',
        'Matthew',
        'Mathieu',
        'Maxim',
        'Mizuki',
        'Raveena',
        'Ricardo',
        'Takumi',
        'Tatyana',
        'Vicki',
        'sujato_en',
        'sujato_pli',
      ].sort()
    );
    let maxim = voices.filter(v => v.name === 'Maxim')[0];
    should(maxim.voiceVersion).equal(1);

    const amy = voices.filter((voice) => voice.name === 'Amy')[0];
    const raveena = voices.filter((voice) => voice.name === 'Raveena')[0];
    should(raveena).instanceOf(Voice);
    should(raveena).properties({
      locale: 'en-IN',
      langTrans: 'en',
      localeIPA: 'en-IN',
      name: 'Raveena',
      service: 'aws-polly',
      gender: 'female',
      rates: {
        navigate: '+5%',
        recite: '-30%',
      },
      voiceVersion: 0,
    });
    should(!!raveena.ipa).equal(true);
    should(!!raveena.ipa.pli).equal(true);

    should(amy).instanceOf(Voice);
    should(amy).properties({
      locale: 'en-GB',
      langTrans: 'en',
      localeIPA: 'pli',
      name: 'Amy',
      service: 'aws-polly',
      gender: 'female',
      syllableVowels: undefined,
      syllabifyLength: undefined,
      rates: {
        navigate: '+5%',
        recite: '-30%',
      },
    });
    should(!!amy.ipa).equal(true);
    should(!!amy.ipa.pli).equal(true);
  });

  it('createVoice(opts) returns voice for a language', () => {
    let voice = Voice.createVoice();
    should(voice).instanceOf(Voice);
    should(voice.locale).equal('en-IN');
    should(voice.name).equal('Raveena');
    should(voice.usage).equal('review');
    should(voice.scAudio).equal(undefined);
    should(voice.altTts).equal(undefined);

    const amy = Voice.createVoice('en-GB');
    should(amy).instanceOf(Voice);
    should(amy.locale).equal('en-GB');
    should(amy.name).equal('Amy');
    should(amy.usage).equal('recite');

    const scAudio = new SCAudio();
    const altTts = amy.services.recite;
    should(altTts).instanceOf(Polly);
    const matthew = Voice.createVoice({
      locale: 'en-US',
      scAudio,
      altTts,
    });
    should(matthew).instanceOf(Voice);
    should(matthew.locale).equal('en-US');
    should(matthew.name).equal('Matthew');
    should(matthew.usage).equal('recite');
    should(matthew.scAudio).equal(scAudio);
    should(matthew.altTts).equal(altTts);

    const sujato_pli = Voice.createVoice({
      name: 'sujato_pli',
    });
    should(sujato_pli.altTts.voice).equal('Aditi');
  });

  it('createVoice(voiceName) returns a default voice', () => {
    let voice = Voice.createVoice('aditi');
    should(voice).instanceOf(Voice);
    should(voice.locale).equal('hi-IN');
    should(voice.name).equal('Aditi');
    should(voice.usage).equal('recite');
    should(voice.localeIPA).equal('pli');
    should(voice.stripNumbers).equal(true);
    should(voice.stripQuotes).equal(true);
    should(voice.altTts).equal(undefined);

    voice = Voice.createVoice('amy');
    should(voice).instanceOf(Voice);
    should(voice.locale).equal('en-GB');
    should(voice.name).equal('Amy');
    should(voice.usage).equal('recite');
    should(voice.localeIPA).equal('pli');
    should(voice.stripNumbers).equal(false);
    should(voice.stripQuotes).equal(false);

    voice = Voice.createVoice('raveena');
    should(voice).instanceOf(Voice);
    should(voice.locale).equal('en-IN');
    should(voice.name).equal('Raveena');
    should(voice.usage).equal('review');
    should(voice.localeIPA).equal('en-IN');
    should(voice.stripNumbers).equal(false);
    should(voice.stripQuotes).equal(false);

    voice = Voice.createVoice('Matthew');
    should(voice).instanceOf(Voice);
    should(voice.locale).equal('en-US');
    should(voice.name).equal('Matthew');
    should(voice.usage).equal('recite');
    should(voice.localeIPA).equal('pli');
    should(voice.stripNumbers).equal(false);
    should(voice.stripQuotes).equal(false);
  });

  it('createVoice(opts) => recite Voice instance', () => {
    const reciteVoice = Voice.createVoice({
      locale: 'en',
      usage: 'recite',
    });
    should(reciteVoice.name).equal('Amy');
    should(reciteVoice.services.navigate).instanceOf(Polly);
    should(reciteVoice.services.recite).instanceOf(Polly);
    should(reciteVoice.usage).equal('recite');
    should(reciteVoice.usages).properties(['navigate', 'recite', 'review']);
    should(reciteVoice.usages.review).properties(['rate', 'breaks']);
    should.deepEqual(reciteVoice.services.navigate.prosody, {
      pitch: '-0%',
      rate: '+5%',
    });
    should.deepEqual(reciteVoice.services.recite.prosody, {
      pitch: '-0%',
      rate: '-30%',
    });

    const navVoice = Voice.createVoice({
      locale: 'en',
      usage: 'navigate',
    });
    should(navVoice.name).equal('Raveena');
    should(navVoice.services.navigate).instanceOf(Polly);
    should(navVoice.services.recite).instanceOf(Polly);
    should(navVoice.usage).equal('navigate');
    should.deepEqual(navVoice.services.navigate.prosody, {
      pitch: '-0%',
      rate: '+5%',
    });
  });

  it('TESRTTESTcreateVoice(opts) => review Voice instance', () => {
    const loggerInstance = new LogInstance();
    const reviewVoice = Voice.createVoice({
      locale: 'en',
      usage: 'review',
      logger: loggerInstance,
    });
    should(reviewVoice.logger).equal(loggerInstance);
    should(reviewVoice).instanceOf(Voice);
    const polly = reviewVoice.services.review;
    should(polly).instanceOf(Polly);
    should(polly.logger).equal(reviewVoice);
    should(reviewVoice.name).equal('Raveena');
    should(reviewVoice.usage).equal('review');
    should(reviewVoice.usages).properties(['navigate', 'recite', 'review']);
    should(reviewVoice.usages.review).properties(['rate', 'breaks']);
    should(reviewVoice.services.navigate).instanceOf(Polly);
    should(reviewVoice.services.recite).instanceOf(Polly);
    should(reviewVoice.services.review).instanceOf(Polly);
    should.deepEqual(reviewVoice.services.navigate.prosody, {
      pitch: '-0%',
      rate: '+5%',
    });
    should.deepEqual(reviewVoice.services.recite.prosody, {
      pitch: '-0%',
      rate: '-20%',
    });
    should.deepEqual(reviewVoice.services.review.prosody, {
      pitch: '-0%',
      rate: '-5%',
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

    const navVoice = Voice.createVoice({
      name: 'Raveena',
      usage: 'navigate',
    });
  });

  it('speak(...) => sound file for array of text', async () => {
    const raveena = Voice.createVoice({ locale: 'en-IN' });
    const text = ['Tomatoes are', 'red.', 'Tomatoes are red.'];
    const cache = true;
    const opts = {
      cache,
      usage: 'navigate',
      volume: 'test',
      chapter: 'voice',
    };
    const result = await raveena.speak(text, opts);

    should(result).properties([
      'file',
      'hits',
      'misses',
      'signature',
      'cached',
    ]);
    const storePath = raveena.soundStore.storePath;
    const files = result.signature.files.map((f) => path.join(storePath, f));
    should(files.length).equal(3);
    should(fs.statSync(files[0]).size).greaterThan(1000);
    should(fs.statSync(files[1]).size).greaterThan(1000);
    should(fs.statSync(files[2]).size).greaterThan(1000);
    should(fs.statSync(result.file).size).greaterThan(5000);
  });

  it('placeholder words are expanded with voice ipa', () => {
    const raveena = Voice.createVoice({
      locale: 'en-IN',
      localeIPA: 'pli',
    });
    const amy = Voice.createVoice({
      locale: 'en-GB',
      localeIPA: 'pli',
    });
    should(raveena.services.navigate.localeIPA).equal('pli');
    should(amy.services.navigate.localeIPA).equal('pli');

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

  it('placeholder words are expanded with voice ipa', () => {
    const raveena = Voice.createVoice('raveena');
    should(raveena).properties({
      name: 'Raveena',
    });
    const tts = raveena.services.navigate;
    should(tts).properties({
      voice: 'Raveena',
      language: 'en-IN',
      localeIPA: 'en-IN',
    });
    let segments = tts.segmentSSML('sati');
    should.deepEqual(segments, [phoneme(`sɐθɪ`, `sati`)]);

    segments = tts.segmentSSML('Koalas and gummibears?');
    should.deepEqual(segments, ['Koalas and gummibears?']);

    tts.localeIPA = 'pli';
    segments = tts.segmentSSML('Taṃ kissa hetu?');
    should.deepEqual(segments, [
      `<phoneme alphabet="ipa" ph="θɐŋ">Taṃ</phoneme>${BREAK} ` +
        `<phoneme alphabet="ipa" ph="kɪssa">kissa</phoneme>${BREAK} ` +
        `<phoneme alphabet="ipa" ph="heθu">hetu</phoneme>${BREAK}?`,
    ]);
  });

  it('speak(text) trim German trailing en-dash', async () => {
    const vicki = Voice.createVoice({
      name: 'Vicki',
    });
    const text = 'Von hier geht er zur Hölle –';
    const result = await vicki.speak(text, { usage: 'recite' });
    should(result.signature.text).match(/>Von hier geht er zur Hölle</);
  });

  it('speak(text) speaks Pali', async () => {
    const raveena = Voice.createVoice({
      name: 'raveena',
      localeIPA: 'pli',
    });
    const text = `Idha panudāyi, ekacco puggalo 'upadhi dukkhassa mūlan'ti—`;
    const result = await raveena.speak(text, { usage: 'recite' });
    should(result).properties([
      'file',
      'hits',
      'misses',
      'signature',
      'cached',
    ]);
    should(result.signature.text).match(/ph="ekɐcco"/);
    should(result.signature.text).match(/ph="dʊk.kʰɐssa"/);
  });

  it('speak(text) can handle lengthy Pali', async () => {
    const aditi = Voice.createVoice({
      name: 'aditi',
      usage: 'recite',
      localeIPA: 'pli',
      locale: 'hi-IN',
      stripNumbers: true,
      stripQuotes: true,
    });
    should(aditi.maxSegment).equal(400);
    const text = `Cuddasa kho panimāni yonipamukhasatasahassāni saṭṭhi ca satāni cha ca satāni pañca ca kammuno satāni pañca ca kammāni, tīṇi ca kammāni, kamme ca aḍḍhakamme ca dvaṭṭhipaṭipadā, dvaṭṭhantarakappā, chaḷābhijātiyo, aṭṭha purisabhūmiyo, ekūnapaññāsa ājīvakasate, ekūnapaññāsa paribbājakasate, ekūnapaññāsa nāgavāsasate, vīse indriyasate, tiṃse nirayasate, chattiṃsarajodhātuyo, satta saññīgabbhā, satta asaññīgabbhā, satta nigaṇṭhigabbhā, satta devā, satta mānusā, satta pesācā, satta sarā, satta pavuṭā, satta papātā, satta ca papātasatāni, satta supinā, satta supinasatāni, cullāsīti mahākappino satasahassāni, yāni bāle ca paṇḍite ca sandhāvitvā saṃsaritvā dukkhassantaṃ karissanti."`;
    const result = await aditi.speak(text, { usage: 'recite' });
    should(result.signature.api).equal('ffmegConcat');
    should(result.signature.files.length).equal(30);
  });

  it('Amy phonemes', () => {
    const amy = Voice.createVoice({
      locale: 'en-GB',
      localeIPA: 'pli',
    });
    should(amy.name).equal('Amy');
    const recite = amy.services.recite;
    should(recite.wordSSML('self-mortifiers')).equal('self-mortifiers');
    should(recite.wordSSML(`bow`)).equal(phoneme('baʊ', 'bow'));
  });

  it('Raveena phonemes', () => {
    const raveena = Voice.createVoice({
      locale: 'en-IN',
      localeIPA: 'pli',
    });
    should(raveena.name).equal('Raveena');
    const recite = raveena.services.recite;
    should(recite.wordSSML(`bow`)).equal(phoneme('baʊ', 'bow'));
    should(recite.wordSSML(`Nāmañca`)).equal(phoneme('nɑmaɲca', 'Nāmañca'));
    should(recite.wordSSML(`anottappañca`)).match(/"ɐˈnoθθɐppɐɲca"/);
    should(recite.wordSSML(`Atthi`)).match(/"ɐˈθθhɪ"/);
    should(recite.wordSSML(`hoti`)).match(/"hoθɪ"/);
  });

  it('Aditi phonemes', () => {
    const aditi = Voice.createVoice({
      name: 'aditi',
      localeIPA: 'pli',
    });
    should(aditi.name).equal('Aditi');
    should(aditi.locale).equal('hi-IN');
    const recite = aditi.services.recite;
    should(recite.wordSSML(`vasala`)).equal(phoneme('v\\ə sə la', 'vasala'));
    should(recite.wordSSML(`Nāmañca`)).equal(
      phoneme('nɑː məɳ cə', 'Nāmañca')
    );
    should(recite.wordSSML(`anottappañca`)).match(/"ə not̪ t̪əp pəɳ cə"/);
    should(recite.wordSSML(`Atthi`)).match(/"ət̪.t̪ʰɪ"/);
    should(recite.wordSSML(`hoti`)).match(/"hot̪ɪ"/);
  });

  it('speak(text) can ignore numbers', async () => {
    let raveena = Voice.createVoice({
      name: 'raveena',
      stripNumbers: true,
      localeIPA: 'pli',
    });
    let text = `Bhikkhu 123`;
    let result = await raveena.speak(text, { usage: 'recite' });
    should(result.signature.api).equal('aws-polly');
    should(result.signature.text).not.match(/123/);

    text = `Bhikkhu (123)`;
    result = await raveena.speak(text, { usage: 'recite' });
    should(result.signature.api).equal('aws-polly');
    should(result.signature.text).not.match(/\(.*\)/);
  });

  it('speak(text) can ignore quotes', async () => {
    const raveena = Voice.createVoice({
      name: 'raveena',
      stripQuotes: true,
      localeIPA: 'pli',
    });
    const text = `"''Bhikkhu''"`;
    const result = await raveena.speak(text, { usage: 'recite' });
    should(result.signature.api).equal('aws-polly');
    should(result.signature.text).not.match(/[“'‘'”]/);
  });

  it('speakSegment(opts) trims segment', async () => {
    const vicki = Voice.createVoice({
      name: 'vicki',
    });
    const sutta_uid = 'an3.29';
    const language = 'de';
    const translator = 'sujato';
    const usage = 'recite';
    const segment = {
      scid: 'an3.29:6.5',
      de: 'Von hier geht er zur Hölle – ',
    };
    const resSpeak = await vicki.speakSegment({
      sutta_uid,
      segment,
      language,
      translator,
      usage,
    });
    const { api, text } = resSpeak.signature;
    should(api).equal('aws-polly');
    should(text).match(/>Von hier geht er zur Hölle</);
  });

  it('speakSegment(opts) speaks aws-polly', async () => {
    const aditi = Voice.createVoice({
      name: 'aditi',
    });
    const sutta_uid = 'sn1.9';
    const language = 'pli';
    const translator = 'sujato';
    const usage = 'recite';
    const segment = {
      scid: 'sn1.9:1.1',
      pli: 'purple squirrels',
    };
    const resSpeak = await aditi.speakSegment({
      sutta_uid,
      segment,
      language,
      translator,
      usage,
    });
    should(resSpeak.signature).properties({
      api: 'aws-polly',
      guid: '23aba87c0acf41410b14e1de1658a7ae',
    });
  });

  it('speakSegment(opts) human-tts requires SCAudio', async () => {
    const sutta_uid = 'sn1.9999';
    const language = 'pli';
    const translator = 'sujato';
    const usage = 'recite';
    const segment = {
      scid: `${sutta_uid}:1.1`,
      pli: 'purple squirrels',
    };
    const args = {
      sutta_uid,
      segment,
      language,
      translator,
      usage,
    };

    const voice = Voice.createVoice({
      name: 'sujato_pli',
    });
    let eCaught = null;
    await voice
      .speakSegment(args)
      .catch((e) => (eCaught = e));
    should(eCaught).instanceOf(Error);
    should(eCaught.message).match(/scAudio is required/);
  });

  it('speakSegment(opts) human-tts uses altTts', async () => {
    const sutta_uid = 'sn1.9999';
    const language = 'pli';
    const translator = 'sujato';
    const usage = 'recite';
    const segment = {
      scid: `${sutta_uid}:1.1`,
      pli: 'purple squirrels',
    };
    const args = {
      sutta_uid,
      segment,
      language,
      translator,
      usage,
    };

    const scAudio = new SCAudio();
    const voice = Voice.createVoice({
      name: 'sujato_pli',
      scAudio,
    });
    voice.scAudio.logLevel = 'error';
    should(voice.altTts.voice).equal('Aditi');
    const resSpeak = await voice.speakSegment(args);
    voice.scAudio.logLevel = logger.logLevel;
    should(resSpeak).properties(['file', 'signature']);
    should(resSpeak.signature).properties({
      api: 'aws-polly',
      voice: 'Aditi',
      guid: '23aba87c0acf41410b14e1de1658a7ae',
    });
    should(resSpeak.file).match(/sn_pli_mahasangiti_aditi.*/);
    should(fs.existsSync(resSpeak.file)).equal(true);
  });

  it('speakSegment(opts) downloads human-tts', async () => {
    const sutta_uid = 'sn1.9';
    const storePath = tmp.tmpNameSync();
    const soundStore = new SoundStore({
      storePath,
    });
    const language = 'pli';
    const translator = 'sujato';
    const usage = 'recite';
    const segment = {
      scid: `${sutta_uid}:1.1`,
      pli: 'purple squirrels',
    };
    const args = {
      sutta_uid,
      segment,
      language,
      translator,
      usage,
    };
    const scAudio = new SCAudio();
    const voice = Voice.createVoice({
      name: 'sujato_pli',
      scAudio,
      soundStore,
    });

    args.downloadAudio = false;
    let resSpeak = await voice.speakSegment(args);
    should(resSpeak).properties(['file', 'signature']);
    should(resSpeak.signature).properties({
      api: 'aws-polly',
      voice: 'Aditi',
    });
    should(resSpeak.file).match(new RegExp(resSpeak.signature.guid));
    should(fs.existsSync(resSpeak.file)).equal(true);

    args.downloadAudio = true;
    resSpeak = await voice.speakSegment(args);
    should(resSpeak).properties(['file', 'signature']);
    should(resSpeak.signature).properties({
      api: 'human-tts',
      reader: 'sujato_pli',
    });
    should(resSpeak.file).match(new RegExp(resSpeak.signature.guid));
    should(fs.existsSync(resSpeak.file)).equal(true);

    delete args.downloadAudio;
    resSpeak = await voice.speakSegment(args);
    should(resSpeak).properties(['file', 'signature']);
    should(resSpeak.signature).properties({
      api: 'human-tts',
      reader: 'sujato_pli',
    });
    should(resSpeak.file).match(new RegExp(resSpeak.signature.guid));
    should(fs.existsSync(resSpeak.file)).equal(true);
  });

  it('voiceOfName(name) returns voice of name', () => {
    should(Voice.voiceOfName('amy')).properties({ name: 'Amy' });
    should(Voice.voiceOfName('Amy')).properties({ name: 'Amy' });
    should(Voice.voiceOfName('0')).properties({ name: 'Amy' });
    should(Voice.voiceOfName(0)).properties({ name: 'Amy' });
    should(Voice.voiceOfName(1)).properties({ name: 'Brian' });
    should(Voice.voiceOfName('Russell')).equal(null);
    should(Voice.voiceOfName('raveena')).properties({ name: 'Raveena' });
    should(Voice.voiceOfName('vicki')).properties({ name: 'Vicki' });
    should(Voice.voiceOfName('sujato_pli')).properties({
      name: 'sujato_pli',
    });
  });

  it('synthesizeBreak() for HumanTts uses altTts', async () => {
    const scAudio = new SCAudio();
    const voice = Voice.createVoice({
      name: 'sujato_en',
      scAudio,
    });
    const altTts = voice.altTts;
    should(altTts.voice).equal('Amy');
    const tts = voice.services.recite;
    let result = await altTts.synthesizeBreak();
    should(result.signature.guid).match(
      /5a4ddf6b9c5cfd7e1ad8cf8a36e96c0f/
    );

    result = await tts.synthesizeBreak();
    should(result.signature.guid).match(
      /5a4ddf6b9c5cfd7e1ad8cf8a36e96c0f/
    );
  });

  it('speak(text) => ellipsis in AN2.17:3.1 (pli)', async () => {
    const deVoices = ['aditi'];
    deVoices.forEach((name) => {
      const v = Voice.createVoice({ name });
      const text = [
        `Abhikkantaṁ, bho gotama …pe… upāsakaṁ maṁ bhavaṁ`,
        `gotamo dhāretu ajjatagge pāṇupetaṁ saraṇaṁ gatan"ti`,
      ].join(' ');
      const tts = v.services.recite;
      should(tts.ellipsisBreak).equal(ELLIPSIS_BREAK);
      const segmented = tts.segmentSSML(tts.stripHtml(text));
      should(segmented[2]).equal(ELLIPSIS_BREAK);
      should(segmented[4]).equal(ELLIPSIS_BREAK);
      should(segmented.length).equal(7);
    });
  });

  it('speak(text) => ellipsis in AN2.17:3.1 (de)', async () => {
    const deVoices = ['marlene', 'vicki', 'hans'];
    deVoices.forEach((name) => {
      const v = Voice.createVoice({ name });
      const text = [
        `„Vortrefflich, Meister Gotama! … Von diesem Tag an`,
        `soll Meister Gotama mich als Laienschüler kennen,`,
        `der für sein ganzes Leben Zuflucht gesucht hat.`,
      ].join(' ');
      const tts = v.services.recite;
      should(tts.ellipsisBreak).equal(ELLIPSIS_BREAK);
      const segmented = tts.segmentSSML(tts.stripHtml(text));
      should(segmented[1]).equal(ELLIPSIS_BREAK);
      should(segmented.length).equal(3);
    });
  });

  it('speak(text) => ellipsis in AN2.17:3.1 (en)', async () => {
    const enVoices = ['amy', 'raveena', 'matthew', 'brian'];
    enVoices.forEach((name) => {
      const v = Voice.createVoice({ name });
      const text = [
        `Excellent, Master Gotama! … From this day forth,`,
        `may Master Gotama remember me as a lay follower who`,
        `has gone for refuge for life.`,
      ].join(' ');
      const tts = v.services.recite;
      should(tts.ellipsisBreak).equal(ELLIPSIS_BREAK);
      const segmented = tts.segmentSSML(tts.stripHtml(text));
      should(segmented[1]).startWith(ELLIPSIS_BREAK);
      should(segmented.length).equal(3);
    });
  });

  it('speak(text) => ellipsis with period', async () => {
    const v = Voice.createVoice({ name: 'vicki' });
    const text = `akkosatipi, āpatti thullaccayassa …pe….`;
    const { segments } = await v.speak(text);
    should.deepEqual(segments, [
      'akkosatipi, āpatti thullaccayassa',
      '<break time="0.300s"/>',
      'pe',
      '<break time="0.300s"/>',
    ]);
  });

  it('supportedLanguages', () => {
    should.deepEqual(Voice.supportedLanguages, {
      'en': true,
      'fr': true,
      'it': true,
      'pt': true,
      'es': true,
      'de': true,
      'jpn': true,
      'pli': true,
      'ru': true,
    });
  });

  it('createVoice() Tatyana', () => {
    const msg = 'tv3e.createVoice-tatyana:';
    const dbg = 0;
    const name = 'Tatyana';
    const locale = 'ru-RU';
    const voice = Voice.createVoice({ name });
    should(voice).instanceOf(Voice);
    should(voice.locale).equal(locale);
    should(voice.name).equal(name);
    should(voice.usage).equal('recite');
    should(voice.voiceVersion).equal(1);
    const { recite } = voice.services;
    should(recite.language).equal('ru-RU');
    const sigRecite = recite.signature();
    should(sigRecite).properties({
      voiceVersion: 1,
    });
  });

  it('createVoice() Maxim', () => {
    const msg = 'tv3e.createVoice-maxim:';
    const dbg = 0;
    const name = 'Maxim';
    const locale = 'ru-RU';
    const voice = Voice.createVoice({ name });
    should(voice).instanceOf(Voice);
    should(voice.locale).equal(locale);
    should(voice.name).equal(name);
    should(voice.usage).equal('recite');
    should(voice.voiceVersion).equal(1);
    const { recite } = voice.services;
    should(recite.language).equal('ru-RU');
    const sigRecite = recite.signature();
    should(sigRecite).properties({
      voiceVersion: 1,
    });
  });

  it('voiceOfName(name) RU', () => {
    const maxim = Voice.voiceOfName('Maxim');
    should(maxim).properties({
      name: 'Maxim',
      locale: 'ru-RU',
      localeIPA: 'ru-RU',
      voiceVersion: 1,
    });
  });
});
