import { describe, it, expect } from '@sc-voice/vitest';
import should from 'should';
import fs from 'fs';
import path from 'path';
import tmp from 'tmp';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { logger } = require('log-instance');
const HumanTts = require('../src/human-tts.cjs');
const SCAudio = require('../src/sc-audio.cjs');
const SoundStore = require('../src/sound-store.cjs');

const BREAK = '<break time="0.001s"/>';
const SRC = path.join(__dirname, '..', 'src');

function phoneme(ph, text) {
  return (
    `<phoneme alphabet="ipa" ph="${ph}">${text}</phoneme>` + `${BREAK}`
  );
}

const TEST_SCAUDIO = new SCAudio();

describe('human-tts', () => {
  it('constructor', () => {
    var humanTts = new HumanTts();
    expect(humanTts).toMatchObject({
      language: 'pli',
      localeIPA: 'pli',
      voice: 'sujato_pli',
      audioFormat: 'mp3',
      audioSuffix: '.mp3',
      prosody: {
        rate: '0%',
      },
    });

    var humanTts = new HumanTts({
      language: 'pli',
      scAudio: TEST_SCAUDIO,
    });
    expect(humanTts).toMatchObject({
      language: 'pli',
      localeIPA: 'pli',
      voice: 'sujato_pli',
      audioFormat: 'mp3',
      audioSuffix: '.mp3',
      scAudio: TEST_SCAUDIO,
      prosody: {
        rate: '0%',
      },
    });
  });
  it('signature(text) returns TTS synthesis signature', () => {
    var humanTts = new HumanTts();
    expect(humanTts.language).toBe('pli');
    var sig = humanTts.signature('hello world');
    var guid = humanTts.mj.hash(sig);
    expect(sig).toEqual({
      api: 'human-tts',
      apiVersion: 'v1',
      audioFormat: 'mp3',
      voice: 'sujato_pli',
      language: 'pli',
      prosody: {
        rate: '0%',
      },
      text: 'hello world',
      guid,
    });
  });
  it('segmentSSML(text) returns SSML', () => {
    var humanTts = new HumanTts({
      language: 'pli',
      localeIPA: 'pli',
      stripQuotes: true,
    });
    expect(humanTts.segmentSSML('281')).toEqual(['281']);
    expect(humanTts.isNumber('281–309')).toBe(true);
    expect(humanTts.segmentSSML('281–​309')).toEqual(['281–309']);
    expect(humanTts.segmentSSML('ye')).toEqual(['ye']);
    expect(humanTts.segmentSSML('"Bhadante"ti')).toEqual(['Bhadante ti']);
    expect(humanTts.segmentSSML('mūlaṃ')).toEqual(['mūlaṃ']);
  });
  it('synthesizeSSML(ssml) returns noAudio sound file', async () => {
    var noAudioPath = path.join(SRC, 'data', 'no_audio.mp3');
    var humanTts = new HumanTts();
    humanTts.logLevel = 'error';
    var segments = [
      `<phoneme alphabet="ipa" ph="səˈpriːm"></phoneme>`,
      `full enlightenment, I say.`,
    ];
    var ssml = segments.join(' ');
    var result = await humanTts.synthesizeSSML(ssml);
    expect(result).toHaveProperty('file');
    expect(result).toHaveProperty('signature');
    expect(result).toHaveProperty('hits');
    expect(result).toHaveProperty('misses');
    expect(result.file).toBe(noAudioPath);
  });
  it('synthesizeSegment(ssml) returns SN2.3:1.1 sound file', async () => {
    var humanTts = new HumanTts();
    var segment = {
      en: 'no-english',
      pli: 'no-pali',
      scid: 'sn2.3:1.1',
    };
    var guid = 'b90220f1e99fb739068bc6fe4ddec005';
    var storePath = tmp.tmpNameSync();
    var downloadDir = tmp.tmpNameSync();
    var scAudio = new SCAudio({
      downloadDir,
    });
    var altTts = undefined;
    var language = 'en';
    var soundStore = new SoundStore({
      storePath,
    });
    var translator = 'sujato';
    var usage = 'recite';
    var volume = undefined;
    var downloadAudio = true;
    var opts = Object.assign(
      {},
      {
        segment,
        scAudio,
        altTts,
        language,
        soundStore,
        translator,
        usage,
        volume,
        downloadAudio,
      }
    );
    var result = await humanTts.synthesizeSegment(opts);
    expect(result.signature.guid).toBe(guid);
    expect(result.signature.scAudioVersion).toBe('3');
    var guidDir = guid.substring(0, 2);
    var reFile = new RegExp(
      `.*/${guidDir}/${guid}${soundStore.audioSuffix}$`
    );
    expect(result.file).toMatch(reFile);
    expect(fs.existsSync(result.file)).toBe(true);
    var stats = fs.statSync(result.file);
    expect(stats.size).toBeGreaterThan(27000);
    expect(stats.size).toBeLessThan(29000);
  });
});
