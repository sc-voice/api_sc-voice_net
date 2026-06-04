import { describe, it, expect } from '@sc-voice/vitest';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MdAria = require('../src/md-aria.cjs');

describe('md-aria', () => {
  it('creates <detail> from headings', () => {
    var mdAria = new MdAria();
    var html = mdAria.toHtml(['a', '# b', 'b1', '## c', 'c1'].join('\n'));
    expect(html.split('\n')).toEqual([
      'a',
      '<detail>',
      '<summary>b</summary>',
      'b1',
      '</detail>',
      '<h2>c</h2>',
      'c1',
    ]);
  });
  it('creates <ul> from starred lines', () => {
    var mdAria = new MdAria();
    var html = mdAria.toHtml(['a', '* b1', '* b2', '', 'c'].join('\n'));
    expect(html.split('\n')).toEqual([
      'a',
      '<ul>',
      '<li>b1</li>',
      '<li>b2</li>',
      '</ul>',
      '<p>',
      'c',
      '</p>',
    ]);
  });
  it('creates <p> from blank lines', () => {
    var mdAria = new MdAria();
    var html = mdAria.toHtml(
      ['', 'a', 'a1', '', 'b', 'b1', '', '', 'c', 'c1', ''].join('\n')
    );
    expect(html.split('\n')).toEqual([
      '<p>',
      'a',
      'a1',
      '</p>',
      '<p>',
      'b',
      'b1',
      '</p>',
      '<p>',
      'c',
      'c1',
      '</p>',
    ]);
  });
  it('creates <p> from blank lines', () => {
    var mdAria = new MdAria();
    var html = mdAria.toHtml(['x [x1](x2) x3', '* y [y1](y2) y3'].join('\n'));
    expect(html.split('\n')).toEqual([
      `x <a href="x2">x1</a> x3`,
      '<ul>',
      `<li>y <a href="y2">y1</a> y3</li>`,
      '</ul>',
    ]);
  });
  it('replaces mispronounced words', () => {
    var mdAria = new MdAria();
    var html = mdAria.toHtml(`Hear this on SuttaCentral Voice`);
    expect(html).toEqual(
      [
        'Hear this on ',
        '<span aria-label="soota central"> </span>',
        '<span aria-hidden="true">SuttaCentral</span>',
        ' Voice',
      ].join('')
    );

    var html = mdAria.toHtml(`Hear these suttas:`);
    expect(html).toEqual(
      [
        'Hear these ',
        '<span aria-label="sootas"> </span>',
        '<span aria-hidden="true">suttas</span>',
        ':',
      ].join('')
    );

    var html = mdAria.toHtml(`Hear this sutta?`);
    expect(html).toEqual(
      [
        'Hear this ',
        '<span aria-label="soota"> </span>',
        '<span aria-hidden="true">sutta</span>',
        '?',
      ].join('')
    );

    var html = mdAria.toHtml(`http://suttacentral.net/mn1`);
    expect(html).toEqual([`http://%73uttacentral.net/mn1`].join(''));

    var html = mdAria.toHtml(`suttacentral-voice-assistant`);
    expect(html).toEqual(['%73uttacentral-voice-assistant'].join(''));
  });
});
