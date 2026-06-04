import { describe, it, expect } from '@sc-voice/vitest';
import should from 'should';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import tmp from 'tmp';
import { logger } from 'log-instance';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const Playlist = require('../src/playlist.cjs');
const SCAudio = require('../src/sc-audio.cjs');
const SoundStore = require('../src/sound-store.cjs');
const Sutta = require('../src/sutta.cjs');
const SuttaStore = require('../src/sutta-store.cjs');

const LOCAL = path.join(__dirname, '../local');
const soundStore = new SoundStore();
const SCA = new SCAudio();

describe('sc-audio', () => {
  it('constructor', () => {
    // Default
    const sca = SCA;
    should(sca).properties({
      reader: 'sujato',
      author: 'sujato',
      language: 'en',
      urlRaw: `https://raw.githubusercontent.com/sujato/sc-audio/master/flac`,
      urlMap: `https://${SCAudio.SC_OPUS_STORE}.sgp1.digitaloceanspaces.com`,
      urlSegments: `https://${SCAudio.SC_OPUS_STORE}.sgp1.cdn.digitaloceanspaces.com`,
      extSeg: '.webm',
      extRaw: '.flac',
      downloadDir: path.join(LOCAL, 'sc-audio'),
    });

    // Custom
    const reader = 'test-reader';
    const author = 'test-author';
    const language = 'pli';
    const urlRaw = 'test-raw';
    const props = {
      reader,
      author,
      language,
      urlRaw,
    };
    const sca2 = new SCAudio(props);
    should(sca2).properties(props);
  });

  it('rawUrl(suid...)', () => {
    const sca = SCA;
    should(sca.rawUrl('SN1.43')).equal(
      'https://raw.githubusercontent.com/sujato/sc-audio/master/flac' +
        '/en/sn/sn1/sn1.43-en-sujato-sujato.flac'
    );
  });

  it('aeneasMapUrl(suid...)', () => {
    const sca = SCA;
    should(sca.aeneasMapUrl('sn1.09')).equal(
      `https://${SCAudio.SC_OPUS_STORE}.sgp1.digitaloceanspaces.com` +
        '/en/sn/sn1/sn1.9-en-sujato-sujato.json'
    );
  });

  it('segmentUrl(suidseg...)', () => {
    const sca = SCA;
    should(sca.segmentUrl('SN1.09:2.1', 'pli')).equal(
      `https://${SCAudio.SC_OPUS_STORE}.sgp1.cdn.digitaloceanspaces.com` +
        '/pli/sn/sn1/sn1.9/sn1.9_2.1.webm'
    );
    should(sca.segmentUrl('SN1.58:2.1', 'pli')).equal(
      `https://${SCAudio.SC_OPUS_STORE}.sgp1.cdn.digitaloceanspaces.com` +
        '/pli/sn/sn1/sn1.58/sn1.58_2.1.webm'
    );

    const sca2 = new SCAudio({
      language: 'pli',
    });
    should(sca2.segmentUrl('SN1.58:2.1')).equal(
      `https://${SCAudio.SC_OPUS_STORE}.sgp1.cdn.digitaloceanspaces.com` +
        '/pli/sn/sn1/sn1.58/sn1.58_2.1.webm'
    );
  });

  it('aeneasMap(suid...) returns aeneas map JSON', async () => {
    const sca = SCA;
    const resMap = await sca.aeneasMap('sn1.09');
    should.deepEqual(Object.keys(resMap).sort(), ['fragments'].sort());
    const fragments = resMap.fragments;
    should.deepEqual(fragments[7], {
      begin: '42.832',
      end: '47.932',
      children: [],
      id: 'sn1.9:3.1',
      language: 'en',
      lines: ['Having given up conceit, serene within oneself, '],
    });
  });

  it('catalog(opts) returns sutta catalog', async () => {
    const sca = SCA;
    const response = await sca.catalog();
    fs.writeFileSync(
      '/tmp/sca_catalog',
      JSON.stringify(response, null, 2)
    );
    const aeneasMaps = response.aeneasMaps;
    const suids = Object.keys(aeneasMaps);
    should(suids.length).above(20);
    should(suids.length).below(5000);
    should(aeneasMaps['sn1.1']).properties(['pli', 'en']);
    should(aeneasMaps['sn1.55']).properties(['pli', 'en']);
    should(aeneasMaps['sn2.20']).properties(['pli', 'en']);

    // are the suttas really there?
    const suid = 'sn1.2';
    const entry = aeneasMaps[suid];
    should.deepEqual(entry, {
      pli: 'json/sn1.02-pli-mahasangiti-sujato.json',
      en: 'json/sn1.02-en-sujato-sujato.json',
    });
    const resMap = await sca.aeneasMap(
      suid,
      'pli',
      'mahasangiti',
      'sujato'
    );
    should(resMap.fragments.length).equal(11);
    should(resMap.fragments[0].lines[0]).match(/Nimokkhasutta/);
  });

  it('TESTTESTdownloadSegmentAudio() sn1.9:1.1', async () => {
    const language = 'en';
    const reader = 'sujato';
    const suttaSegId = 'sn1.9:1.1';
    const author = 'sujato';
    const downloadDir = tmp.tmpNameSync();
    should(fs.existsSync(downloadDir)).equal(false);
    const sca = new SCAudio({
      downloadDir,
    });
    should(sca.downloadDir).equal(downloadDir);
    should(fs.existsSync(downloadDir)).equal(true);
    const audioPath = path.join(downloadDir, 'sn1.9_1.1.mp3');

    // english
    const res = await sca.downloadSegmentAudio({
      suttaSegId,
    });
    const url = [
      `https://${SCAudio.SC_OPUS_STORE}.sgp1.cdn.digitaloceanspaces.com`,
      'en',
      'sn/sn1/sn1.9/sn1.9_1.1.webm',
    ].join('/');
    should.deepEqual(res, {
      language: 'en',
      reader,
      suttaSegId,
      audioPath,
      author,
      contentType: 'video/webm',
      url,
    });

    should(fs.existsSync(audioPath)).equal(true);
    const stats = fs.statSync(audioPath);
    should(stats.size).above(28000).below(29000);

    // Pali
    const url2 = [
      `https://${SCAudio.SC_OPUS_STORE}.sgp1.cdn.digitaloceanspaces.com`,
      'pli',
      'sn/sn1/sn1.9/sn1.9_1.1.webm',
    ].join('/');
    const sca2 = new SCAudio();
    const res2 = await sca2.downloadSegmentAudio({
      suttaSegId,
      language: 'pli',
      audioPath,
    });
    should.deepEqual(res2, {
      language: 'pli',
      reader,
      suttaSegId,
      audioPath,
      author,
      contentType: 'video/webm',
      url: url2,
    });

    await new Promise(resolve => setTimeout(resolve, 1000));
    should(fs.existsSync(audioPath)).equal(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const stats2 = fs.statSync(audioPath);
    should(stats2.size).above(10000).below(29000);
  });

  it('TESTTESTdownloadSegmentAudio() sn1.9:1.1 #2', async () => {
    const language = 'en';
    const reader = 'sujato';
    const suttaSegId = 'sn1.9:1.1';
    const author = 'sujato';
    const downloadDir = tmp.tmpNameSync();
    should(fs.existsSync(downloadDir)).equal(false);
    const sca = new SCAudio({
      downloadDir,
    });
    should(sca.downloadDir).equal(downloadDir);
    should(fs.existsSync(downloadDir)).equal(true);
    const audioPath = path.join(downloadDir, 'sn1.9_1.1.mp3');
    const opus = SCAudio.SC_OPUS_STORE;

    // english
    const res = await sca.downloadSegmentAudio({
      suttaSegId,
    });
    const url = [
      `https://${opus}.sgp1.cdn.digitaloceanspaces.com`,
      'en',
      'sn/sn1/sn1.9/sn1.9_1.1.webm',
    ].join('/');
    should.deepEqual(res, {
      language: 'en',
      reader,
      suttaSegId,
      audioPath,
      author,
      contentType: 'video/webm',
      url,
    });
    should(fs.existsSync(audioPath)).equal(true);
    const stats = fs.statSync(audioPath);
    should(stats.size).above(28000).below(29000);

    // Pali
    const url2 = [
      `https://${opus}.sgp1.cdn.digitaloceanspaces.com`,
      'pli',
      'sn/sn1/sn1.9/sn1.9_1.1.webm',
    ].join('/');
    const sca2 = new SCAudio();
    const res2 = await sca2.downloadSegmentAudio({
      suttaSegId,
      language: 'pli',
      audioPath,
    });
    should.deepEqual(res2, {
      language: 'pli',
      reader,
      suttaSegId,
      audioPath,
      author,
      contentType: 'video/webm',
      url: url2,
    });

    await new Promise(resolve => setTimeout(resolve, 1000));
    should(fs.existsSync(audioPath)).equal(true);
    const stats2 = fs.statSync(audioPath);
    should(stats2.size).above(12000).below(29000);
  });

  it('TESTTESTdownloadSegmentAudio() sn2.3:1.1', async () => {
    const language = 'en';
    const reader = 'sujato';
    const suttaSegId = 'sn2.3:1.1';
    const author = 'sujato';
    const downloadDir = tmp.tmpNameSync();
    should(fs.existsSync(downloadDir)).equal(false);
    const sca = new SCAudio({
      downloadDir,
    });
    should(sca.downloadDir).equal(downloadDir);
    should(fs.existsSync(downloadDir)).equal(true);
    const audioPath = path.join(downloadDir, 'sn2.3_1.1.mp3');

    // english
    const res = await sca.downloadSegmentAudio({
      suttaSegId,
    });
    const url = [
      `https://${SCAudio.SC_OPUS_STORE}.sgp1.cdn.digitaloceanspaces.com`,
      'en',
      'sn/sn2/sn2.3/sn2.3_1.1.webm',
    ].join('/');
    should.deepEqual(res, {
      language: 'en',
      reader,
      suttaSegId,
      audioPath,
      author,
      contentType: 'video/webm',
      url,
    });
    should(fs.existsSync(audioPath)).equal(true);
    const stats = fs.statSync(audioPath);
    should(stats.size).above(27000).below(29000);

    // Pali
    const url2 = [
      `https://${SCAudio.SC_OPUS_STORE}.sgp1.cdn.digitaloceanspaces.com`,
      'pli',
      'sn/sn2/sn2.3/sn2.3_1.1.webm',
    ].join('/');
    const sca2 = new SCAudio();
    const res2 = await sca2.downloadSegmentAudio({
      suttaSegId,
      language: 'pli',
      audioPath,
    });
    should.deepEqual(res2, {
      language: 'pli',
      reader,
      suttaSegId,
      audioPath,
      author,
      contentType: 'video/webm',
      url: url2,
    });

    await new Promise(resolve => setTimeout(resolve, 1000));
    should(fs.existsSync(audioPath)).equal(true);
    const stats2 = fs.statSync(audioPath);
    should(stats2.size).above(3400).below(34000);
  });

  it('cacheSuttaAudio(opts) populates cache with segment audio', async () => {
    const sca = SCA;
    const suid = 'sn1.09';
    const opts = {
      suid,
      suttaStore: SuttaStore.suttaStore,
      soundStore,
    };
    await new Promise((r) => setTimeout(() => r(), 500));
    await SuttaStore.suttaStore.initialize();
    const res = await sca.cacheSuttaAudio(opts);
    should(res).properties({
      suid,
    });
  });
});
