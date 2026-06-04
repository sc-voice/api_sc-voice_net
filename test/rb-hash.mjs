import { describe, it, expect } from '@sc-voice/vitest';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RbHash = require('../src/rb-hash.cjs');

describe('rb-hash', () => {
  it('hash(string) calculates hash code', () => {
    var rbh = new RbHash();
    expect(rbh.hash('')).toBe('d41d8cd98f00b204e9800998ecf8427e');
    expect(rbh.hash('hello\n')).toBe('b1946ac92492d2347c6235b4d2611184');
    expect(rbh.hash(' ')).toBe('7215ee9c7d9dc229d2921a40e899ec5f');
    expect(rbh.hash('HTML')).toBe('4c4ad5fca2e7a3f74dbb1ced00381aa4');

    expect(rbh.hash('←')).toBe('5adcb503750876bb69cfc0a9289f9fb8');
    expect(rbh.hash('←')).not.toBe(rbh.hash('↑'));

    expect(rbh.hash('hello')).toBe(rbh.hash('hello'));
    expect(rbh.hash('goodbye')).not.toBe(rbh.hash('hello'));
  });
  it('hash(Array) calculates hash code', () => {
    var rbh = new RbHash();
    expect(rbh.hash(['HTML'])).toBe(rbh.hash(rbh.hash('HTML')));
    expect(
      rbh.hash(['HT', 'ML'])
    ).toBe(
      rbh.hash(rbh.hash('HT') + rbh.hash('ML'))
    );
    expect(rbh.hash([1, 2])).toBe(rbh.hash(rbh.hash('1') + rbh.hash('2')));
  });
  it('hash(number) calculates hash code', () => {
    var rbh = new RbHash();
    expect(rbh.hash('123')).toBe(rbh.hash(123));
    expect(rbh.hash('123.456')).toBe(rbh.hash(123.456));
  });
  it('hash(null) calculates hash code', () => {
    var rbh = new RbHash();
    expect(rbh.hash('null')).toBe(rbh.hash(null));
  });
  it('hash(undefined) calculates hash code', () => {
    var rbh = new RbHash();
    expect(rbh.hash('undefined')).toBe(rbh.hash(undefined));
  });
  it('hash(boolean) calculates hash code', () => {
    var rbh = new RbHash();
    expect(rbh.hash(true)).toBe(rbh.hash('true'));
  });
  it('hash(function) calculates hash code', () => {
    var rbh = new RbHash();
    function f(x) {
      return x * x;
    }
    var fstr = f.toString();
    var g = (x) => x * x;
    var gstr = g.toString();

    expect(rbh.hash(f)).toBe(rbh.hash(fstr));
    expect(rbh.hash(g)).toBe(rbh.hash(gstr));
  });
  it('hash(object) calculates or calculates hash code', () => {
    var rbh = new RbHash();
    expect(rbh.hash({ a: 1 })).toBe(rbh.hash('a:' + rbh.hash(1) + ','));
    expect(
      rbh.hash({ a: 1, b: 2 })
    ).toBe(
      rbh.hash('a:' + rbh.hash(1) + ',b:' + rbh.hash(2) + ',')
    );
    expect(
      rbh.hash({ b: 2, a: 1 })
    ).toBe(
      rbh.hash('a:' + rbh.hash(1) + ',b:' + rbh.hash(2) + ',')
    );
    var drives = {
      drives: [
        { type: 'BeltDrive', maxPos: 100 },
        { type: 'BeltDrive' },
        { type: 'ScrewDrive' },
      ],
      rbHash: '2d21a6576194aeb1de7aea4d6726624d',
    };
    var hash100 = rbh.hash(drives);
    drives.drives[0].maxPos++;
    var hash101 = rbh.hash(drives);
    expect(hash100).not.toBe(hash101);
  });
  it('hashCached(object) returns existing hash code if present', () => {
    var rbh = new RbHash();
    var hfoo = rbh.hashCached('foo');
    expect(rbh.hashCached({ rbHash: hfoo })).toBe(hfoo);
    expect(
      rbh.hashCached({ rbHash: hfoo, anything: 'do-not-care' })
    ).toBe(hfoo);
    expect(
      rbh.hashCached([{ rbHash: hfoo, anything: 'do-not-care' }])
    ).toBe(rbh.hash(hfoo));
    expect(rbh.hashCached({ rbHash: 'some-hash', a: 1 })).toBe('some-hash');
  });
  it('hash(object) handles objects with non-serializable properties', () => {
    class TestClass {
      constructor() {
        this.color = 'red';
        this.random = Math.random();
      }
      toJSON() {
        return {
          color: this.color,
        };
      }
    }
    var obj = (() => {
      var o = {};
      o.color = 'red';
      return o;
    })();
    expect(typeof obj.toJSON).toBe('undefined');
    expect(typeof new TestClass().toJSON).toBe('function');
    var rbh = new RbHash();
    var hash1 = rbh.hash(new TestClass());
    var hash2 = rbh.hash(new TestClass());
    expect(hash1).toBe(hash2);
  });
});
