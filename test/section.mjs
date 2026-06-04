import { describe, it, expect } from '@sc-voice/vitest';
import should from 'should';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const Words = require('../src/words.cjs');
const Section = require('../src/section.cjs');

const segments = [
  {
    scid: 's:0.1',
    en: 'a1 a2, a3',
  },
  {
    scid: 's:1.1',
    en: 'b1 x1 b2',
  },
  {
    scid: 's:1.2',
    en: 'c1 x1 c2 x1 c3',
  },
  {
    scid: 's:2.1',
    en: `d1 y1 ${Words.U_ELLIPSIS}`,
  },
  {
    scid: 's:3.1',
    en: `y2a y2b ${Words.U_ELLIPSIS}`,
  },
  {
    scid: 's:4.1',
    en: `q1 y3 ${Words.U_ELLIPSIS}`,
  },
  {
    scid: 's:5.1',
    en: `y4 ${Words.U_ELLIPSIS}`,
  },
];

describe('section', () => {
  it('Section(parms) creates a section', () => {
    const section = new Section({
      segments,
    });
    should(section).properties({
      segments,
      type: 'Section',
      title: 'a1 a2, a3',
    });
  });

  it('Section is serializable', () => {
    const section = new Section({
      segments,
      template: [segments[1], segments[2]],
      values: ['x1', 'y1', 'y2a y2b', 'y3', 'y4'],
      prefix: 'q1 ',
    });
    const json = JSON.stringify(section);
    const sectCopy = new Section(JSON.parse(json));
    should.deepEqual(sectCopy, section);
  });
});
