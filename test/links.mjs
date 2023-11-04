import Links from "../src/links.mjs";
import { SuttaRef }  from "scv-esm/main.mjs";
import should from "should";

const VOICE="https://voice.suttacentral.net/scv/";
const DHAMMAREGEN = "https://dhammaregen.net/";
const SC_VOICE_NET = "https://sc-voice.net/";

typeof describe === "function" && describe("links", function() {
  it ("TESTTESTebtSuttaRefLink)()", ()=>{
    let links = new Links();
    let test = (sutta_uid, lang, author)=>links.ebtSuttaRefLink({
      sutta_uid, lang, author });

    // site
    should(test('site')).equal(`${SC_VOICE_NET}`);
    should(test('site', 'de')).equal(`${DHAMMAREGEN}`);

    // de
    should(test('thig1.1', 'de', 'sabbamitta')).equal(
      `${DHAMMAREGEN}#/sutta/thig1.1/de/sabbamitta`);
    should(test('thig1.1', 'de')).equal(
      `${DHAMMAREGEN}#/sutta/thig1.1/de`);

    // en
    should(test('thig1.1')).equal(
      `${SC_VOICE_NET}#/sutta/thig1.1/en`);
    should(test('thig1.1:1.2')).equal(
      `${SC_VOICE_NET}#/sutta/thig1.1:1.2/en`);
    should(test('thig1.1', 'en')).equal(
      `${SC_VOICE_NET}#/sutta/thig1.1/en`);

    //`${VOICE}/?search=thig1.1&lang=en`);
  });
})
