import { describe, it, expect } from '@sc-voice/vitest';
import should from 'should';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { logger } = require('log-instance');
const logLevel = logger.logLevel = 'warn';
const { ScApi, SuttaCentralId } = require('suttacentral-api');
const Sutta = require('../src/sutta.cjs');
const SuttaStore = require('../src/sutta-store.cjs');
const SuttaFactory = require('../src/sutta-factory.cjs');
const SoundStore = require('../src/sound-store.cjs');
const Voice = require('../src/voice.cjs');
const Words = require('../src/words.cjs');

const LOCAL = path.join(__dirname, '../local');
const SC = path.join(LOCAL, 'sc');

var suttaStore = new SuttaStore({ logLevel });

describe('mn1', () => {
  it('loadSutta(scid) parses mn1/bodhi', async () => {
    var scApi = await new ScApi().initialize();
    var factory = new SuttaFactory({
      scApi,
      logLevel,
    });
    var sutta = await factory.loadSutta({
      scid: 'mn1',
      translator: 'bodhi',
      language: 'en',
    });
    expect(Object.keys(sutta).sort()).toEqual(
      [
        'translation',
        'suttaCode',
        'sutta_uid',
        'author_uid',
        'sections',
        'support',
        'suttaplex',
        'lang',
        'author',
        'titles',
      ].sort()
    );
    expect(sutta.suttaCode).toBe('mn1/en/bodhi');
    expect(sutta.support.value).toBe('Legacy');
    expect(sutta.suttaplex).toMatchObject({
      type: 'leaf',
      root_lang: 'pli',
    });
    expect(sutta.suttaplex.translated_title).toMatch(/The Root of All Things/);
  });
  it('speak() generates mn1 sounds', async () => {
    console.log(`TODO`, __filename);
    return;
  });
});
