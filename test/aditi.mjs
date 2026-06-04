import { describe, it, expect } from '@sc-voice/vitest';
import should from 'should';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { TtsPolly, SayAgain } = require('say-again');
const { logger, LogInstance } = require('log-instance');
const Polly = require('../src/polly.cjs');
const Voice = require('../src/voice.cjs');

const syllabifyLength = 5;
const ADITI_OPTS = {
  name: 'Aditi',
  usage: 'recite',
  locale: 'hi-IN',
  localeIPA: 'pli',
  stripNumbers: true,
  stripQuotes: true,
};
logger.logLevel = 'warn';

var cache = true;
const BREAK = '<break time="0.001s"/>';

function phoneme(ph, text) {
  return new RegExp(
    `<phoneme alphabet="ipa" ph="${ph}">${text}</phoneme>`);
}

function testPhoneme(recite, ph, text) {
  var ssml = recite.segmentSSML(text)[0];
  expect(ssml.indexOf(ph)).toBeGreaterThan(
    -1
  );
}

describe('aditi', () => {
  it('createVoice() creates Aditi', () => {
    var aditi = Voice.createVoice('aditi');
    expect(aditi.name).toBe('Aditi');
    expect(aditi.locale).toBe('hi-IN');
    expect(aditi.localeIPA).toBe('pli');
    expect(aditi.maxSegment).toBe(400);
    expect(aditi.fullStopComma).toBe(true);
    expect(aditi.syllableVowels).toBe('aeiouāīū');
    expect(aditi.syllabifyLength).toBe(syllabifyLength);
    should(aditi.sayAgain).instanceOf(SayAgain);

    var recite = aditi.services['recite'];
    expect(recite.fullStopComma).toBe(true);
    expect(recite.maxSegment).toBe(400);
    expect(recite.syllableVowels).toBe('aeiouāīū');
    expect(recite.syllabifyLength).toBe(syllabifyLength);

    var aditi = Voice.createVoice(
      Object.assign({}, ADITI_OPTS, {
        syllableVowels: 'aeiou',
      })
    );
    expect(aditi.syllableVowels).toBe('aeiou');
    var recite = aditi.services['recite'];
    expect(recite.syllableVowels).toBe('aeiou');
  });
  it('segmentSSML(text) returns SSML', () => {
    var aditi = Voice.createVoice(ADITI_OPTS);
    var recite = aditi.services['recite'];

    testPhoneme(recite, 'seʈ.ʈʰo', 'seṭṭho');

    testPhoneme(recite, "m’ɪɖʱe kəc ce", "m’idhekacce");

    testPhoneme(recite, 'ə sesəŋ"', 'asesaṃ;');

    var ssml = recite.segmentSSML('disā, disā');
    expect(ssml.length).toBe(2);
    expect(ssml[0].split('phoneme').length).toBe(3);

    testPhoneme(recite, "pɑ’ɽe", "pare");

    testPhoneme(recite, 'd̪ək kʰɪn ej jəŋ', 'dakkhiṇeyyaṃ');
    testPhoneme(
      recite,
      'əc chə ɾɪ jə əb bʰʊ t̪ə sʊt̪ t̪ə',
      'acchariyaabbhutasutta'
    );
    testPhoneme(recite, 'bʰə gə v\\ən \'t̪əŋ je v\\ə', 'bhagavantaṃyeva');
    testPhoneme(recite, `səb bə 'səŋ je v\\ə`, 'sabbasaṃyeva');
    testPhoneme(recite, `ve j jɑː kə ɾə ɳəŋ`, 'veyyākaraṇaṃ');
    testPhoneme(recite, `pəc cə v\\ek kʰe j jə`, 'paccavekkheyya');
    testPhoneme(recite, `v\\e sɑː lɪ jəŋ`, 'vesāliyaṃ');
    testPhoneme(recite, `pə ʈɪ 'səŋ ʋẽ d̪e t̪ɪi`, "paṭisaṃvedetī");
    testPhoneme(recite, `pə ɾɪ sʊɖ ɖʱəŋ`, `parisuddhaṃ`);

    testPhoneme(recite, 'bʰɪk kʰʊ səŋ gʰo', 'bhikkhusaṅgho');
    testPhoneme(recite, 'səŋ gʰe', 'saṃghe');
    testPhoneme(recite, 'pəɲ ɲə', 'Pañña');
    testPhoneme(recite, 'səŋ kʰɑː ɾə', 'saṅkhāra');
    testPhoneme(recite, 'bɾɑːh mə ɳəŋ', 'brāhmaṇaṃ');
    testPhoneme(recite, 'gɪdʒ.dʒʱə ku: ʈe', 'gijjhakūṭe');
    testPhoneme(recite, 'cɪt̪ t̪əs sə', 'cittassa');
    testPhoneme(recite, 'chən no v\\ɑː d̪ə', 'Channovāda');
    testPhoneme(recite, 'phəg gʊ ɳə', 'Phagguṇa');
    testPhoneme(recite, 'sət̪ɪ', 'sati');
    testPhoneme(recite, 'səʈ ʈhɪ', 'saṭṭhi');
    testPhoneme(recite, 'sət̪ t̪ʰɪ', 'satthi');
    testPhoneme(recite, 'd̪əɳ ɖə kə', 'daṇḍaka');
    testPhoneme(recite, 'ɖhəm mə', 'Dhamma');
    testPhoneme(recite, 'ɖhə mə', 'Dhama');
    testPhoneme(recite, 'si ɾɪ v\\əɖ ɖhə', 'sirivaḍḍha');
    testPhoneme(recite, 'bɑː lə kə', 'bālaka');
    testPhoneme(recite, 'bʰəl lɪ kə', 'bhallika');
    testPhoneme(recite, 'd̪e v\\ə d̪ə hə', 'devadaha');
    testPhoneme(recite, 'jəsə', 'yasa');
    testPhoneme(recite, 'ʊ pə kɑː ʟ̈ə', 'upakāḷa');
    testPhoneme(recite, 'nɑː ʟ̈ən d̪ɑː', 'nāḷandā');
    testPhoneme(recite, 'nɑː lən d̪ɑː', 'nālandā');
    testPhoneme(recite, 'nəʟ̈ həŋ', 'naḷhaṃ');

    testPhoneme(recite, "ẽso", "eso");
    testPhoneme(recite, 'bʰɪk kʰʊ nɪŋ', 'bhikkhuniṃ');
    testPhoneme(recite, "ẽ ʟ̈ə kəŋ", "eḷakaṃ");
    testPhoneme(recite, "ẽsə", "esa");
    testPhoneme(recite, "pə sẽ nə d̪ɪs sə", "pasenadissa");
    testPhoneme(recite, 'v\\e sɑː ɾəʝ.ʝəp pət̪ t̪o', 'vesārajjappatto');

    var ssml = recite.segmentSSML('dve, dve');
    expect(ssml.length).toBe(2);
    var ssml = recite.segmentSSML('2. Dve');
    expect(ssml.length).toBe(1);
  });
  it('segmentSSML(text) doesn\'t orphan punctuation', () => {
    var aditi = Voice.createVoice(ADITI_OPTS);
    var recite = aditi.services['recite'];
    var text = [
      'Sace,',
      'bhikkhave,',
      'adhicittamanuyutto',
      'bhikkhu',
      'ekantaṃ',
      'samādhinimittaṃyeva',
      'manasi',
      'kareyya,',
      'ṭhānaṃ',
      'taṃ',
      'cittaṃ',
      'kosajjāya',
      'saṃvatteyya.',
    ].join(' ');
    var ssml = recite.segmentSSML(text);
    expect(
      ssml.filter((s) => s === '.')
    ).toEqual([]);
  });
  it('tokensSSML(text) handles UTF8 punctuation', () => {
    var aditi = Voice.createVoice(ADITI_OPTS);
    var recite = aditi.services['recite'];
    var tokens = recite.tokenize('bbhantarā; kammantā—uṇṇāti: vā');
    expect(tokens[1]).toBe(';');
    expect(tokens[3]).toBe('—');
    expect(tokens[5]).toBe(':');
  });
  it('tokensSSML(text) handles jj', () => {
    var aditi = Voice.createVoice(ADITI_OPTS);
    var recite = aditi.services['recite'];
    var ph = (a, b) => `<phoneme alphabet="ipa" ph="${a}">${b}</phoneme>`;
    var brk = `<break time="0.001s"/>`;

    var tokens = recite.tokensSSML('satisambojjhaṅgaṃ');
    expect(tokens).toEqual([
      `${ph('sə t̪ɪ səm \'bodʒ.dʒʱəŋ gəŋ', 'satisambojjhaṅgaṃ')}${brk}`,
    ]);

    var tokens = recite.tokensSSML('saṃvijjamānā');
    expect(tokens).toEqual([
      `${ph('səŋ v\\ɪʝ.ʝə mɑː nɑː', 'saṃvijjamānā')}${brk}`,
    ]);
  });
  it('tokensSSML(text) handles custom words', () => {
    var aditi = Voice.createVoice(ADITI_OPTS);
    var recite = aditi.services['recite'];
    var ph = (a, b) => `<phoneme alphabet="ipa" ph="${a}">${b}</phoneme>`;
    var brk = `<break time="0.001s"/>`;

    var tokens = recite.tokensSSML('nivesetabbā');
    expect(tokens).toEqual([
      `${ph("'nɪ v\\e sẽ t̪əb bɑː", "nivesetabbā")}${brk}`,
    ]);
  });
  it('tokensSSML(text) handles ellipsis', async () => {
    var aditi = Voice.createVoice(ADITI_OPTS);
    var res = await aditi.speak('… ');
    expect(res.signature.text).toMatch(/break time/);
  });
  it('tokensSSML(text) handles kaya-', async () => {
    var aditi = Voice.createVoice(ADITI_OPTS);
    var res = await aditi.speak('kayavikkayā');
    expect(res.signature.text).toMatch(/"kə \'jə v\\ɪk kə jɑː"/);
  });
  it('tokensSSML(text) handles #', async () => {
    var aditi = Voice.createVoice(ADITI_OPTS);
    var res = await aditi.speak('Ayaṁ eko dhammo bahukāro. #1 ');
    expect(res.signature.text).toMatch(
      /<phoneme alphabet="ipa" ph="əjəŋ">Ayaṁ/
    );
  });
  it('Katame pañca?#', async () => {
    var aditi = Voice.createVoice(ADITI_OPTS);
    var res = await aditi.speak('Katame pañca?');
    expect(res.signature.text).toMatch(/kə t̪ə me"/);
  });
  it('kiñcī\'ti paṭisañcikkhati', async () => {
    var aditi = Voice.createVoice(ADITI_OPTS);
    var res = await aditi.speak('kiñcī\'ti paṭisañcikkhati');
    expect(res.signature.text).toMatch(/kɪɳ cɪi/);
    expect(res.signature.text).toMatch(/pə ʈɪ səɳ cɪk kʰə t̪ɪ"/);
  });
});
