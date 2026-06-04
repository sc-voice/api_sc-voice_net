import { describe, it, expect } from '@sc-voice/vitest';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { logger } = require('log-instance');
logger.logLevel = 'warn';
const SCAudio = require('../src/sc-audio.cjs');
const SoundStore = require('../src/sound-store.cjs');
const Voice = require('../src/voice.cjs');

const syllabifyLength = 0;

var cache = true;
const BREAK_PATH = path.join(
  __dirname,
  '..',
  'src',
  'data',
  'break500.mp3'
);

describe('sujato-tts', () => {
  it('createVoice() creates sujato_pli', () => {
    var voice = Voice.createVoice('sujato_pli');
    expect(voice.name).toBe('sujato_pli');
    expect(voice.locale).toBe('pli');
    expect(voice.maxSegment).toBe(400);
    expect(voice.fullStopComma).toBe(true);
    expect(voice.syllableVowels).toBe('aeiouāīū');
    expect(voice.syllabifyLength).toBe(syllabifyLength);
    expect(voice.altTts.voice).toBe('Aditi');

    var recite = voice.services['recite'];
    expect(recite.fullStopComma).toBe(true);
    expect(recite.maxSegment).toBe(400);
    expect(recite.syllableVowels).toBe('aeiouāīū');
    expect(recite.syllabifyLength).toBe(syllabifyLength);

    var voice = Voice.createVoice({
      name: 'sujato_pli',
      syllableVowels: 'aeiou',
    });
    expect(voice.syllableVowels).toBe('aeiou');
    var recite = voice.services['recite'];
    expect(recite.syllableVowels).toBe('aeiou');
  });
  it('createVoice() creates sujato_en', () => {
    var voice = Voice.createVoice('sujato_en');
    expect(voice.name).toBe('sujato_en');
    expect(voice.locale).toBe('en');
    expect(voice.maxSegment).toBe(400);
    expect(voice.fullStopComma).toBe(true);
    expect(voice.altTts.voice).toBe('Amy');

    var recite = voice.services['recite'];
    expect(recite.fullStopComma).toBe(true);
    expect(recite.maxSegment).toBe(400);

    var voice = Voice.createVoice({
      name: 'sujato_en',
      syllableVowels: 'aeiou',
    });
    expect(voice.syllableVowels).toBe('aeiou');
    var recite = voice.services['recite'];
    expect(recite.syllableVowels).toBe('aeiou');
  });
  it('segmentSSML(text) returns SSML', () => {
    var voice = Voice.createVoice({ name: 'sujato_pli' });
    var recite = voice.services['recite'];
    expect(recite.noAudioPath).toMatch(/no_audio.mp3/);

    var ssml = recite.segmentSSML('dakkhiṇeyyaṃ');
    expect(ssml).toEqual(['dakkhiṇeyyaṃ']);
  });
  it('speak([text],opts) returns empty sound file', async () => {
    let usage = 'recite';
    var voice = Voice.createVoice({
      name: 'sujato_pli',
      noAudioPath: BREAK_PATH,
      usage,
    });
    voice.services.recite.logLevel = 'error';
    var text = 'Tomatoes are red. Broccoli is green';
    var cache = true;
    var opts = {
      cache,
      volume: 'test',
      chapter: 'voice',
    };
    var result = await voice.speak(text, opts);
    expect(result).toHaveProperty('file');
    expect(result).toHaveProperty('hits');
    expect(result).toHaveProperty('misses');
    expect(result).toHaveProperty('signature');
    expect(result).toHaveProperty('cached');
    var storePath = voice.soundStore.storePath;
    var files = result.signature.files.map((f) =>
      f.startsWith('/') ? f : path.join(storePath, f)
    );
    expect(files.length).toBe(2);
    expect(files[0]).toBe(files[1]);
    expect(files[0]).toMatch(/break500/);
    expect(fs.statSync(result.file).size).toBeGreaterThan(5000);
  });
  it('speakSegment([text],opts) returns human Pali audio', async () => {
    var usage = 'recite';
    var translator = 'sujato';
    var soundStore = new SoundStore();
    var audioFormat = soundStore.audioFormat;
    var audioSuffix = soundStore.audioSuffix;
    var language = 'pli';
    var localeIPA = 'pli';
    var scAudio = new SCAudio();
    var voice = Voice.createVoice({
      name: 'sujato_pli',
      usage,
      soundStore,
      localeIPA,
      audioFormat,
      audioSuffix,
      scAudio,
    });
    var sutta_uid = 'sn1.1';
    var scid = 'sn1.1:1.1';
    var segment = {
      scid,
      pli: 'Evaṃ me sutaṃ—',
    };
    var cache = false;
    var opts = {
      cache,
      usage: 'recite',
      volume: 'test',
      chapter: 'voice',
    };
    var result = await voice.speakSegment({
      sutta_uid,
      segment,
      language,
      translator,
      usage,
    });
    expect(result.file).toMatch(/4238ffac1b51a0c7ab5551b98a776ebc/);
  });
  it('speakSegment([text],opts) returns human English audio', async () => {
    var usage = 'recite';
    var translator = 'sujato';
    var soundStore = new SoundStore();
    var audioFormat = soundStore.audioFormat;
    var audioSuffix = soundStore.audioSuffix;
    var language = 'en';
    var localeIPA = 'en';
    var scAudio = new SCAudio();
    var voice = Voice.createVoice({
      name: 'sujato_pli',
      usage,
      soundStore,
      localeIPA,
      audioFormat,
      audioSuffix,
      scAudio,
    });
    var sutta_uid = 'sn1.1';
    var scid = 'sn1.1:1.1';
    var segment = {
      scid,
      pli: 'So I have heard. ',
    };
    var cache = false;
    var opts = {
      cache,
      usage: 'recite',
      volume: 'test',
      chapter: 'voice',
    };
    var result = await voice.speakSegment({
      sutta_uid,
      segment,
      language,
      translator,
      usage,
    });
    expect(result.file).toMatch(/f46d257294ca9bbffbb38d5a105cf84a/);
  });
});
