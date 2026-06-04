import { describe, it, expect } from '@sc-voice/vitest';
import should from 'should';
import fs from 'fs';
import { logger } from 'log-instance';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

logger.logLevel = 'error';
const { ScApi } = require('suttacentral-api');
const Playlist = require('../src/playlist.cjs');
const Sutta = require('../src/sutta.cjs');
const SuttaFactory = require('../src/sutta-factory.cjs');
const SuttaStore = require('../src/sutta-store.cjs');
const Voice = require('../src/voice.cjs');
const Task = require('../src/task.cjs');

var suttaFactory;
async function testSuttaFactory() {
  if (!suttaFactory) {
    let suttaStore = await new SuttaStore().initialize();
    let scApi = await new ScApi().initialize();
    suttaFactory = await new SuttaFactory({
      suttaLoader: (opts) => suttaStore.loadBilaraSutta(opts),
      scApi,
    }).initialize();
  }
  return suttaFactory;
}

var suttas = [
  new Sutta({
    sutta_uid: 'test1',
    author_uid: 'test-author1',
    sections: [
      {
        segments: [
          {
            scid: 'test1:1.1',
            pli: 'test1:pli1.1',
            en: 'test1:en1.1',
            de: 'test1:de1.1',
          },
          {
            scid: 'test1:1.2',
            pli: 'test1:pli1.2',
            de: 'test1:de1.2',
          },
        ],
      },
    ],
  }),
  new Sutta({
    sutta_uid: 'test2',
    author_uid: 'test-author2',
    sections: [
      {
        segments: [
          {
            scid: 'test2:1.1',
            pli: 'test2:pli1.1',
            en: 'test2:en1.1',
            de: 'test2:de1.2',
          },
          {
            scid: 'test2:1.2',
            pli: 'test2:pli1.2',
          },
        ],
      },
    ],
  }),
  new Sutta({
    sutta_uid: 'test3',
    author_uid: 'test-author3',
    sections: [
      {
        segments: [
          {
            scid: 'test3:1.1',
            pli: 'Taṃ kissa hetu?',
            en: 'Why is that?',
          },
        ],
      },
      {
        segments: [
          {
            scid: 'test3:2.1',
            pli: 'abhikkantaṃ, bhante',
            en: 'Excellent, sir!',
          },
          {
            scid: 'test3:2.2',
            pli: 'Nandī dukkhassa mūlan\'ti',
            en: 'Delight is the root of suffering',
          },
        ],
      },
    ],
  }),
];

