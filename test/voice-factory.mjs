import { describe, it, expect } from '@sc-voice/vitest';
import should from 'should';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import { logger } from 'log-instance';

logger.logLevel = 'error';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HumanTts = require('../src/human-tts.cjs');
const Polly = require('../src/polly.cjs');
const SCAudio = require('../src/sc-audio.cjs');
const SoundStore = require('../src/sound-store.cjs');
const Voice = require('../src/voice.cjs');
const VoiceFactory = require('../src/voice-factory.cjs');

describe('voice-factory', () => {
  it('default ctor', () => {
    const vf = new VoiceFactory();
    should(vf.soundStore).instanceOf(SoundStore);
    should(vf.scAudio).instanceOf(SCAudio);
    should(vf.usage).equal('recite');
    should(vf.audioSuffix).equal('.mp3');
    should(vf.audioFormat).equal('mp3');
    should(vf.localeIPA).equal('pli');
  });

  it('custom ctor', () => {
    const soundStore = new SoundStore();
    const scAudio = new SCAudio();
    const usage = 'test-usage';
    const audioSuffix = 'test-suffix';
    const audioFormat = 'test-format';
    const localeIPA = 'test-locale';
    const opts = {
      soundStore,
      scAudio,
      usage,
      audioSuffix,
      audioFormat,
      localeIPA,
    };
    const vf = new VoiceFactory(opts);
    should(vf).properties(opts);
  });

  it("voiceOfName('sujato_en') => sujato_en", () => {
    const name = 'sujato_en';
    const vf = new VoiceFactory();
    const voice = vf.voiceOfName(name);
    should(voice.name).equal(name);
    should(voice.usage).equal('recite');
    const tts = voice.services[voice.usage];
    should(tts).instanceOf(HumanTts);
    should(tts.soundStore).instanceOf(SoundStore);
    should(tts.audioSuffix).equal('.mp3');
    should(tts.audioFormat).equal('mp3');
    should(tts.localeIPA).equal('pli');
    should(tts.scAudio).instanceOf(SCAudio);
  });

  it("voiceOfName('sujato_pli') => sujato_pli", () => {
    const name = 'sujato_pli';
    const vf = new VoiceFactory();
    const voice = vf.voiceOfName(name);
    should(voice.name).equal(name);
    should(voice.usage).equal('recite');
    const tts = voice.services[voice.usage];
    should(tts).instanceOf(HumanTts);
    should(tts.soundStore).instanceOf(SoundStore);
    should(tts.audioSuffix).equal('.mp3');
    should(tts.audioFormat).equal('mp3');
    should(tts.localeIPA).equal('pli');
    should(tts.scAudio).instanceOf(SCAudio);
  });

  it("voiceOfName('Amy') => Amy", () => {
    const name = 'Amy';
    const vf = new VoiceFactory();
    const voice = vf.voiceOfName(name);
    should(voice.name).equal(name);
    should(voice.usage).equal('recite');
    const tts = voice.services[voice.usage];
    should(tts).instanceOf(Polly);
    should(tts.soundStore).instanceOf(SoundStore);
    should(tts.audioSuffix).equal('.mp3');
    should(tts.audioFormat).equal('mp3');
    should(tts.localeIPA).equal('pli');
    should(tts.scAudio).equal(undefined);
  });
});
