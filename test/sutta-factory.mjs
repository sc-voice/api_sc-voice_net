import { describe, it, expect } from '@sc-voice/vitest';
import should from 'should';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import { MLDoc } from 'scv-bilara';
import { ScApi } from 'suttacentral-api';
import { logger } from 'log-instance';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const Section = require('../src/section.cjs');
const Sutta = require('../src/sutta.cjs');
const SuttaFactory = require('../src/sutta-factory.cjs');
const SuttaStore = require('../src/sutta-store.cjs');
const Words = require('../src/words.cjs');

const TEST_DATA = path.join(__dirname, 'data');
logger.logLevel = 'warn';

const suttaStore = new SuttaStore();
const suttaFactory = new SuttaFactory({
  suttaLoader: (opts) => suttaStore.loadBilaraSutta(opts),
});

function testSutta(suid = 'an1.3') {
  const testPath = path.join(TEST_DATA, `${suid}.json`);
  const json = JSON.parse(fs.readFileSync(testPath));
  const mld = new MLDoc(json);
  const segments = mld.segments();
  return new Sutta({
    sutta_uid: suid,
    lang: mld.lang,
    segments,
  });
}

describe('sutta-factory', () => {
  it('default ctor', () => {
    const factory = new SuttaFactory();
    should(factory).properties({
      lang: 'en',
      prop: 'en',
    });
  });

  it('custom ctor', () => {
    const factory = new SuttaFactory({
      lang: 'de',
    });
    should(factory).properties({
      lang: 'de',
      prop: 'de',
    });
  });

  it('loadSutta(...) => a sutta from SuttaCentral api', async () => {
    await new Promise((r) => setTimeout(() => r(), 200));
    await suttaStore.initialize();
    await suttaFactory.initialize();
    const sutta = await suttaFactory.loadSutta('mn1');
    should(sutta).instanceOf(Sutta);
    const end = 21;
    const header = sutta.excerpt({
      start: 0,
      end: 2,
      prop: 'pli',
    });
    const excerpt = sutta.excerpt({
      start: 0,
      end,
      prop: 'en',
    });
    let i = 0;
    should(excerpt[i++]).match(/Middle Discourses 1/);
    should(excerpt[i++]).match(/The Root of All Things/);
    should(excerpt[i++]).match(/So I have heard./);
    should(excerpt[end - 2]).match(/Why is that?/);
    should(sutta.sections).instanceOf(Array);
    should(sutta.sections[0]).instanceOf(Section);
  });

  it('loadSutta(...) returns mn1', async () => {
    await suttaStore.initialize();
    await suttaFactory.initialize();
    const sutta = await suttaFactory.loadSutta('mn1');
    const end = 21;
    const header = sutta.excerpt({
      start: 0,
      end: 2,
      prop: 'pli',
    });
    const excerpt = sutta.excerpt({
      start: 0,
      end,
      prop: 'en',
    });
    let i = 0;
    should(excerpt[i++]).match(/Middle Discourses 1/);
    should(excerpt[i++]).match(/The Root of All Things/);
    should(excerpt[i++]).match(/So I have heard./);
    should(excerpt[end - 2]).match(/Why is that?/);
    should(sutta.sections).instanceOf(Array);
    should(sutta.sections[0]).instanceOf(Section);
  });

  it('loadSutta(...) loads an3.163-182', async () => {
    await suttaStore.initialize();
    await suttaFactory.initialize();
    const sutta = await suttaFactory.loadSutta('an3.163-182');
    should(sutta.sections[0].segments[0].en).match(
      /Numbered Discourses 3/
    );
    should(sutta.sections[0].segments[1].en).match(
      /Ways of Performing Deeds/
    );
  });

  it('loadSutta(...) loads dn7', async () => {
    await suttaStore.initialize();
    await suttaFactory.initialize();
    const sutta = await suttaFactory.loadSutta('dn7');
    should(sutta.sections[0].segments[0].en).match(/Long Discourses 7/);
    should(sutta.sections[0].segments[1].en).match(/With Jāliya/);
  });

  it('loadSutta(...) loads sn22.1', async () => {
    await suttaStore.initialize();
    await suttaFactory.initialize();
    const sutta = await suttaFactory.loadSutta('sn22.1');
    should(sutta.sections[0].segments[0].en).match(
      /Linked Discourses 22/
    );
    should(sutta.sections[0].segments[1].en).match(/1. Nakula/);
  });

  it('loadSutta(...) automatically sections a Sutta', async () => {
    await suttaStore.initialize();
    const factory = new SuttaFactory({
      autoSection: true,
      suttaLoader: (opts) => suttaStore.loadBilaraSutta(opts),
    });
    should(factory.autoSection).equal(true);
    const sutta = await factory.loadSutta('sn35.66');
    should(sutta.sections).instanceOf(Array);
    should(sutta.sections.length).equal(2);
    should(
      sutta.sections[0].segments.length + sutta.sections[1].segments.length
    ).equal(sutta.segments.length);
    should(sutta.sections[0].segments[0].en).match(/Linked Discourses 35/);
    should(sutta.sections[1].segments[0].en).match(
      /Sir, they speak of this thing/
    );

    const sutta2 = await factory.loadSutta('dn2');
    should(sutta2.sections).instanceOf(Array);
    should(sutta2.sections.length).equal(37);
    should(sutta2.sections[0].segments.length).equal(2);
    should(sutta2.sections[0].segments[0].en).match(/Long Discourses 2/);
    should(sutta2.sections[0].segments[1].en).match(
      /The Fruits of the Ascetic Life/
    );
    should(sutta2.sections[1].segments[0].en).match(
      /A Discussion With the King/
    );
    should(sutta2.sections[1].segments[1].en).match(/So I have heard/);
  });

  it('translators(opts) returns supported translators', async () => {
    await suttaStore.initialize();
    await suttaFactory.initialize();
    const factory = suttaFactory;
    const EN_TRANSLATORS = [
      'sujato',
      'brahmali',
      'bodhi',
      'thanissaro',
      'sujato-walton',
      'caf-rhysdavids',
      'horner',
    ];
    const DE_TRANSLATORS = [
      'sabbamitta',
      'mettiko',
      'geiger',
      'nyanaponika',
      'hecker',
      'nyanatiloka',
      'kusalagnana-maitrimurti-traetow',
      'franke',
      'vri',
    ];

    should.deepEqual(factory.translators(), EN_TRANSLATORS);
    should.deepEqual(
      factory.translators({
        language: 'en',
      }),
      EN_TRANSLATORS
    );
    should.deepEqual(
      factory.translators({
        language: 'de',
      }),
      DE_TRANSLATORS
    );
    should.deepEqual(
      factory.translators({
        translator: 'bodhi',
      }),
      [
        'bodhi',
        'sujato',
        'brahmali',
        'thanissaro',
        'sujato-walton',
        'caf-rhysdavids',
        'horner',
      ]
    );
    should.deepEqual(
      factory.translators({
        language: 'de',
        translator: 'sabbamitta',
      }),
      [
        'sabbamitta',
        'mettiko',
        'geiger',
        'nyanaponika',
        'hecker',
        'nyanatiloka',
        'kusalagnana-maitrimurti-traetow',
        'franke',
        'vri',
      ]
    );
    should.deepEqual(
      factory.translators({
        language: 'de',
        translator: 'geiger',
      }),
      [
        'geiger',
        'sabbamitta',
        'mettiko',
        'nyanaponika',
        'hecker',
        'nyanatiloka',
        'kusalagnana-maitrimurti-traetow',
        'franke',
        'vri',
      ]
    );
  });

  it('loadSutta() loads dn22/de/vri', async () => {
    await suttaStore.initialize();
    const scApi = await new ScApi().initialize();
    const factory = await new SuttaFactory({
      scApi,
      suttaLoader: (opts) => suttaStore.loadBilaraSutta(opts),
    }).initialize();

    const sutta = await factory.loadSutta({
      scid: 'dn22',
      language: 'de',
      translator: 'vri',
    });

    should(sutta.author_uid).equal('vri');
    should(sutta.sutta_uid).equal('dn22');
  });

  it('sectionSutta(...) adds sections', async () => {
    await suttaStore.initialize();
    await suttaFactory.initialize();
    const factory = suttaFactory;
    const sutta = testSutta('an1.3');
    should(sutta.lang).equal('de');
    should.deepEqual(
      sutta.sections.map((s) => ({
        prop: s.prop,
      })),
      [
        {
          prop: 'de',
        },
        {
          prop: 'de',
        },
      ]
    );
    const res = factory.sectionSutta(sutta);
    should(res).equal(sutta);

    const suttaNew = testSutta('an1.3');
    const sections = suttaNew.sections;
    sections[0].segments = [
      ...sections[0].segments,
      ...sections[1].segments,
    ];
    sections.pop();
    const sectionedSutta = factory.sectionSutta(sutta);
    should(sectionedSutta).not.equal(suttaNew);
    should.deepEqual(sectionedSutta, sutta);
  });
});
