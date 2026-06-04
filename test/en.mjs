import { describe, it, expect } from '@sc-voice/vitest';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { ScApi } = require('suttacentral-api');
const { English } = require('scv-bilara');
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

describe('en', () => {
  it('Amy speaks', async () => {
    var voice = Voice.createVoice({ name: 'Amy' });
    expect(voice.name).toBe('Amy');
    expect(voice.locale).toBe('en-GB');
    var recite = voice.services.recite;
    await English.wordSet();
    expect(recite.wordSSML('unburdensome')).toBe('unburdensome');
    expect(recite.wordSSML('hello')).toBe('hello');
  });
});
