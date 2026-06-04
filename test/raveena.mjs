import { describe, it, expect } from '@sc-voice/vitest';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const Polly = require('../src/polly.cjs');
const Voice = require('../src/voice.cjs');

const RAVEENA_OPTS = {
  name: 'Raveena',
  usage: 'recite',
};
const syllableVowels = undefined;
const syllabifyLength = undefined;

var cache = true;
const BREAK = '<break time="0.001s"/>';

function phoneme(ph, text) {
  return new RegExp(
    `<phoneme alphabet="ipa" ph="${ph}">${text}</phoneme>`);
}

function testPhoneme(recite, ph, text) {
  var ssml = recite.segmentSSML(text)[0];
  expect(ssml).toMatch(phoneme(ph, text));
}

describe('raveena', () => {
  it('createVoice() creates Raveena', () => {
    var raveena = Voice.createVoice('raveena');
    expect(raveena.name).toBe('Raveena');
    expect(raveena.locale).toBe('en-IN');
    expect(raveena.localeIPA).toBe('en-IN');
    expect(raveena.maxSegment).toBe(undefined);
    expect(raveena.fullStopComma).toBe(undefined);
    expect(raveena.syllableVowels).toBe(syllableVowels);
    expect(raveena.syllabifyLength).toBe(syllabifyLength);
    expect(!!raveena.customWords).toBe(true);

    var raveena = Voice.createVoice(RAVEENA_OPTS);
    expect(raveena.name).toBe('Raveena');
    expect(raveena.locale).toBe('en-IN');
    expect(raveena.localeIPA).toBe('en-IN');
    expect(raveena.maxSegment).toBe(undefined);
    expect(raveena.fullStopComma).toBe(undefined);
    expect(raveena.syllableVowels).toBe(syllableVowels);
    expect(raveena.syllabifyLength).toBe(syllabifyLength);

    var recite = raveena.services['recite'];
    expect(recite.fullStopComma).toBe(undefined);
    expect(recite.maxSegment).toBe(1000);
    expect(raveena.syllableVowels).toBe(syllableVowels);
    expect(raveena.syllabifyLength).toBe(syllabifyLength);
  });
  it('segmentSSML(text) returns SSML', () => {
    var raveena = Voice.createVoice(RAVEENA_OPTS);
    var recite = raveena.services['recite'];

    testPhoneme(recite, 'dɛtat͡ʃd', 'detached');
  });
});
