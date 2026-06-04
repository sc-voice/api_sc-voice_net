import { describe, it, expect } from '@sc-voice/vitest';
import should from 'should';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import { logger } from 'log-instance';
import { English } from 'scv-bilara';

logger.logLevel = 'warn';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const Words = require('../src/words.cjs');

const ELLIPSIS = '…';

const words = new Words();

function ipaCompare(word, b) {
  const a = words.ipa(word);
  const autf = Words.utf16(a);
  const butf = Words.utf16(b);
  if (autf !== butf) {
    console.error();
    console.error('ipaCompare autf:', autf, autf.length);
    console.error('ipaCompare butf:', butf, butf.length);
  }
  should(autf).equal(butf);
  should(a).equal(b);
}

describe('words', () => {
  it('Words() is default constructor', async () => {
    const wordsInst = new Words();
    should(wordsInst.language).equal('en');
    should(wordsInst.canonical('bhikku')).equal('bhikkhu');
  });

  it('lookup() returns word information', () => {
    const wordsInst = new Words();
    const bhikkhu = {
      word: 'bhikkhu',
      ipa: 'bɪkuː',
      language: 'pli',
    };
    should.deepEqual(wordsInst.lookup('asdf'), null);
    should.deepEqual(wordsInst.lookup('bhikkhu'), bhikkhu);
    should.deepEqual(wordsInst.lookup('bikkhu'), bhikkhu);
    should.deepEqual(wordsInst.lookup('bhikku'), bhikkhu);
  });

  it('wordInfo(word) describes word', () => {
    const wordsInst = new Words();
    const en = { language: 'en' };
    should.deepEqual(wordsInst.wordInfo('shoulders'), en);
    should.deepEqual(wordsInst.wordInfo('should'), en);
    const pli = { language: 'pli' };
    should.deepEqual(wordsInst.wordInfo('akkha'), pli);
  });

  it('isWord(token) return true if token is a word', () => {
    const wordsInst = new Words();
    should(wordsInst.isWord('!')).equal(false);
    should(wordsInst.isWord('abc/def')).equal(false);
    should(wordsInst.isWord('abc')).equal(true);
    should(wordsInst.isWord('123')).equal(false);
    should(wordsInst.isWord('1.23')).equal(false);
    should(wordsInst.isWord('1,234')).equal(false);
    should(wordsInst.isWord('&amp;')).equal(false);
  });

  it('trimWordSymbols(word) removes symbols', () => {
    const wordsInst = new Words();
    should(wordsInst.trimWordSymbols('hello')).equal('hello');
    should(wordsInst.trimWordSymbols(`identity'`)).equal(`identity`);
  });

  it('isNumber(text) returns true if text is a number', () => {
    const wordsInst = new Words();
    should(wordsInst.isNumber(' ')).equal(false);
    should(wordsInst.isNumber('\n')).equal(false);
    should(wordsInst.isNumber('a')).equal(false);
    should(wordsInst.isNumber('a1')).equal(false);
    should(wordsInst.isNumber('1a')).equal(false);
    should(wordsInst.isNumber('123.')).equal(false);
    should(wordsInst.isNumber('.123')).equal(false);
    should(wordsInst.isNumber('123\n')).equal(false);
    should(wordsInst.isNumber('\n123')).equal(false);
    should(wordsInst.isNumber('281–309')).equal(true);
    should(wordsInst.isNumber('1,234')).equal(true);
    should(wordsInst.isNumber('1')).equal(true);
    should(wordsInst.isNumber('123')).equal(true);
    should(wordsInst.isNumber('-123')).equal(true);
    should(wordsInst.isNumber('+123')).equal(true);
    should(wordsInst.isNumber('+123.45')).equal(true);
    should(wordsInst.isNumber('123.45')).equal(true);
    should(wordsInst.isNumber('-0.45')).equal(true);
  });

  it('isForeignAlphabet(token) return true if token is a word in foreign alphabet', async () => {
    const wordsInst = new Words();
    should(wordsInst.isForeignAlphabet('!')).equal(false);
    should(wordsInst.isForeignAlphabet('thirty')).equal(false);
    should(wordsInst.isForeignAlphabet('Thirty')).equal(false);
    should(wordsInst.isForeignAlphabet('htirty')).equal(false);
    should(wordsInst.isForeignAlphabet('hTirty')).equal(false);
    should(wordsInst.isForeignAlphabet('Brahmā')).equal(true);
    should(wordsInst.isForeignAlphabet('brahmā')).equal(true);
    should(wordsInst.isForeignAlphabet('rBahmā')).equal(true);
    should(wordsInst.isForeignAlphabet('rbahmā')).equal(true);
    should(wordsInst.isForeignAlphabet('thirty-three')).equal(false);
    should(wordsInst.isForeignAlphabet('well-to-do')).equal(false);
  });

  it('isForeignWord(token) => true if foreign word', async () => {
    const wordsInst = new Words(undefined, { language: 'en-GB' });
    await new Promise((r) => setTimeout(() => r(), 1000));
    should(wordsInst.isForeignWord('!')).equal(false);
    should(wordsInst.isForeignWord('unburdensome')).equal(false);
    should(wordsInst.isForeignWord('thirty')).equal(false);
    should(wordsInst.isForeignWord('Thirty')).equal(false);
    should(wordsInst.isForeignWord('htirty')).equal(true);
    should(wordsInst.isForeignWord('hTirty')).equal(true);
    should(wordsInst.isForeignWord('Brahmā')).equal(true);
    should(wordsInst.isForeignWord('brahmā')).equal(true);
    should(wordsInst.isForeignWord('rBahmā')).equal(true);
    should(wordsInst.isForeignWord('rbahmā')).equal(true);
    should(wordsInst.isForeignWord('thirty-three')).equal(false);
    should(wordsInst.isForeignWord('well-to-do')).equal(false);
  });

  it('alternates(word) returns array of alternate spellings', () => {
    const wordsInst = new Words();
    should.deepEqual(wordsInst.alternates('asdf'), ['asdf']);
    should.deepEqual(wordsInst.alternates('bhikkhu'), ['bhikkhu', 'bhikku', 'bikkhu']);
    should.deepEqual(wordsInst.alternates('Bhikkhu'), ['bhikkhu', 'bhikku', 'bikkhu']);
    should.deepEqual(wordsInst.alternates('bhikku'), ['bhikkhu', 'bhikku', 'bikkhu']);
    should.deepEqual(wordsInst.alternates('abhibhū'), ['abhibhū', 'abhibhu']);
    should.deepEqual(wordsInst.alternates('abhibhu'), ['abhibhū', 'abhibhu']);
  });

  it('romanize(text) returns romanized text', () => {
    const wordsInst = new Words();
    should(wordsInst.romanize('abc')).equal('abc');
    should(wordsInst.romanize('Abc')).equal('abc');
    should(wordsInst.romanize('Tathāgata')).equal('tathagata');
    should(wordsInst.romanize('Ukkaṭṭhā')).equal('ukkattha');
    should(wordsInst.romanize('Bhikkhū')).equal('bhikkhu');
    should(wordsInst.romanize('tassa’ti')).equal(`tassa${Words.U_RSQUOTE}ti`);
    should(wordsInst.romanize('sañnatvā')).equal(`sannatva`);
    should(wordsInst.romanize("pathaviṃ")).equal(`pathavim`);
    should(wordsInst.romanize('viñnānañcāyatanato')).equal(`vinnanancayatanato`);
    should(wordsInst.romanize("diṭṭhato")).equal(`ditthato`);
    should(wordsInst.romanize('khīṇāsavo')).equal(`khinasavo`);
    should(wordsInst.romanize("pavaḍḍhanti")).equal(`pavaddhanti`);
    should(wordsInst.romanize("ĀḌḤĪḶḸṂṆÑṄṚṜṢŚṬŪṁ")).equal(`adhillmnnnrrsstum`);
    should(wordsInst.romanize('‘Nandī dukkhassa mūlan’ti—')).equal(`${Words.U_LSQUOTE}nandi dukkhassa mulan${Words.U_RSQUOTE}ti${Words.U_EMDASH}`);
  });

  it('tokenize(text) handles numbers', () => {
    const wordsInst = new Words();
    let tokens = wordsInst.tokenize('one of 80,000—all');
    should.deepEqual(tokens, ['one', 'of', '80,000', '—', 'all']);
    tokens = wordsInst.tokenize('8,400,000,000 cars 2,400,000 and 6,000, and 600');
    should.deepEqual(tokens, ['8,400,000,000', 'cars', '2,400,000', 'and', '6,000', ',', 'and', '600']);
  });

  it('tokenize(text) returns array of tokens', () => {
    const wordsInst = new Words();
    let tokens = wordsInst.tokenize('Hello {mn1.2-en-test} world.');
    should.deepEqual(tokens, ['Hello', '{mn1.2-en-test}', 'world', '.']);
    const segments = ['he does not conceive earth', 'to be ‘mine,’.', 'Why is that?', 'Abhayarājakumārasutta', `abc${Words.U_EMDASH}def`];
    const text = segments.join(' ');
    tokens = wordsInst.tokenize(text);
    should.deepEqual(tokens, ['he', 'does', 'not', 'conceive', 'earth', 'to', 'be', '‘', 'mine', ',', '’', '.', 'Why', 'is', 'that', '?', 'Abhayarājakumārasutta', 'abc', Words.U_EMDASH, 'def']);
  });

  it('RE_ACRONYM matches acronyms', () => {
    should(Words.RE_ACRONYM.test('abc')).equal(false);
    should(Words.RE_ACRONYM.test('{abc}')).equal(true);
  });

  it('utf16(word, minCode) return Unicode-16 string escape', () => {
    const wordsInst = new Words();
    should(Words.utf16('aģ઼b', 0x7f)).equal('a\\u0123\\u0ABCb');
    should(Words.utf16('aģ઼b')).equal('\\u0061\\u0123\\u0ABC\\u0062');
  });

  it('ipa(word, language) return IPA for word', () => {
    const aend = `ä`;
    const sutta = `ˌsutt${aend}`;
    ipaCompare(`bab`, `bɐb`);
    ipaCompare(`a`, `ɐˈ`);
    ipaCompare(`ū`, `ʊː`);
    ipaCompare(`dvedhāvitakka`, `dvedʰɑvɪtɐk.k${aend}`);
  });

  it('add(word, language) return IPA for word', () => {
    const filePath = path.join(__dirname, 'data/en.json');
    const wordsInst = new Words(null, { filePath });
    should(wordsInst.lookup('centre')).equal(null);
    should(wordsInst.lookup('center')).equal(null);
    wordsInst.add('center', { alternates: ['centre'] });
    should.deepEqual(wordsInst.lookup('centre'), { word: 'center' });
    should.deepEqual(wordsInst.lookup('center'), { word: 'center' });
    should.deepEqual(wordsInst.alternates('centre'), ['center', 'centre']);
  });

  it('levenshtein(a,b) returns distance between word', () => {
    should(Math.min(321, 12, 42)).equal(12);
    should(Words.levenshtein('abc', 'abc')).equal(0);
    should(Words.levenshtein('bc', 'abc')).equal(1);
    should(Words.levenshtein('abc', 'axbyc')).equal(2);
    should(Words.levenshtein('abc', 'ABC')).equal(3);
    should(Words.levenshtein('know', 'knows')).equal(1);
  });

  it('commonPhrase(a,b,minLength) returns longest common word left sequence', () => {
    const minLength = 1;
    should(Words.commonPhrase(`b1 b2 v0aaa v1b`, `v0aaa v2b`, 4)).equal(`v0aaa`);
    should(Words.commonPhrase('a', 'b c', minLength)).equal('');
    should(Words.commonPhrase('a', 'a b c', minLength)).equal('a');
    should(Words.commonPhrase('a b c', 'b c', minLength)).equal('b c');
  });

  it('alternatesRegExp(text) creates a pattern for finding text', () => {
    const wordsInst = new Words();
    let pat = wordsInst.alternatesRegExp('bhikkhu');
    should(pat.test('asfd bhikkhu asdf')).equal(true);
    should(pat.test('asfd bikkhu asdf')).equal(true);
    should(pat.test('asfd bhikku asdf')).equal(true);
    should(pat.test('asfd biku asdf')).equal(false);
    should(pat.test('asfd bhikkhus asdf')).equal(false);
  });

  it('Words() loads de.json', () => {
    const wordsInst = new Words(undefined, { language: 'de' });
    should(wordsInst.language).equal('de');
    should.deepEqual(wordsInst.wordInfo('mit'), { language: 'de' });
    should(wordsInst.isWord('mit')).equal(true);
    should(wordsInst.isWord('füßen')).equal(true);
    should(wordsInst.isWord('wäldchen')).equal(true);
    should(wordsInst.isWord('hörte')).equal(true);
    should(wordsInst.isForeignWord('mit')).equal(false);
    should(wordsInst.isForeignWord('füßen')).equal(false);
    should(wordsInst.isForeignWord('wäldchen')).equal(false);
    should(wordsInst.isForeignWord('hörte')).equal(false);
    should(wordsInst.romanize('mit')).equal('mit');
    should(wordsInst.romanize('füßen')).equal('füßen');
    should(wordsInst.romanize('wäldchen')).equal('wäldchen');
    should(wordsInst.romanize('hörte')).equal('hörte');
  });

  it('symbols[symbol] returns info about symbol', () => {
    const wordsInst = new Words();
    should(wordsInst.symbols[ELLIPSIS]).properties({ isEllipsis: true });
  });
});
