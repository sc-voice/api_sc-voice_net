import { describe, it, expect } from '@sc-voice/vitest';
import should from 'should';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import { logger } from 'log-instance';
import { ScApi } from 'suttacentral-api';

logger.logLevel = 'warn';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const Sutta = require('../src/sutta.cjs');
const SuttaDuration = require('../src/sutta-duration.cjs');
const SuttaFactory = require('../src/sutta-factory.cjs');
const SuttaStore = require('../src/sutta-store.cjs');

const scApi = new ScApi();
const TOLERANCE = 33;
const lang = 'en';

function testTolerance(actual, expected, e = TOLERANCE) {
  should(actual).above(expected - e);
  should(actual).below(expected + e);
}

let suttaStore;
async function testSuttaStoreHelper() {
  if (!suttaStore) {
    suttaStore = await new SuttaStore().initialize();
  }
  return suttaStore;
}

let suttaFactory;
async function testSuttaFactoryHelper() {
  if (!suttaFactory) {
    const sStore = await testSuttaStoreHelper();
    const api = await new ScApi().initialize();
    suttaFactory = await new SuttaFactory({
      suttaLoader: (opts) => sStore.loadBilaraSutta(opts),
      scApi: api,
    }).initialize();
  }
  return suttaFactory;
}

describe('sutta-duration', () => {
  it('constructor', () => {
    const scd = new SuttaDuration();
    should(scd.name).equal('amy');
  });

  it('measure(sutta, lang) measures thag1.2', async () => {
    const store = await testSuttaStoreHelper();
    const factory = await testSuttaFactoryHelper();
    const sutta = await store.loadSutta('thag1.2');
    const sectionSutta = factory.sectionSutta(sutta);
    const scd = new SuttaDuration();
    const resMeasure = scd.measure(sectionSutta, lang);
    should(resMeasure).properties({
      text: 268,
      lang,
      nSegments: 9,
      nSections: 2,
      nEmptySegments: 0,
    });
    testTolerance(resMeasure.seconds, 24);
  });

  it('measure(sutta, lang) measures thig1.1', async () => {
    const factory = await testSuttaFactoryHelper();
    const scd = new SuttaDuration();
    const sutta = await factory.loadSutta('thig1.1');
    const sectionSutta = factory.sectionSutta(sutta);
    const resMeasure = scd.measure(sectionSutta, lang);
    should(resMeasure.text).above(300).below(400);
    should(resMeasure.lang).equal(lang);
    should(resMeasure.nSegments).equal(9);
    should(resMeasure.nEmptySegments).equal(0);
    should(resMeasure.nSections).equal(2);
    testTolerance(resMeasure.seconds, 31);
  });

  it('measure(sutta, lang) measures sn2.2', async () => {
    const factory = await testSuttaFactoryHelper();
    const scd = new SuttaDuration();
    const sutta = await factory.loadSutta('sn2.2');
    const sectionSutta = factory.sectionSutta(sutta);
    const resMeasure = scd.measure(sectionSutta, lang);
    should(resMeasure.text).above(300).below(400);
    should(resMeasure.lang).equal(lang);
    should(resMeasure.nSegments).equal(9);
    should(resMeasure.nEmptySegments).equal(0);
    should(resMeasure.nSections).equal(2);
    testTolerance(resMeasure.seconds, 31);
  });

  it('measure(sutta, lang) measures thig5.1', async () => {
    const factory = await testSuttaFactoryHelper();
    const scd = new SuttaDuration();
    const sutta = await factory.loadSutta('thig5.1');
    const sectionSutta = factory.sectionSutta(sutta);
    const resMeasure = scd.measure(sectionSutta, lang);
    should(resMeasure.text).above(700).below(800);
    should(resMeasure.lang).equal(lang);
    should(resMeasure.nSegments).equal(26);
    should(resMeasure.nEmptySegments).equal(1);
    should(resMeasure.nSections).equal(2);
    testTolerance(resMeasure.seconds, 69);
  });

  it('measure(sutta, lang) measures sn1.1', async () => {
    const factory = await testSuttaFactoryHelper();
    const scd = new SuttaDuration();
    const sutta = await factory.loadSutta('sn1.1');
    const sectionSutta = factory.sectionSutta(sutta);
    const resMeasure = scd.measure(sectionSutta, lang);
    should(resMeasure).properties({
      lang,
      nSegments: 20,
      nEmptySegments: 1,
      nSections: 2,
    });
    should(resMeasure.text).above(900).below(980);
    testTolerance(resMeasure.seconds, 85);
  });

  it('measure(sutta, lang) measures sn56.21', async () => {
    const factory = await testSuttaFactoryHelper();
    const scd = new SuttaDuration();
    const sutta = await factory.loadSutta('sn56.21');
    const sectionSutta = factory.sectionSutta(sutta);
    const resMeasure = scd.measure(sectionSutta, lang);
    should(resMeasure).properties({
      text: 1089,
      lang,
      nSegments: 23,
      nEmptySegments: 1,
      nSections: 2,
    });
    testTolerance(resMeasure.seconds, 111);
  });

  it('measure(sutta, lang) measures thag9.1', async () => {
    const factory = await testSuttaFactoryHelper();
    const scd = new SuttaDuration();
    const sutta = await factory.loadSutta('thag9.1');
    const sectionSutta = factory.sectionSutta(sutta);
    const resMeasure = scd.measure(sectionSutta, lang);
    should(resMeasure.text).above(1800).below(2000);
    should(resMeasure.nSegments).equal(47);
    should(resMeasure.nSections).equal(2);
    should(resMeasure.nEmptySegments).equal(7);
    should(resMeasure.lang).equal(lang);
    testTolerance(resMeasure.seconds, 168);
  });

  it('measure(sutta, lang) measures sn36.11', async () => {
    const factory = await testSuttaFactoryHelper();
    const scd = new SuttaDuration();
    const sutta = await factory.loadSutta('sn36.11');
    const sectionSutta = factory.sectionSutta(sutta);
    const resMeasure = scd.measure(sectionSutta, lang);
    should(resMeasure).properties({
      text: 2997,
      lang,
      nSegments: 50,
      nEmptySegments: 4,
      nSections: 2,
    });
    testTolerance(resMeasure.seconds, 270);
  });

  it('measure(sutta, lang) measures sn42.11', async () => {
    const factory = await testSuttaFactoryHelper();
    const scd = new SuttaDuration();
    const sutta = await factory.loadSutta('sn42.11');
    const sectionSutta = factory.sectionSutta(sutta);
    const resMeasure = scd.measure(sectionSutta, lang);
    should(resMeasure.text).above(3310).below(3450);
    should(resMeasure).properties({
      lang,
      nSegments: 55,
      nEmptySegments: 1,
      nSections: 2,
    });
    testTolerance(resMeasure.seconds, 326);
  });

  it('measure(sutta, lang) measures an2.1', async () => {
    const factory = await testSuttaFactoryHelper();
    const scd = new SuttaDuration();
    const sutta = await factory.loadSutta('an2.1');
    const sectionSutta = factory.sectionSutta(sutta);
    const resMeasure = scd.measure(sectionSutta, lang);
    should(resMeasure.text).above(6000).below(7000);
    should(resMeasure.lang).equal(lang);
    should(resMeasure.nSegments).equal(125);
    should(resMeasure.nEmptySegments).equal(26);
    should(resMeasure.nSections).equal(11);
    testTolerance(resMeasure.seconds, 596);
  });

  it('measure(sutta, lang) measures sn12.51', async () => {
    const factory = await testSuttaFactoryHelper();
    const scd = new SuttaDuration();
    const sutta = await factory.loadSutta('sn12.51');
    const sectionSutta = factory.sectionSutta(sutta);
    const resMeasure = scd.measure(sectionSutta, lang);
    should(resMeasure.text).above(6000).below(7000);
    should(resMeasure).properties({
      lang,
      nSegments: 92,
      nEmptySegments: 1,
      nSections: 2,
    });
    testTolerance(resMeasure.seconds, 719);
  });

  it('measure(sutta, lang) measures dn33', async () => {
    const factory = await testSuttaFactoryHelper();
    const scd = new SuttaDuration();
    const sutta = await factory.loadSutta('dn33');
    const sectionSutta = factory.sectionSutta(sutta);
    const resMeasure = scd.measure(sectionSutta, lang);
    should(resMeasure).properties({
      lang,
      nSegments: 1167,
      nEmptySegments: 38,
      nSections: 12,
    });
    should(resMeasure.text).above(84700).below(85000);
    testTolerance(resMeasure.seconds, 8171);
  });

  it('measure(sutta, lang) measures mn1', async () => {
    const factory = await testSuttaFactoryHelper();
    const scd = new SuttaDuration();
    const sutta = await factory.loadSutta('mn1');
    const sectionSutta = factory.sectionSutta(sutta);
    const resMeasure = scd.measure(sectionSutta, lang);
    should(resMeasure.text).above(15800).below(16000);
    should(resMeasure).properties({
      lang,
      nSegments: 334,
      nSections: 2,
      nEmptySegments: 9,
    });
    testTolerance(resMeasure.seconds, 1400);
  });
});
