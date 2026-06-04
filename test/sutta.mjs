import { describe, it, expect } from '@sc-voice/vitest';
import should from 'should';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const Section = require('../src/section.cjs');
const Sutta = require('../src/sutta.cjs');
const Words = require('../src/words.cjs');

const SC = path.join(__dirname, '../local/sc');

const segments = [
  {
    scid: 's:0.1',
    en: 'a1 ab ac.',
  },
  {
    scid: 's:1.1',
    en: 'b1 ab bc.',
  },
  {
    scid: 's:1.2',
    en: 'c1 bc ac.',
  },
];

describe('sutta', () => {
  it('default ctor', () => {
    should.throws(() => {
      const sutta = new Sutta();
    });
  });

  it('custom ctor', () => {
    const sutta_uid = 'testSutta1';
    const author = 'testAuthor';
    const lang = 'test';
    const testSegments = [
      {
        scid: 'testSutta1:0.1',
        test: 'text 1',
      },
    ];
    const sutta = new Sutta({
      author,
      lang,
      sutta_uid,
      segments: testSegments,
    });
    should(sutta).properties({
      author,
      sutta_uid,
      lang,
    });
    should.deepEqual(sutta.segments, testSegments);
  });

  it('findIndexes(segments, pat) returns array of segment indexes', () => {
    should.deepEqual(Sutta.findIndexes(segments, 'not found'), []);

    let prop = 'en';
    should.deepEqual(Sutta.findIndexes(segments, 'a1', { prop }), [0]);
    should.deepEqual(Sutta.findIndexes(segments, 'ab', { prop }), [0, 1]);
    should.deepEqual(Sutta.findIndexes(segments, 'bc', { prop }), [1, 2]);
    should.deepEqual(Sutta.findIndexes(segments, 'ac', { prop }), [0, 2]);

    should.deepEqual(Sutta.findIndexes(segments, /a1/, { prop }), [0]);
    should.deepEqual(Sutta.findIndexes(segments, /ab/, { prop }), [0, 1]);
    should.deepEqual(Sutta.findIndexes(segments, /bc/, { prop }), [1, 2]);
    should.deepEqual(Sutta.findIndexes(segments, /ac/, { prop }), [0, 2]);
    should.deepEqual(
      Sutta.findIndexes(segments, /a1 ab|ab bc/, { prop }),
      [0, 1]
    );

    prop = 'scid';
    should.deepEqual(Sutta.findIndexes(segments, /^s:0.1/, { prop }), [0]);
    should.deepEqual(Sutta.findIndexes(segments, /^s:0.*/, { prop }), [0]);
    should.deepEqual(Sutta.findIndexes(segments, /^s:1.*/), [1, 2]);

    const result = segments.filter((seg) => /ab/.test(seg.en));
    should.deepEqual(result, [
      {
        scid: 's:0.1',
        en: 'a1 ab ac.',
      },
      {
        scid: 's:1.1',
        en: 'b1 ab bc.',
      },
    ]);
  });

  it('findSegments(segments, pat) returns array of segment indexes', () => {
    should.deepEqual(Sutta.findSegments(segments, 'not found'), []);

    let prop = 'en';
    should.deepEqual(Sutta.findSegments(segments, 'a1', { prop }), [
      segments[0],
    ]);
    should.deepEqual(Sutta.findSegments(segments, 'ab', { prop }), [
      segments[0],
      segments[1],
    ]);
    should.deepEqual(Sutta.findSegments(segments, 'bc', { prop }), [
      segments[1],
      segments[2],
    ]);
    should.deepEqual(Sutta.findSegments(segments, 'ac', { prop }), [
      segments[0],
      segments[2],
    ]);

    should.deepEqual(Sutta.findSegments(segments, /a1/, { prop }), [
      segments[0],
    ]);
    should.deepEqual(Sutta.findSegments(segments, /ab/, { prop }), [
      segments[0],
      segments[1],
    ]);
    should.deepEqual(Sutta.findSegments(segments, /bc/, { prop }), [
      segments[1],
      segments[2],
    ]);
    should.deepEqual(Sutta.findSegments(segments, /ac/, { prop }), [
      segments[0],
      segments[2],
    ]);
    should.deepEqual(Sutta.findSegments(segments, /a1 ab|ab bc/, { prop }), [
      segments[0],
      segments[1],
    ]);

    prop = 'scid';
    should.deepEqual(Sutta.findSegments(segments, /^s:0.1/, { prop }), [
      segments[0],
    ]);
    should.deepEqual(Sutta.findSegments(segments, /^s:0.*/, { prop }), [
      segments[0],
    ]);
    should.deepEqual(Sutta.findSegments(segments, /^s:1.*/), [
      segments[1],
      segments[2],
    ]);

    should.deepEqual(Sutta.findSegments(segments, /s.*/), segments);
    should.deepEqual(Sutta.findSegments(segments, /s:.*/), segments);
  });

  it('indexOf(segments, scid) returns segment index', () => {
    should(Sutta.indexOf(segments, 0)).equal(0);
    should(Sutta.indexOf(segments, 2)).equal(2);
    should(Sutta.indexOf(segments, -2)).equal(-2);
    should(Sutta.indexOf(segments, 's:1.1')).equal(1);
    should.throws(() => Sutta.indexOf(segments, 'nonsense'));
    should.throws(() => Sutta.indexOf(segments, 's:1.*'));
  });

  it('excerpt(segments, opts) returns segment/text excerpt', () => {
    should.deepEqual(Sutta.excerpt(segments), segments);

    should.deepEqual(
      Sutta.excerpt(segments, {
        end: 2,
      }),
      [segments[0], segments[1]]
    );

    should.deepEqual(
      Sutta.excerpt(segments, {
        start: -2,
        prop: 'en',
      }),
      [segments[1].en, segments[2].en]
    );

    should.deepEqual(
      Sutta.excerpt(segments, {
        start: 's:0.1',
        end: 's:1.2',
        prop: 'en',
      }),
      [segments[0].en + Sutta.GROUP_SEP, segments[1].en]
    );
  });

  it('textOfSegments(segments, opts) returns array of text', () => {
    should.deepEqual(Sutta.textOfSegments(segments), [
      `${segments[0].en}\n`,
      segments[1].en,
      segments[2].en,
    ]);

    should.deepEqual(
      Sutta.textOfSegments(segments),
      Sutta.textOfSegments(segments, {
        prop: 'en',
      })
    );
  });
});
