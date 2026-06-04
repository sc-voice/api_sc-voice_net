import { describe, it, expect, afterEach } from '@sc-voice/vitest';
import should from 'should';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { logger, LogInstance } = require('log-instance');
const { SayAgain, AwsConfig } = require('say-again');
const S3Creds = require('../src/s3-creds.cjs');
const Polly = require('../src/polly.cjs');

const LOCAL = path.join(__dirname, '../local');
const AWS_CREDS_PATH = path.join(LOCAL, 'aws-creds.json');
const awsConfig = new AwsConfig(AWS_CREDS_PATH);
var winr;

var cache = true;
const BREAK = '<break time="0.001s"/>';

function phoneme(ph, text) {
  return (
    `<phoneme alphabet="ipa" ph="${ph}">${text}</phoneme>` + `${BREAK}`
  );
}

describe('polly', () => {
  afterEach(() => {
    if (winr) {
      winr();
      winr = undefined;
    }
  });

  it('constructor', () => {
    var polly = new Polly();
    expect(polly).toMatchObject({
      language: 'en-GB',
      voice: 'Amy',
      audioFormat: 'mp3',
      audioSuffix: '.mp3',
      prosody: {
        rate: '-20%',
      },
    });
    should(polly.logger).instanceOf(LogInstance);
    expect(polly.logger).toBe(logger);
  });
  it('signature(text) => TTS synthesis signature', () => {
    var polly = new Polly();
    expect(polly.language).toBe('en-GB');
    var sig = polly.signature('hello world');
    var guid = polly.mj.hash(sig);
    expect(sig).toEqual({
      api: 'aws-polly',
      apiVersion: 'v4',
      audioFormat: 'mp3',
      voice: 'Amy',
      language: 'en-GB',
      prosody: {
        rate: '-20%',
      },
      text: 'hello world',
      guid,
    });
  });
  it('segmentSSML(text) returns SSML', () => {
    var polly = new Polly({
      localeIPA: 'pli',
      stripQuotes: true,
    });
    expect(polly.segmentSSML('281')).toEqual(['281']);
    expect(polly.isNumber('281–309')).toBe(true);
    expect(polly.segmentSSML('281–​309')).toEqual(['281–309']);
    expect(polly.segmentSSML('ye')).toEqual([BREAK + phoneme('je', 'ye')]);
    expect(polly.segmentSSML('"Bhadante"ti')).toEqual([
      phoneme('bʰɐdɐnte', 'Bhadante') + ' ' + phoneme('tɪ', 'ti'),
    ]);
    expect(polly.segmentSSML('mūlaṃ')).toEqual([
      phoneme('mʊːlɐṃ', 'mūlaṃ'),
    ]);
  });
  it('synthesizeSSML(ssml) returns sound file', async () => {
    var s3Creds = new S3Creds({
      configPath: AWS_CREDS_PATH,
    });
    var sayAgain = new SayAgain(s3Creds.awsConfig);
    var polly = new Polly({ sayAgain });
    var segments = [
      `<phoneme alphabet="ipa" ph="səˈpriːm"></phoneme>`,
      `full enlightenment, I say.`,
    ];
    var ssml = segments.join(' ');
    var cache = false;
    var result = await polly.synthesizeSSML(ssml, { cache });
    expect(result).toHaveProperty('file');
    expect(result).toHaveProperty('signature');
    expect(result).toHaveProperty('hits');
    expect(result).toHaveProperty('misses');
    expect(fs.statSync(result.file).size).toBeGreaterThan(1000);
    var suffix = result.file.substring(result.file.length - 4);
    expect(suffix).toBe('.mp3');
  });
  it('synthesizeBreak(...) => sound file', async () => {
    var polly = new Polly({
      voice: 'Matthew',
      prosody: {},
      language: 'en-US',
      breaks: [0.001, 0.1, 1.5, 0.2, 0.3],
    });
    var result = await polly.synthesizeBreak(polly.SECTION_BREAK);
    expect(result.signature.guid).toMatch(
      /2571cb7f29a3c98d1899c49d2dd3b4e6/
    );

    var result = await polly.synthesizeBreak();
    expect(result.signature.guid).toMatch(
      /2571cb7f29a3c98d1899c49d2dd3b4e6/
    );
  });
  it('synthesizeText([text]) => sound file', async () => {
    var polly = new Polly();
    var text = [
      'Tomatoes are',
      'red.',
      'Tomatoes are red. Broccoli is green',
    ];
    var result = await polly.synthesizeText(text, { cache });
    expect(result).toHaveProperty('file');
    expect(result).toHaveProperty('hits');
    expect(result).toHaveProperty('misses');
    expect(result).toHaveProperty('signature');
    expect(result).toHaveProperty('cached');
    expect(result.signature.files.length).toBe(4);
    var storePath = polly.soundStore.storePath;
    var files = result.signature.files.map((f) => path.join(storePath, f));
    expect(fs.statSync(files[0]).size).toBeGreaterThan(1000);
    expect(fs.statSync(files[1]).size).toBeGreaterThan(1000);
    expect(fs.statSync(files[2]).size).toBeGreaterThan(1000);
    expect(fs.statSync(files[3]).size).toBeGreaterThan(1000);
    expect(fs.statSync(result.file).size).toBeGreaterThan(5000);
  });
});
