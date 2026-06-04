import { describe, it, expect } from '@sc-voice/vitest';
import should from 'should';
import fs from 'fs';
import path from 'path';
import tmp from 'tmp';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { ScApi } = require('suttacentral-api');
const Polly = require('../src/polly.cjs');
const SCAudio = require('../src/sc-audio.cjs');
const SoundStore = require('../src/sound-store.cjs');
const SuttaFactory = require('../src/sutta-factory.cjs');
const Voice = require('../src/voice.cjs');
const VoiceFactory = require('../src/voice-factory.cjs');
const Words = require('../src/words.cjs');

const ELLIPSIS = '…';
const ELLIPSIS_BREAK = '<break time="1.000s"/>';
const BREAK = `<break time="0.001s"/>`;

function phoneme(ph, word) {
  return `<phoneme alphabet="ipa" ph="${ph}">${word}</phoneme>${BREAK}`;
}

describe('de', () => {
  it('loadSutta() loads sn12.3/de/geiger', async () => {
    var scApi = await new ScApi().initialize();
    var factory = await new SuttaFactory({ scApi }).initialize();
    var sutta = await factory.loadSutta({
      scid: 'sn12.3',
      language: 'de',
      translator: 'geiger',
    });
    var sections = sutta.sections;
    expect(sections[0].segments[1]).toEqual({
      scid: 'sn12.3:0.2',
      de: 'Der Weg',
      pli: 'Paṭipadāsutta',
    });
  });
  it('createVoice(voiceName) returns a default voice', () => {
    var voice = Voice.createVoice('vicki');
    should(voice).instanceOf(Voice);
    expect(voice.locale).toBe('de-DE');
    expect(voice.name).toBe('Vicki');
    expect(voice.usage).toBe('recite');
    expect(voice.localeIPA).toBe('pli');
    expect(voice.stripNumbers).toBe(false);
    expect(voice.stripQuotes).toBe(true);
    expect(voice.trimSegmentSuffix).toBe(' – *');
    expect(voice.altTts).toBe(undefined);
  });
  it('wordSSML(word) Vicki SSML text for word', () => {
    var matthew = Voice.createVoice('matthew').services.recite;
    var ssml = matthew.wordSSML('place');
    expect(ssml).toBe('place');

    var vicki = Voice.createVoice('vicki').services.recite;
    var ssml = vicki.wordSSML('Ort', 'de');
    expect(ssml).toBe('Ort');
    var ssml = vicki.wordSSML('Saṃyutta', 'de');
    expect(ssml).toMatch(/ph="saŋjut.ta"/);
  });
  it('wordInfo(word) returns SSML text for word', () => {
    var matthew = Voice.createVoice('matthew').services.recite;
    expect(matthew.wordInfo('place')).toEqual({ language: 'en' });

    var vicki = Voice.createVoice('vicki').services.recite;
    expect(vicki.wordInfo('Ort')).toEqual({ language: 'de' });
  });
  it('speak([text],opts) => sound file for array of text', async () => {
    var voice = Voice.createVoice('de-DE');
    var text = ['Ort der Begebenheit: Sāvatthī.'];
    var cache = true;
    var opts = {
      cache,
      usage: 'recite',
      volume: 'test',
      chapter: 'voice',
    };
    var result = await voice.speak(text, opts);
    expect(result).toHaveProperty('file');
    expect(result).toHaveProperty('hits');
    expect(result).toHaveProperty('misses');
    expect(result).toHaveProperty('signature');
    expect(result).toHaveProperty('cached');
    expect(fs.statSync(result.file).size).toBeGreaterThan(15000);
    expect(fs.statSync(result.file).size).toBeLessThan(21000);
  });
  it('placeholder words are expanded with voice ipa', () => {
    var raveena = Voice.createVoice({
      locale: 'en-IN',
      localeIPA: 'pli',
    });
    var amy = Voice.createVoice({
      locale: 'en-GB',
      localeIPA: 'pli',
    });
    expect(raveena.services.navigate.localeIPA).toBe('pli');
    expect(amy.services.navigate.localeIPA).toBe('pli');

    expect(raveena.services.recite.wordSSML(`Ubbhaṭaka`)).toBe(
      `<break time="0.001s"/><phoneme alphabet="ipa" ph="ubbʰɐtɐka">` +
        `Ubbhaṭaka</phoneme><break time="0.001s"/>`
    );
    expect(amy.services.recite.wordSSML(`Ubbhaṭaka`)).toBe(
      `<break time="0.001s"/><phoneme alphabet="ipa" ph="ubbʰɐtɐka">` +
        `Ubbhaṭaka</phoneme><break time="0.001s"/>`
    );

    expect(raveena.services.recite.wordSSML(`don't`)).toBe(`don't`);
    expect(amy.services.recite.wordSSML(`don't`)).toBe(`don't`);
    expect(
      raveena.services.recite.wordSSML(`don${Words.U_APOSTROPHE}t`)
    ).toBe(`don${Words.U_APOSTROPHE}t`);
    expect(amy.services.recite.wordSSML(`don${Words.U_APOSTROPHE}t`)).toBe(
      `don${Words.U_APOSTROPHE}t`
    );

    expect(raveena.services.recite.wordSSML(`ariyasaccan’ti`)).equal(
      `<phoneme alphabet="ipa" ph="ɐˈɺɪjɐsɐccɐn’θɪ">` +
        `ariyasaccan’ti</phoneme><break time="0.001s"/>`
    );
    expect(amy.services.recite.wordSSML(`ariyasaccan’ti`)).equal(
      `<phoneme alphabet="ipa" ph="ɐɺɪjɐsɐccɐn’tɪ">` +
        `ariyasaccan’ti</phoneme><break time="0.001s"/>`
    );

    expect(raveena.services.navigate.wordSSML('sati')).toBe(
      `<phoneme alphabet="ipa" ph="s\u0250\u03b8\u026a">sati</phoneme>${BREAK}`
    );
    expect(raveena.services.navigate.wordSSML('Saṅgha')).toBe(
      `<phoneme alphabet="ipa" ph="s\u0250\u014bgʰa">Saṅgha</phoneme>${BREAK}`
    );

    expect(amy.services.navigate.wordSSML('sati')).toBe(
      `<phoneme alphabet="ipa" ph="s\u0250t\u026a">sati</phoneme>${BREAK}`
    );
    expect(amy.services.navigate.wordSSML('Saṅgha')).toBe(
      `<phoneme alphabet="ipa" ph="s\u0250\u014bgʰa">Saṅgha</phoneme>${BREAK}`
    );
  });
  it('placeholder words are expanded with voice ipa', () => {
    var raveena = Voice.createVoice('raveena');
    expect(raveena).toMatchObject({ name: 'Raveena' });
    var tts = raveena.services.navigate;
    expect(tts).toMatchObject({
      voice: 'Raveena',
      language: 'en-IN',
      localeIPA: 'en-IN',
    });
    var segments = tts.segmentSSML('sati');
    expect(segments).toEqual([phoneme("s\u0250\u03b8\u026a", `sati`)]);

    var segments = tts.segmentSSML('Koalas and gummibears?');
    expect(segments).toEqual(['Koalas and gummibears?']);

    tts.localeIPA = 'pli';
    var segments = tts.segmentSSML('Taṃ kissa hetu?');
    expect(segments).toEqual([
      `<phoneme alphabet="ipa" ph="\u03b8\u0250\u014b">Taṃ</phoneme>${BREAK} ` +
        `<phoneme alphabet="ipa" ph="k\u026assa">kissa</phoneme>${BREAK} ` +
        `<phoneme alphabet="ipa" ph="he\u03b8u">hetu</phoneme>${BREAK}?`,
    ]);
  });
  it('speak(text) speaks Pali', async () => {
    var raveena = Voice.createVoice({
      name: 'raveena',
      localeIPA: 'pli',
    });
    var text = `Idha panudāyi, ekacco puggalo 'upadhi dukkhassa mūlan'ti—`;
    var result = await raveena.speak(text, { usage: 'recite' });
    expect(result).toMatchObject({
      file: expect.any(String),
      hits: expect.any(Number),
      misses: expect.any(Number),
      signature: expect.any(Object),
      cached: expect.any(Boolean),
    });
    expect(result.signature.text).toMatch(/ph="ekɐcco"/);
    expect(result.signature.text).toMatch(/ph="dʊk.kʰɐssa"/);
  });
  it('speak(text) can handle lengthy Pali', async () => {
    var aditi = Voice.createVoice({
      name: 'aditi',
      usage: 'recite',
      localeIPA: 'pli',
      locale: 'hi-IN',
      stripNumbers: true,
      stripQuotes: true,
    });
    expect(aditi.maxSegment).toBe(400);
    var text = `Cuddasa kho panimāni yonipamukhasatasahassāni saṭṭhi ca satāni cha ca satāni pañca ca kammuno satāni pañca ca kammāni, tīṇi ca kammāni, kamme ca aḍḍhakamme ca dvaṭṭhipaṭipadā, dvaṭṭhantarakappā, chaḷābhijātiyo, aṭṭha purisabhūmiyo, ekūnapaññāsa ājīvakasate, ekūnapaññāsa paribbājakasate, ekūnapaññāsa nāgavāsasate, vīse indriyasate, tiṃse nirayasate, chattiṃsarajodhātuyo, satta saññīgabbhā, satta asaññīgabbhā, satta nigaṇṭhigabbhā, satta devā, satta mānusā, satta pesācā, satta sarā, satta pavuṭā, satta papātā, satta ca papātasatāni, satta supinā, satta supinasatāni, cullāsīti mahākappino satasahassāni, yāni bāle ca paṇḍite ca sandhāvitvā saṃsaritvā dukkhassantaṃ karissanti."`;
    var result = await aditi.speak(text, { usage: 'recite' });
    expect(result.signature.api).toBe('ffmegConcat');
    expect(result.signature.files.length).toBe(30);
  });
  it('Amy phonemes', () => {
    var amy = Voice.createVoice({
      locale: 'en-GB',
      localeIPA: 'pli',
    });
    expect(amy.name).toBe('Amy');
    var recite = amy.services.recite;
    expect(recite.wordSSML(`bow`)).toBe(phoneme('baʊ', 'bow'));
  });
  it('Raveena phonemes', () => {
    // TODO
  });
  it('Marlene speaks', () => {
    var marlene = Voice.createVoice({
      name: 'Marlene',
      localeIPA: 'pli',
    });
    expect(marlene.name).toBe('Marlene');
    expect(marlene.locale).toBe('de-DE');
    var recite = marlene.services.recite;
    expect(recite.wordSSML(`Kaccāna`)).toBe(
      phoneme('kat͡ʃt͡ʃa:na', 'Kaccāna')
    );
  });
  it('speak(text) can ignore numbers', async () => {
    var raveena = Voice.createVoice({
      name: 'raveena',
      stripNumbers: true,
      localeIPA: 'pli',
    });
    var text = `Bhikkhu 123`;
    var result = await raveena.speak(text, { usage: 'recite' });
    expect(result.signature.api).toBe('aws-polly');
    expect(result.signature.text).not.toMatch(/123/);

    var text = `Bhikkhu (123)`;
    var result = await raveena.speak(text, { usage: 'recite' });
    expect(result.signature.api).toBe('aws-polly');
    expect(result.signature.text).not.toMatch(/\(.*\)/);
  });
  it('speak(text) can ignore quotes', async () => {
    var raveena = Voice.createVoice({
      name: 'raveena',
      stripQuotes: true,
      localeIPA: 'pli',
    });
    var text = `“'‘Bhikkhu’'”`;
    var result = await raveena.speak(text, { usage: 'recite' });
    expect(result.signature.api).toBe('aws-polly');
    expect(result.signature.text).not.toMatch(/[“'‘'”]/);
  });
  it('speakSegment(opts) speaks aws-polly', async () => {
    var aditi = Voice.createVoice({
      name: 'aditi',
    });
    var sutta_uid = 'sn1.9';
    var language = 'pli';
    var translator = 'sujato';
    var usage = 'recite';
    var segment = {
      scid: 'sn1.9:1.1',
      pli: 'purple squirrels',
    };
    var resSpeak = await aditi.speakSegment({
      sutta_uid,
      segment,
      language,
      translator,
      usage,
    });
    expect(resSpeak.signature).toMatchObject({
      api: 'aws-polly',
      guid: '23aba87c0acf41410b14e1de1658a7ae',
    });
  });
  it('speakSegment(opts) human-tts requires SCAudio', async () => {
    var sutta_uid = 'sn1.9999';
    var language = 'pli';
    var translator = 'sujato';
    var usage = 'recite';
    var segment = {
      scid: `${sutta_uid}:1.1`,
      pli: 'purple squirrels',
    };
    var args = {
      sutta_uid,
      segment,
      language,
      translator,
      usage,
    };

    var voice = Voice.createVoice({
      name: 'sujato_pli',
    });
    var eCaught = null;
    var resSpeak = await voice
      .speakSegment(args)
      .catch((e) => (eCaught = e));
    should(eCaught).instanceOf(Error);
    expect(eCaught.message).toMatch(/scAudio is required/);
  });
  it('speakSegment(opts) human-tts uses altTts', async () => {
    var sutta_uid = 'sn1.9999';
    var language = 'pli';
    var translator = 'sujato';
    var usage = 'recite';
    var segment = {
      scid: `${sutta_uid}:1.1`,
      pli: 'purple squirrels',
    };
    var args = {
      sutta_uid,
      segment,
      language,
      translator,
      usage,
    };

    var scAudio = new SCAudio();
    scAudio.logLevel = 'error';
    var voice = Voice.createVoice({
      name: 'sujato_pli',
      scAudio,
    });
    voice.logLevel = 'error';
    expect(voice.altTts.voice).toBe('Aditi');
    voice.warn('EXPECTED WARNING BEGIN');
    var resSpeak = await voice.speakSegment(args);
    voice.warn('EXPECTED WARNING END');
    expect(resSpeak).toMatchObject({
      file: expect.any(String),
      signature: expect.any(Object),
    });
    expect(resSpeak.signature).toMatchObject({
      api: 'aws-polly',
      voice: 'Aditi',
      guid: '23aba87c0acf41410b14e1de1658a7ae',
    });
    expect(resSpeak.file).toMatch(/sn_pli_mahasangiti_aditi.*/);
    expect(fs.existsSync(resSpeak.file)).toBe(true);
  });
  it('speakSegment(opts) downloads human-tts', async () => {
    var sutta_uid = 'sn1.9';
    var storePath = tmp.tmpNameSync();
    var soundStore = new SoundStore({
      storePath,
    });
    var language = 'pli';
    var translator = 'sujato';
    var usage = 'recite';
    var segment = {
      scid: `${sutta_uid}:1.1`,
      pli: 'purple squirrels',
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
      name: 'sujato_pli',
      scAudio,
      soundStore,
    });

    args.downloadAudio = false;
    var resSpeak = await voice.speakSegment(args);
    expect(resSpeak).toMatchObject({
      file: expect.any(String),
      signature: expect.any(Object),
    });
    expect(resSpeak.signature).toMatchObject({
      api: 'aws-polly',
      voice: 'Aditi',
    });
    expect(resSpeak.file).toMatch(new RegExp(resSpeak.signature.guid));
    expect(fs.existsSync(resSpeak.file)).toBe(true);

    args.downloadAudio = true;
    var resSpeak = await voice.speakSegment(args);
    expect(resSpeak).toMatchObject({
      file: expect.any(String),
      signature: expect.any(Object),
    });
    expect(resSpeak.signature).toMatchObject({
      api: 'human-tts',
      reader: 'sujato_pli',
    });
    expect(resSpeak.file).toMatch(new RegExp(resSpeak.signature.guid));
    expect(fs.existsSync(resSpeak.file)).toBe(true);

    delete args.downloadAudio;
    var resSpeak = await voice.speakSegment(args);
    expect(resSpeak).toMatchObject({
      file: expect.any(String),
      signature: expect.any(Object),
    });
    expect(resSpeak.signature).toMatchObject({
      api: 'human-tts',
      reader: 'sujato_pli',
    });
    expect(resSpeak.file).toMatch(new RegExp(resSpeak.signature.guid));
    expect(fs.existsSync(resSpeak.file)).toBe(true);
  });
  it('voiceOfName(name) returns voice of name', () => {
    expect(Voice.voiceOfName('amy')).toMatchObject({ name: 'Amy' });
    expect(Voice.voiceOfName('Amy')).toMatchObject({ name: 'Amy' });
    expect(Voice.voiceOfName('0')).toMatchObject({ name: 'Amy' });
    expect(Voice.voiceOfName(0)).toMatchObject({ name: 'Amy' });
    expect(Voice.voiceOfName(1)).toMatchObject({ name: 'Brian' });
    expect(Voice.voiceOfName('raveena')).toMatchObject({ name: 'Raveena' });
    expect(Voice.voiceOfName(1)).toMatchObject({ name: 'Brian' });
    expect(Voice.voiceOfName('vicki')).toMatchObject({ name: 'Vicki' });
    expect(Voice.voiceOfName('sujato_pli')).toMatchObject({
      name: 'sujato_pli',
    });
  });
});
