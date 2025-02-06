import Links from "../src/links.mjs";
import { SuttaRef }  from "scv-esm/main.mjs";
import should from "should";

const VOICE="https://voice.suttacentral.net/scv/";
const DHAMMAREGEN = "https://dhammaregen.net/?src=sc";
const FR_SC_VOICE_NET = "https://fr.sc-voice.net/?src=sc";
const SC_VOICE_NET = "https://sc-voice.net/?src=sc";

typeof describe === "function" && describe("links", function() {
  it ("ebtSuttaRefLink)() site", ()=>{
    let links = new Links();
    let test = (sutta_uid, lang, author)=>links.ebtSuttaRefLink({
      sutta_uid, lang, author });

    // site
    should(test('site', 'jpn')).equal(`${SC_VOICE_NET}`);
    should(test('site')).equal(`${SC_VOICE_NET}`);
    should(test('site', 'de')).equal(`${DHAMMAREGEN}`);
    should(test('site', 'fr')).equal(`${FR_SC_VOICE_NET}`);
  });
  it ("TESTTESTebtSuttaRefLink)() suttaplex", ()=>{
    let links = new Links();
    let test = (sutta_uid, lang, author)=>links.ebtSuttaRefLink({
      sutta_uid, lang, author });

    // Unsupported languages
    should(test('mil1/ru')).equal(
      `${SC_VOICE_NET}#/sutta/mil1/en`);
    should(test('mil1/in')).equal(
      `${SC_VOICE_NET}#/sutta/mil1/en`);

    // EBT-Sites
    should(test('mn8', 'fr')).equal(
      `${FR_SC_VOICE_NET}#/sutta/mn8/fr/noeismet`);
    should(test('thig1.1', 'de')).equal(
      `${DHAMMAREGEN}#/sutta/thig1.1/de/sabbamitta`);
    should(test('mil1')).equal(
      `${SC_VOICE_NET}#/sutta/mil1/en`);
    should(test('mil3.1.1')).equal(
      `${SC_VOICE_NET}#/sutta/mil3.1.1/en/kelly`);
    should(test('thig1.1:1.2')).equal(
      `${SC_VOICE_NET}#/sutta/thig1.1:1.2/en/sujato`);
    should(test('thig1.1')).equal(
      `${SC_VOICE_NET}#/sutta/thig1.1/en/sujato`);
    should(test('thig1.1:1.2')).equal(
      `${SC_VOICE_NET}#/sutta/thig1.1:1.2/en/sujato`);
    should(test('thig1.1', 'en')).equal(
      `${SC_VOICE_NET}#/sutta/thig1.1/en/sujato`);
  });
  it ("ebtSuttaRefLink)() sutta", ()=>{
    let links = new Links();
    let test = (sutta_uid, lang, author)=>links.ebtSuttaRefLink({
      sutta_uid, lang, author });

    // soma
    should(test('thig1.1', 'en', 'soma')).equal(
      `${SC_VOICE_NET}#/sutta/thig1.1/en/soma`);

    // fr
    should(test('mn8', 'fr', 'noeismet')).equal(
      `${FR_SC_VOICE_NET}#/sutta/mn8/fr/noeismet`);

    // de
    should(test('thig1.1', 'de', 'sabbamitta')).equal(
      `${DHAMMAREGEN}#/sutta/thig1.1/de/sabbamitta`);
  });
})
