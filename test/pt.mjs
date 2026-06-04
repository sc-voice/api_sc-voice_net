import { describe, it, expect } from '@sc-voice/vitest';
import should from 'should';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { ScApi } = require('suttacentral-api');
const Polly = require('../src/polly.cjs');
const SuttaFactory = require('../src/sutta-factory.cjs');
const Voice = require('../src/voice.cjs');

const ELLIPSIS = '…';
const ELLIPSIS_BREAK = '<break time="1.000s"/>';
const BREAK = `<break time="0.001s"/>`;

function phoneme(ph, word) {
  return `<phoneme alphabet="ipa" ph="${ph}">${word}</phoneme>${BREAK}`;
}

describe('pt', () => {
  it('loadSutta() loads an10.2/pt/beisert', async () => {
    var scApi = await new ScApi().initialize();
    var factory = await new SuttaFactory({ scApi }).initialize();
    var sutta = await factory.loadSutta({ scid: 'an10.2', language: 'pt' });
    var sections = sutta.sections;
    expect(sections[0].segments[1]).toEqual({
      scid: 'an10.2:0.2',
      pli: 'Cetanākaraṇīyasutta',
      pt: 'Intenção Correta',
    });
  });
  it('createVoice(voiceName) returns a default voice', () => {
    var voice = Voice.createVoice('ricardo');
    should(voice).instanceOf(Voice);
    expect(voice.locale).toBe('pt-BR');
    expect(voice.name).toBe('Ricardo');
    expect(voice.usage).toBe('recite');
    expect(voice.localeIPA).toBe('pli');
    expect(voice.stripNumbers).toBe(false);
    expect(voice.stripQuotes).toBe(false);
    expect(voice.altTts).toBe(undefined);
  });
  it('wordSSML(word) Ricardo SSML text for word', () => {
    var voice = Voice.createVoice('ricardo').services.recite;
    var ssml = voice.wordSSML('o');
    expect(ssml).toMatch(/ph="o"/);
    var ssml = voice.wordSSML('arahant');
    expect(ssml).toMatch(/ph="'a.ɾa.han.t͡ʃ"/);
    var ssml = voice.wordSSML('êxtase');
    expect(ssml).toMatch(/ph="'es.sta.se"/);
  });
});
