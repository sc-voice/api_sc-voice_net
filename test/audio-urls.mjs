import { describe, it, expect } from '@sc-voice/vitest';
import { logger } from 'log-instance';
import AudioUrls from '../src/audio-urls.cjs';
import SCAudio from '../src/sc-audio.cjs';

logger.logLevel = 'warn';

const TEST_ROOT =
  `https://${SCAudio.SC_OPUS_STORE}.sgp1.cdn.digitaloceanspaces.com`;

describe('audio-urls', () => {
  it('AudioUrls(...) creates an audio url map', () => {
    var audio = new AudioUrls();
    var sources = audio.sources;
    expect(sources[0].extension).toBe('webm');
    expect(sources[0].rootUrl).toBe(TEST_ROOT);
    expect(sources[0].speaker).toBe('sujato');
    expect(sources[0].lang).toBe('pli');
    expect(sources[0].author).toBe('mahasangiti');
    expect(sources.length).toBe(3);

    var sources = [
      {
        rootUrl: 'testRoot',
        extension: 'testExtension',
        author: 'testAuthor',
        speaker: 'testSpeaker',
        lang: 'testLang',
      },
    ];
    var audio = new AudioUrls({
      sources,
    });
    var sources = audio.sources;
    expect(audio.sources).toEqual(sources);
  });
  it('buildUrl(opts) returns audio url ', () => {
    var audio = new AudioUrls();
    expect(audio.buildUrl('sn1.23')).toBe(
      `${TEST_ROOT}/pli/sn/sn1/sn1.23-pli-mahasangiti-sujato.webm`
    );

    var audio = new AudioUrls({
      sources: [
        {
          rootUrl: 'testRoot',
          extension: 'testExtension',
          author: 'testAuthor',
          speaker: 'testSpeaker',
          lang: 'testLang',
        },
      ],
    });
    var opts = {
      suttaId: 'sn1.1',
    };
    expect(audio.buildUrl(opts)).toBe(
      [
        'testRoot',
        'testLang',
        'sn',
        'sn1',
        'sn1.1-testLang-testAuthor-testSpeaker.testExtension',
      ].join('/')
    );

    var opts = {
      suttaId: 'sn1.1',
      rootUrl: 'xRoot',
      author: 'xAuthor',
      speaker: 'xSpeaker',
      extension: 'xExtension',
      lang: 'xLang',
    };
    expect(audio.buildUrl(opts)).toBe(
      `xRoot/xLang/sn/sn1/sn1.1-xLang-xAuthor-xSpeaker.xExtension`
    );
  });
  it('audioUrl(...) returns verified audio url', async () => {
    var audio = new AudioUrls();

    var result = await audio.audioUrl('sn1.23');
    expect(result).toEqual({
      url: `${TEST_ROOT}/pli/sn/sn1/sn1.23-pli-mahasangiti-sujato.webm`,
      statusCode: 200,
    });

    var rootUrl = TEST_ROOT.replace(/https/, 'http');
    var result = await audio.audioUrl({
      rootUrl,
      suttaId: 'sn1.23',
    });
    expect(result).toEqual({
      url:
        TEST_ROOT.replace('https', 'http') +
        '/pli/sn/sn1/sn1.23-pli-mahasangiti-sujato.webm',
      statusCode: 200,
    });
  });
  it('audioUrl(...) handles bad url', async () => {
    var audio = new AudioUrls();

    var result = await audio.audioUrl('badsutta');
    expect(result).toEqual({
      url: null,
      urlUnavailable:
        TEST_ROOT +
        '/pli/badsutta/badsutta/badsutta-pli-mahasangiti-sujato.webm',
      statusCode: 404,
    });
  });
  it('audioUrl(...) handle bad host null', async () => {
    let rootUrl = 'https://nosuchdomain.google.com';
    var audio = new AudioUrls({ sources: [ { rootUrl }, ], });
    audio.logLevel = 'error';
    var result = await audio.audioUrl('sn1.23');
    expect(result).toEqual({
      url: null,
      urlUnavailable: [
        rootUrl,
        'noLang',
        'sn',
        'sn1',
        'sn1.23-noLang-noAuthor-noSpeaker.noExtension',
      ].join('/'),
    });
  });
  it('sourceUrls(...) returns verified audio urls', async () => {
    var audio = new AudioUrls();

    var result = await audio.sourceUrls('sn1.23');
    expect(
      result.map((r) => r.source)
    ).toEqual(
      ['Bhikkhu Sujato (Pali)', 'Bhikkhu Sujato (English)']
    );
    expect(
      result.map((r) => r.supported)
    ).toEqual(
      [true, true]
    );

    var result = await audio.sourceUrls('MN1');
    expect(
      result.map((r) => r.source)
    ).toEqual(
      ['Other audio sources']
    );
    expect(
      result.map((r) => r.supported)
    ).toEqual(
      [false]
    );
  });
});
