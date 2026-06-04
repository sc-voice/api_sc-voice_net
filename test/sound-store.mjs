import { describe, it, expect, afterEach } from '@sc-voice/vitest';
import should from 'should';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import { exec, execSync } from 'child_process';
import util from 'node:util';
import tmp from 'tmp';
import { MerkleJson } from 'merkle-json';
import { logger, LogInstance } from 'log-instance';
import { AwsConfig, SayAgain } from 'say-again';
import { FilePruner, GuidStore } from 'memo-again';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SoundStore = require('../src/sound-store.cjs');

const execPromise = util.promisify(exec);

const LOCAL = path.join(__dirname, '..', 'local');
let winr;
const mj = new MerkleJson();
logger.level = 'warn';
const storePath = tmp.tmpNameSync();
const TEST_SOUNDS = path.join(__dirname, 'data', 'sounds');

afterEach(() => {
  if (winr) {
    winr();
    winr = undefined;
  }
});

describe('sound-store', () => {
  it('default ctor', () => {
    const store = new SoundStore();
    should(store).instanceOf(SoundStore);
    should(store).instanceOf(GuidStore);
    should(fs.existsSync(store.storePath)).equal(true);
    should(store.storePath).equal(path.join(LOCAL, 'sounds'));
    should(store.type).equal('SoundStore');
    should(store.filePruner).instanceOf(FilePruner);
    should(store.storeName).equal('sounds');
    should(store.volume).equal('common');
    should(store.audioSuffix).equal('.mp3');
    should(store.audioFormat).equal('mp3');
    should(store.audioMIME).equal('audio/mp3');
    should(store.sayAgain).instanceOf(SayAgain);
    should(store.sayAgain.awsConfig.sayAgain.Bucket).equal(
      'say-again.sc-voice'
    );
  });

  it('custom ctor', async () => {
    const filePruner = new FilePruner({ root: TEST_SOUNDS });
    const loggerInstance = new LogInstance();
    const store = new SoundStore({
      audioFormat: 'ogg',
      storePath,
      filePruner,
      logger: loggerInstance,
    });
    should(store).instanceOf(SoundStore);
    should(store.filePruner).equal(filePruner);
    should(store).instanceOf(GuidStore);
    should(store.storePath).equal(storePath);
    should(store.type).equal('SoundStore');
    should(store.storeName).equal('sounds');
    should(fs.existsSync(store.storePath)).equal(true);
    should(store.audioSuffix).equal('.ogg');
    should(store.audioFormat).equal('ogg_vorbis');
    should(store.audioMIME).equal('audio/ogg');

    const sayAgain = await store.sayAgain;
    should(store.logger).equal(loggerInstance);
    should(store.sayAgain.logger).equal(store);
    store.info('store custom logger');
    should(loggerInstance.lastLog('info')).match(/store custom logger/);
    sayAgain.info('sayAgain custom logger');
    should(loggerInstance.lastLog('info')).match(/sayAgain custom logger/);
  });

  it('suttaVolumeName(...) returns SoundStore volume', () => {
    should(SoundStore.suttaVolumeName('a', 'b', 'c', 'd')).equal('a_b_c_d');
    should(SoundStore.suttaVolumeName('a1', 'b', 'c', 'd')).equal('a_b_c_d');
    should(SoundStore.suttaVolumeName('a1.1', 'b', 'c', 'd')).equal(
      'a_b_c_d'
    );
    should(SoundStore.suttaVolumeName('a1.2-5', 'b', 'c', 'd')).equal(
      'a_b_c_d'
    );
    should(SoundStore.suttaVolumeName('a1.2-5:3', 'b', 'c', 'd')).equal(
      'a_b_c_d'
    );
    should(SoundStore.suttaVolumeName('a1.2-5:3.1', 'b', 'c', 'd')).equal(
      'a_b_c_d'
    );
    should(SoundStore.suttaVolumeName('thig1.2', 'b', 'c', 'd')).equal(
      'kn_b_c_d'
    );
    should(SoundStore.suttaVolumeName('thag1.2', 'b', 'c', 'd')).equal(
      'kn_b_c_d'
    );
    should(SoundStore.suttaVolumeName('thag1.2', 'pli', 'c', 'd')).equal(
      'kn_pli_mahasangiti_d'
    );
    should(SoundStore.suttaVolumeName('mn1', 'pli', 'c', 'd')).equal(
      'mn_pli_mahasangiti_d'
    );
  });

  it('guidPath(guid, suffix) returns file path of guid', () => {
    const store = new SoundStore({
      storePath,
    });
    const guid = mj.hash('hello world');

    const commonPath = path.join(storePath, 'common');
    const guidDir = guid.substring(0, 2);
    const guidPath = path.join(commonPath, guidDir, guid);
    should(store.guidPath(guid)).equal(`${guidPath}.mp3`);
    should(store.guidPath(guid, '.abc')).equal(`${guidPath}.abc`);
    should(fs.existsSync(commonPath)).equal(true);

    const testVolPath = path.join(storePath, 'test-volume', guidDir);
    const guid1Path = path.join(testVolPath, guid);
    should(
      store.guidPath(guid, {
        suffix: '.abc',
        volume: 'test-volume',
      })
    ).equal(`${guid1Path}.abc`);
    should(fs.existsSync(testVolPath)).equal(true);
  });

  it('addEphemeral(guid) saves an ephemeral guid', () => {
    const store = new SoundStore({
      storePath,
    });
    should.deepEqual(store.ephemerals, {});
    const data = [1, 2, 3].map((i) => {
      const name = `ephemeral-${i}`;
      const guid = mj.hash(name);
      return {
        name,
        guid,
      };
    });

    store.addEphemeral(data[0].guid);
    should.deepEqual(Object.keys(store.ephemerals), [data[0].guid]);
    store.addEphemeral(data[1].guid);
    store.addEphemeral(data[2].guid);
    should.deepEqual(Object.keys(store.ephemerals), [
      data[0].guid,
      data[1].guid,
      data[2].guid,
    ]);
    should(store.clearEphemerals()).equal(0);
  });

  it('clearEphemeral(opts) removes ephemeral files', async () => {
    const storePathEph = tmp.tmpNameSync();
    const ephemeralInterval = 1000;
    const store = new SoundStore({
      suffixes: ['.txt'],
      storePath: storePathEph,
      ephemeralInterval,
    });
    should.deepEqual(Object.keys(store.ephemerals), []);
    should(store.ephemeralInterval).equal(ephemeralInterval);
    should(store.ephemeralAge).equal(15 * 60 * 1000);
    const data = [1, 2, 3].map((i) => {
      const name = `ephemeral-${i}`;
      const guid = mj.hash(name);
      store.addEphemeral(guid);
      const fpath = store.guidPath(guid, '.txt');
      const msNow = Date.now().toString();
      while (msNow === Date.now().toString());
      fs.writeFileSync(fpath, name);
      return {
        name,
        guid,
        fpath,
        fstat: fs.statSync(fpath),
      };
    });
    should(fs.existsSync(data[0].fpath)).equal(true);
    should(fs.existsSync(data[1].fpath)).equal(true);
    should(fs.existsSync(data[2].fpath)).equal(true);

    should.deepEqual(Object.keys(store.ephemerals), [
      data[0].guid,
      data[1].guid,
      data[2].guid,
    ]);

    let ctime = data[0].fstat.ctime;
    let nEphemerals = await store.clearEphemerals({ ctime });
    should(nEphemerals).below(3).above(-1);
    should(fs.existsSync(data[0].fpath)).equal(false);

    nEphemerals = await store.clearEphemerals();
    should(nEphemerals).equal(0);
    should(store.ephemeralTime).equal(undefined);
    should(fs.existsSync(data[0].fpath)).equal(false);
    should(fs.existsSync(data[1].fpath)).equal(false);
    should(fs.existsSync(data[2].fpath)).equal(false);
    should.deepEqual(Object.keys(store.ephemerals), []);
  });

  it('automatically clears old ephemerals', async () => {
    const storePathEph = tmp.tmpNameSync();
    const ephemeralInterval = 100;
    const store = new SoundStore({
      suffixes: ['.txt'],
      storePath: storePathEph,
      ephemeralInterval,
      ephemeralAge: ephemeralInterval / 2,
    });
    should.deepEqual(Object.keys(store.ephemerals), []);
    should(store.ephemeralInterval).equal(ephemeralInterval);
    should(store.ephemeralAge).equal(ephemeralInterval / 2);
    const data = [1, 2, 3].map((i) => {
      const name = `ephemeral-${i}`;
      const guid = mj.hash(name);
      store.addEphemeral(guid);
      const fpath = store.guidPath(guid, '.txt');
      const msNow = Date.now().toString();
      while (msNow === Date.now().toString());
      fs.writeFileSync(fpath, name);
      return {
        name,
        guid,
        fpath,
        fstat: fs.statSync(fpath),
      };
    });
    should.deepEqual(Object.keys(store.ephemerals), [
      data[0].guid,
      data[1].guid,
      data[2].guid,
    ]);
    should(fs.existsSync(data[0].fpath)).equal(true);
    should(fs.existsSync(data[1].fpath)).equal(true);
    should(fs.existsSync(data[2].fpath)).equal(true);

    await new Promise((r) => setTimeout(() => r(1), ephemeralInterval / 2));
    fs.writeFileSync(data[0].fpath, data[0].name);
    await new Promise((r) => setTimeout(() => r(1), ephemeralInterval / 2));
    should(fs.existsSync(data[1].fpath)).equal(false);
    should(fs.existsSync(data[2].fpath)).equal(false);
    const ephKeys = Object.keys(store.ephemerals);
    ephKeys.length && should.deepEqual(ephKeys, [data[0].guid]);

    await new Promise((r) => setTimeout(() => r(1), ephemeralInterval));
    should(fs.existsSync(data[0].fpath)).equal(false);
    should(fs.existsSync(data[1].fpath)).equal(false);
    should(fs.existsSync(data[2].fpath)).equal(false);
    should.deepEqual(Object.keys(store.ephemerals), []);
  });

  it('volumeInfo() returns volume information', async () => {
    const store = new SoundStore({});
    const cmd = 'du -sk *';
    const cwd = store.storePath;
    should(fs.existsSync(cwd)).equal(true);
    let nFiles = 0;
    let du = [];
    try {
      const res = await execPromise(cmd, { cwd });
      if (res.err == null) {
        du = res.stdout.trim().split('\n');
      }
      nFiles = du.length;
    } catch (e) {
      should(e.message).match(/No such file or directory/m);
    }
    const volumeInfo = du.reduce((acc, line) => {
      const lineParts = line.split('\t');
      acc[lineParts[1]] = {
        name: lineParts[1],
        size: Number(lineParts[0]),
      };
      return acc;
    }, {});
    should.deepEqual(store.volumeInfo(), volumeInfo);
  });

  it('clearVolume() clears volume', async () => {
    const store = new SoundStore({
      storePath,
    });
    store.logLevel = 'error';
    const volume1 = 'test-v1';
    const guid1 = 'clear-v1';
    const filePath1 = store.guidPath(
      {
        volume: volume1,
        chapter: 'test-c1',
        guid: guid1,
      },
      '.test'
    );
    should(fs.existsSync(filePath1)).equal(false);
    fs.writeFileSync(filePath1, 'test-f1');
    should(fs.existsSync(filePath1)).equal(true);
    const filePath2 = store.guidPath(
      {
        volume: 'test-v2',
        chapter: 'test-c2',
        guid: 'clear-v2',
      },
      '.test'
    );
    should(fs.existsSync(filePath2)).equal(false);
    fs.writeFileSync(filePath2, 'test-f2');
    should(fs.existsSync(filePath2)).equal(true);

    let eCaught = null;
    try {
      await store.clearVolume();
    } catch (e) {
      eCaught = e;
    }
    should(eCaught.message).match(/no volume/);
    should(fs.existsSync(filePath2)).equal(true);
    should(fs.existsSync(filePath1)).equal(true);

    try {
      await store.clearVolume('no-volume');
    } catch (e) {
      eCaught = e;
    }
    should(eCaught.message).match(/no volume/);
    should(fs.existsSync(filePath2)).equal(true);
    should(fs.existsSync(filePath1)).equal(true);

    let result = await store.clearVolume(volume1);
    should(fs.existsSync(filePath2)).equal(true);
    should(fs.existsSync(filePath1)).equal(false);
    should.deepEqual(result, {
      filesDeleted: 1,
    });

    fs.writeFileSync(filePath1, 'test-f1');
    store.addEphemeral(guid1);
    should.deepEqual(Object.keys(store.ephemerals), [guid1]);
    result = await store.clearVolume(volume1);
    should(fs.existsSync(filePath1)).equal(false);
    store.clearEphemerals();
    should.deepEqual(Object.keys(store.ephemerals), []);
    should(fs.existsSync(filePath2)).equal(true);
  });

  it('soundInfo(...) => [ info ]', () => {
    const store = new SoundStore({
      storePath: TEST_SOUNDS,
    });
    const guid = '0a7eda3b4b66e3e005a85ef78c69bb92';
    const volume = 'an_en_sujato_matthew';
    const info = store.soundInfo({ guid, volume });
    should.deepEqual(
      info.map((i) => i.api),
      ['aws-polly', 'aws-polly']
    );
    should.deepEqual(
      info.map((i) => i.voice),
      ['Matthew', 'Matthew']
    );
    should(info[0].guid).equal('a8215f97f8e0a0b3708eb643c6d2a6b6');
    should(info[0].text).match(/As they recollect/);
    should(info[1].guid).equal('f1769b95a0843179f14a90afdc5b0d07');
    should(info[1].text).match(/just like cleaning/);

    const guid2 = 'a8215f97f8e0a0b3708eb643c6d2a6b6';
    const info2 = store.soundInfo({ guid: guid2, volume });
    should(info2[0].text).match(/As they recollect/);
    should(info2.length).equal(1);
  });

  it('uploadCaches(...)', async () => {
    if (process.env.TEST_UPLOAD_CACHES !== 'true') {
      console.log('To test upload caches:');
      console.log('  export TEST_UPLOAD_CACHES=true');
      return;
    }
    const store = new SoundStore({
      storePath: TEST_SOUNDS,
    });
    const stats = {};
    const voice = 'Matthew';
    const maxUpload = 2;
    const res = await store.uploadCaches({ stats, voice, maxUpload });
    should(stats).properties({
      json: 6,
      mp3: 4,
      guidFolders: 3,
      status: 'done',
      volumes: 1,
      ffmegConcat: 2,
      'aws-polly': 4,
      base64: 129392,
    });
    should(stats.uploads).above(-1).below(5);
    should(res.finished - res.started)
      .below(10 * 1000)
      .above(0);
    should(res).equal(stats);
  });
});