describe('playlist', () => {
  it('playlist() constructs a playlist', () => {
    var pl = new Playlist();
    should(pl).instanceOf(Playlist);
    expect(pl.languages).toEqual(['pli', 'en']);
    expect(pl.tracks).toEqual([]);
    expect(pl.maxSeconds).toBe(0);
  });
  it('playlist(opts) constructs custom playlist', () => {
    var pl = new Playlist({
      languages: ['de', 'fr'],
    });
    should(pl).instanceOf(Playlist);
    expect(pl.languages).toEqual(['de', 'fr']);
    expect(pl.tracks).toEqual([]);
    expect(pl.maxSeconds).toBe(0);
  });
  it('addSutta(sutta) adds a sutta', () => {
    var pl = new Playlist();

    pl.addSutta(suttas[0]);
    expect(pl.tracks.length).toBe(1);
    expect(
      pl.tracks.map((s) => s.sutta_uid)
    ).toEqual(
      ['test1']
    );
    expect(pl.author_uids()).toEqual(['test-author1']);

    pl.addSutta(suttas[1]);
    expect(pl.tracks.length).toBe(2);
    expect(
      pl.tracks.map((s) => s.sutta_uid)
    ).toEqual(
      ['test1', 'test2']
    );
    expect(pl.author_uids()).toEqual(['test-author1', 'test-author2']);
  });
  it('stats() adds a sutta', () => {
    var pl = new Playlist({
      languages: ['de', 'pli'],
    });

    expect(pl.stats()).toEqual({
      tracks: 0,
      duration: 0,
      chars: {
        de: 0,
        pli: 0,
      },
      segments: {
        de: 0,
        pli: 0,
      },
    });

    pl.addSutta(suttas[0]);
    expect(pl.stats()).toEqual({
      tracks: 1,
      chars: {
        de: 22,
        pli: 24,
      },
      duration: 5,
      segments: {
        de: 2,
        pli: 2,
      },
    });

    pl.addSutta(suttas[1]);
    expect(pl.stats()).toEqual({
      tracks: 2,
      chars: {
        de: 33,
        pli: 48,
      },
      duration: 8,
      segments: {
        de: 3,
        pli: 4,
      },
    });
  });
  it('addSutta(sutta) adds dn33', async () => {
    var factory = await testSuttaFactory();
    var sutta = await factory.loadSutta('dn33');
    var pl = new Playlist();
    pl.addSutta(sutta);
    let plstats = pl.stats();
    expect(plstats.tracks).toBe(12);
    expect(plstats.chars.pli).toBe(78866);
    expect(plstats.chars.en).toBeGreaterThan(84800);
    expect(plstats.chars.en).toBeLessThan(86000);
    expect(plstats.segments.en).toBe(1129);
    expect(plstats.segments.pli).toBe(1167);
    expect(plstats.duration).toBeGreaterThan(14500);
    expect(plstats.duration).toBeLessThan(14600);
  });
  it('addTrack(sutta_uid, segmentsOrMessage) adds a track', async () => {
    var pl = new Playlist();
    pl.addTrack('error123', 'this is a test');
    expect(pl.stats()).toEqual({
      tracks: 1,
      chars: {
        en: 14,
        pli: 0,
      },
      segments: {
        en: 1,
        pli: 0,
      },
      duration: 2,
    });
  });
  it('speak(opts) adds voice audio', async () => {
    var factory = await testSuttaFactory();
    var sutta = await factory.loadSutta('an1.31-40');
    var voices = {
      pli: Voice.createVoice({
        name: 'aditi',
        usage: 'recite',
        language: 'hi-IN',
        localeIPA: 'pli',
        stripNumbers: true,
        stripQuotes: true,
      }),
      en: Voice.createVoice({ name: 'amy' }),
    };
    var pl = new Playlist({
      languages: ['pli', 'en'],
    });
    pl.addSutta(sutta);
    var result = await pl.speak({
      voices,
      volume: 'test-playlist',
    });
    expect(result.signature.guid).toMatch(/88edc5f59ba4cfc7d8864e44944c050e/);
  });
  it('speak(opts) adds break between suttas', async () => {
    var factory = await testSuttaFactory();
    var suttas = [
      await factory.loadSutta('thig2.6'),
      await factory.loadSutta('thig2.7'),
    ];
    var voices = {
      pli: Voice.createVoice({
        name: 'aditi',
        usage: 'recite',
        language: 'hi-IN',
        localeIPA: 'pli',
        stripNumbers: true,
        stripQuotes: true,
      }),
      en: Voice.createVoice({ name: 'amy' }),
    };
    var pl = new Playlist({
      languages: ['en'],
    });
    suttas.forEach((s) => pl.addSutta(s));
    var result = await pl.speak({
      voices,
      volume: 'test-playlist',
    });
    expect(result.signature.guid).toMatch(/f497ee752fd1bb6fdbf578f1ec4f8da6/);
  });
  it('speak(opts) creates opus audio file', async () => {
    var factory = await testSuttaFactory();
    var sutta = await factory.loadSutta('sn2.3');
    var voiceTrans = Voice.createVoice({ name: 'matthew' });
    var voices = { en: voiceTrans };
    var pl = new Playlist({
      languages: ['en'],
    });
    pl.addSutta(sutta);
    var result = await pl.speak({
      voices,
      volume: 'test-playlist',
    });
    expect(result.signature.guid).toMatch(/e0d8439534fa53f1a81654838e167d00/);
  });
  it('speak(opts) => task progress', async () => {
    let factory = await testSuttaFactory();
    let pattern = 'thig1.1/en/soma';
    let sutta = await factory.loadSutta(pattern);
    let voiceTrans = Voice.createVoice({ name: 'matthew' });
    let voices = { en: voiceTrans };
    let comment = `test ${pattern}`;
    let pl = new Playlist({
      languages: ['en'],
    });
    pl.addSutta(sutta);
    let task = new Task({
      name: `test playlist ${pattern}`
    });
    task.start(`task ${pattern}`);
    let promise = pl.speak({
      voices,
      volume: 'test-playlist',
      comment,
      task,
    });
    let nSegments = sutta.segments.length;
    expect(task.actionsTotal).toBe(nSegments+2);
    expect(task.actionsDone).toBe(0);

    let result = await promise;
    expect(task.actionsDone).toBe(task.actionsTotal);
    expect(result.signature.guid).toMatch(/9240cfb305646c1fd0d571b236fbc81a/);
  });
});
