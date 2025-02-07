import ScvApi from "../src/scv-api.cjs";
import { BilaraData } from "scv-bilara";
import Links from "../src/links.mjs";
import AudioUrls from "../src/audio-urls.cjs";
import SoundStore from "../src/sound-store.cjs";
import SuttaStore from "../src/sutta-store.cjs";
import Task from "../src/task.cjs";
import { UrlProbe, StateLog, Monitor } from "@sc-voice/state-log";
import { logger } from 'log-instance';

import { MerkleJson } from "merkle-json";

const SC_VOICE_NET = "https://sc-voice.net";

class MockResponse {
  constructor(data, code, type) {
    this.mockData = data;
    this.statusCode = code;
    this.mockType = type;
    this.mockHeaders = {};
  }

  send(data) { this.mockData = data; }
  redirect(link) { this.mockRedirect = link; }
  status(code) { this.statusCode = code; }
  type(t) { this.mockType = t; }
  set(key, value) { this.mockHeaders[key] = value; }
}

async function nap(ms) {
  return new Promise(resolve=>setTimeout(()=>resolve(), ms));
}

typeof describe === "function" && describe("scv-api", function() {
    this.timeout(15*1000);
    let params = {};              // testing default
    let query = { maxResults: 3}; // testing default
    let bilaraData;

    before(async ()=>{
      bilaraData = new BilaraData({ name: 'ebt-data', });
      await bilaraData.initialize();
      should(bilaraData.initialized).equal(true);
    });

    // Create a test singleton to speed up testing
    const TESTSINGLETON = 1;
    var scvApi; 
    async function testScvApi(singleton=TESTSINGLETON) {
      if (!singleton) {
        return await new ScvApi({bilaraData}).initialize();
      }
      if (scvApi == null) {
        scvApi = new ScvApi({bilaraData});
      }
      let resInit = await scvApi.initialize();
      should(resInit).equal(scvApi);
      should(scvApi.voices.length).above(14).below(50);
      return scvApi;
    }

    it ("default ctor", ()=>{
      let api = new ScvApi();
      should(api).properties({
        name: 'scv',
        wikiUrl: 'https://github.com/sc-voice/sc-voice/wiki',
        jwtExpires: '1h',
        downloadMap: {},
      });
      should(api.mj).instanceOf(MerkleJson);
      should(api.soundStore).instanceOf(SoundStore);
    });
    it("ScvApi must be initialized", async()=>{
      let api = new ScvApi();
      should(api.initialized).equal(undefined);

      let res = await api.initialize();  // actual initialization
      should(api.initialized).equal(true);

      res = await api.initialize(); // ignored
      should(api.initialized).equal(true);

      should(res).equal(api);
    });
    it("getEbtSite() => thig1.1", async()=>{
      let api = await testScvApi();
      let sutta_uid = 'thig1.1';
      let lang = 'de';
      let author;
      let params = { sutta_uid, lang, author };
      let response = new MockResponse();
      let httpRes = await api.getEbtSite({params}, response);
      should(response).properties({
        mockRedirect: 
          'https://dhammaregen.net/?src=sc#/sutta/thig1.1/de/sabbamitta',
      });
    });
    it("getLinks() => thig1.1", async()=>{
      let api = await testScvApi();
      let sutta_uid = 'thig1.1';
      let lang = 'de';
      let author;
      let params = { sutta_uid, lang, author };
      let res = await api.getLinks({params});
      should(res).properties({
        link: 
          'https://dhammaregen.net/?src=sc#/sutta/thig1.1/de/sabbamitta',
      });
    });
    it("getLinks() => thig1.1:2.3", async()=>{
      let api = await testScvApi();
      let sutta_uid = 'thig1.1:1.2';
      let lang = 'en';
      let author = 'soma';
      let params = { sutta_uid, lang, author };
      let res = await api.getLinks({params});
      should(res).properties({
        link: `${SC_VOICE_NET}/?src=sc#/sutta/${sutta_uid}/${lang}/${author}`,
      });
    });
    it("getSearch() => dn16 -dl en", async()=>{
      let api = await testScvApi();
      let suid = 'dn16';
      let lang = 'en';
      let pattern = `${suid} -dl ${lang}`;
      let params = { lang, pattern}; 
      //logger.logLevel = 'debug';
      let res = await api.getSearch({params, query});
      let { 
        trilingual, method, results,
        author, docAuthor, docLang, refAuthor, refLang,
      } = res;
      let mld0 = res.mlDocs[0];
      should(mld0).not.equal(undefined);
      let seg0_2 = mld0.segMap['mn28:0.2'];
      should(results[0].stats.seconds).above(10000).below(15000);
    });
    it("getSearch() => dn16 -dl de", async()=>{
      let api = await testScvApi();
      let suid = 'dn16';
      let lang = 'de';
      let pattern = `${suid} -dl ${lang} -rl en`;
      let params = { lang, pattern}; 
      //logger.logLevel = 'debug';
      let res = await api.getSearch({params, query});
      let { 
        trilingual, method, results,
        author, docAuthor, docLang, refAuthor, refLang,
      } = res;
      let mld0 = res.mlDocs[0];
      should(mld0).not.equal(undefined);
      let seg0_2 = mld0.segMap['mn28:0.2'];
      should(results[0].stats.seconds).above(10000).below(15000);
    });
    it("getSearch() => mn28 -dl de", async()=>{
      let api = await testScvApi();
      let suid = 'mn28';
      let pattern = `${suid} -dl de`;
      let params = { lang: 'de', pattern}; 
      //logger.logLevel = 'debug';
      let res = await api.getSearch({params, query});
      let { 
        trilingual, method, results,
        author, docAuthor, docLang, refAuthor, refLang,
      } = res;
      let mld0 = res.mlDocs[0];
      should(mld0).not.equal(undefined);
      let seg0_2 = mld0.segMap['mn28:0.2'];
      should(results[0].stats.seconds).above(1000).below(1500);

      should(docAuthor).equal('sabbamitta');
      should(docLang).equal('de');
      should(refAuthor).equal('sujato');
      should(refLang).equal('en');
      should(method).equal('sutta_uid');
      should(trilingual).equal(true);
      should(seg0_2.scid).equal('mn28:0.2');
      should(seg0_2.de).equal(
        'Das längere Gleichnis von der Elefanten-Fußspur ');
      should(seg0_2.en).equal(undefined);
      should(seg0_2.ref).equal(
        'The Longer Simile of the Elephant’s Footprint ');
    });
    it("getSearch() => sn22.56/de", async()=>{
      let api = await testScvApi();
      let suid = 'sn22.56';
      let params = { lang: 'de', pattern: suid }; 
      //logger.logLevel = 'debug';
      let res = await api.getSearch({params, query});
      let { method, results } = res;
      should(results).instanceOf(Array);
      should(results.length).equal(1);
      should.deepEqual(results.map(r => r.uid),[ suid, ]);
      should(results[0].sutta.author_uid).equal('sabbamitta');
      should(method).equal('sutta_uid');
    });
    it("getSearch() => dn7/de", async()=>{
      let api = await testScvApi();
      let params = { lang: 'de', pattern: 'dn7' }; 
      let res = await api.getSearch({params, query});
      let { method, results } = res;
      should(results).instanceOf(Array);
      should(results.length).equal(1);
      should.deepEqual(results.map(r => r.uid),[
          'dn7', 
      ]);
      should(results[0].sutta.author_uid).equal('sabbamitta');
      should(method).equal('sutta_uid');
    });
    it("getSearch(invalid)", async()=>{
      let api = await testScvApi();
      var eCaught;

      try { // Missing pattern
        eCaught = undefined;
        let res = await api.getSearch({params,query});
      } catch(e) {
        eCaught = e;
      }
      should(eCaught.message).match(/pattern is required/);

      try { // non-numeric maxResults
        eCaught = undefined;
        let params = {pattern: "dn7"};
        let query = {maxResults:'asdf'};
        let res = await api.getSearch({params,query});
      } catch(e) {
        eCaught = e;
      }
      should(eCaught.message).match(/expected number for maxResults/i);
    });
    it("getSearch() => root of suffering", async()=>{
      let api = await testScvApi();
      let params = {pattern: "root of suffering"};
      
      { // maxResults: 3
        let query = {maxResults:3};
        let { method, results } = await api.getSearch({params,query});
        should(method).equal('phrase');
        should(results).instanceOf(Array);
        should(results.length).equal(3);
        should.deepEqual(results.map(r => r.uid),[
          'sn42.11', 'mn105', 'mn1',
      ]);
      should.deepEqual(results.map(r => r.count),
          [ 5.091, 3.016, 2.006  ]);
      }

      { // default maxResults
        let query = {};
        let { method, results } = await api.getSearch({params,query});
        should(method).equal('phrase');
        should(results).instanceOf(Array);
        should(results.length).equal(5);
        should(results[0].stats.seconds).above(300).below(500);
        should.deepEqual(results[0].audio,undefined);
        should.deepEqual(results.map(r => r.uid),[
          'sn42.11', 'mn105', 'mn1', 'sn56.21', 'mn116',
        ]);
      }
    });
    it("getSearch() => -l de -ra soma thig1.1", async()=>{
      let api = await testScvApi();
      let params = {pattern: "root of suffering"};
      
      { // maxResults: 3
        let query = {maxResults:3};
        let { method, results } = await api.getSearch({params,query});
        should(method).equal('phrase');
        should(results).instanceOf(Array);
        should(results.length).equal(3);
        should.deepEqual(results.map(r => r.uid),[
          'sn42.11', 'mn105', 'mn1',
      ]);
      should.deepEqual(results.map(r => r.count),
          [ 5.091, 3.016, 2.006  ]);
      }

      { // default maxResults
        let query = {};
        let { method, results } = await api.getSearch({params,query});
        should(method).equal('phrase');
        should(results).instanceOf(Array);
        should(results.length).equal(5);
        should.deepEqual(results[0].audio,undefined);
        should.deepEqual(results.map(r => r.uid),[
          'sn42.11', 'mn105', 'mn1', 'sn56.21', 'mn116',
        ]);
      }
    });
    it("getSearch()  sleep with ease", async()=>{
      let api = await testScvApi();
      let pattern = [
        "sleep with ease",
        '-dl en',
        '-da soma',
        '-rl en',
        '-ra sujato',
        '-ml1',
      ].join(' ');
      let params = {pattern};
      
      { // maxResults: 3
        let query = {maxResults:3};
        let { method, results } = await api.getSearch({params,query});
        should(method).equal('phrase');
        should(results).instanceOf(Array);
        should(results.length).equal(1);
        should.deepEqual(results.map(r => r.uid),[
          'thig1.1',
        ]);
        should.deepEqual(results.map(r => r.count), [ 1.111 ]);
      }
    });
    /* DEPRECATED
    it("getAwsCreds() => obfuscated", async()=>{
      let api = await testScvApi();
      let creds = await api.getAwsCreds({});
      let properties = ['accessKeyId', 'secretAccessKey'];
      should(creds.Bucket).equal('sc-voice-vsm');
      should(creds.s3).properties({region:'us-west-1'});
      should(creds.s3).properties(properties);
      should(creds.s3.accessKeyId.startsWith('*****')).equal(true);
      should(creds.polly).properties({region:'us-west-1'});
      should(creds.polly).properties(properties);
      should(creds.polly.accessKeyId.startsWith('*****')).equal(true);
    })
    */
    it("getPlaySegment() => mn1:0.1", async()=>{
      let api = await testScvApi();
      let scid = "mn1:0.1";
      let langTrans = 'en';
      let translator = 'sujato';
      let vnameTrans = 'Matthew';
      let params = { langTrans, translator, scid, vnameTrans };
      let query = {};
      
      let res = await api.getPlaySegment({params, query});
      should(res).properties({
        sutta_uid: 'mn1',
        scid,
        langTrans,
        language: langTrans,
        translator,
        title: 'Middle Discourses 1 ',
        section: 0,
      });
      should(res.segment).properties({
        scid,
        pli: 'Majjhima Nikāya 1 ',
        en: 'Middle Discourses 1 ',
        matched: true,
        audio: {
          en: 'c525ba7deccd71378172e4f9cff46904',
          pli: 'eb2c6cf0626c7a0f422da93a230c4ab7',
        },
      });
    });
    it("getPlaySegment() => mn1:3.4", async()=>{
      let api = await testScvApi();
      let scid = "mn1:3.4";
      let langTrans = 'en';
      let translator = 'sujato';
      let vnameTrans = 'Matthew';
      let params = { langTrans, translator, scid, vnameTrans };
      let query = {};
      
      let res = await api.getPlaySegment({params, query});
      should(res).properties({
        sutta_uid: 'mn1',
        scid,
        langTrans,
        language: langTrans,
        translator,
        title: 'Middle Discourses 1 ',
        section: 0,
      });
      should(res.segment).properties({
        scid,
        pli: 'Taṁ kissa hetu? ',
        en: 'Why is that? ',
        matched: true,
        audio: {
          en: '3f8a5730048bbfd5db1cf7978b15f99f',
          pli: '53db7b850e2dae7d90ee0114843f5ac7',
        },
      });
    });
    it("getPlaySegment() => large segment", async()=>{
      let api = await testScvApi();
      let scid = "an2.281-309:1.1";
      let langTrans = 'en';
      let translator = 'sujato';
      let vnameTrans = 'Matthew';
      let params = { langTrans, translator, scid, vnameTrans };
      let query = {};
      
      let res = await api.getPlaySegment({params, query});
      should.deepEqual(res.segment.audio, {
        en: '0e4f691b0e8b0d8adfdd670d970dbb91',
        pli: '93c80a6ed3f7a3a931a451735c59df39',
      });
    });
    it("getPlaySegment() => cnd1:1.1", async()=>{
      let api = await testScvApi();
      let scid = "cnd1:1.1";
      let langTrans = 'pli';
      let translator = 'ms';
      let vnameTrans = 'Aditi';
      let params = { langTrans, translator, scid, vnameTrans };
      let query = {};
      
      let res = await api.getPlaySegment({params, query});
      should.deepEqual(res.segment.audio, {
        pli: '02cb4081a1c52b029a5f80c79d5bd3bd',
      });
    });
    it("getPlaySegment => Aditi sn1.1:1.3", async()=>{
      let api = await testScvApi();
      let scid = "sn1.1:1.3";
      let sutta_uid = scid.split(":")[0];
      let langTrans = 'en';
      let translator = 'sujato';
      let vnameTrans = "Amy";
      let vnameRoot = "aditi";
      let params = { langTrans, translator, scid, vnameTrans, vnameRoot };
      let query = {};
      let res = await api.getPlaySegment({params, query});
      should(res).properties({
        sutta_uid,
        scid,
        langTrans,
        translator,
        vnameTrans: 'Amy',
        vnameRoot: 'Aditi',
      });
      should(res.segment.audio).properties({
        en: 'bbe28c63cba7aa04ac2ee08a837e873a',
        pli: '29e610dabb4042653d1a30373933e342',
      });
    });
    it("getPlaySegment => HumanTts sn1.1:0.2", async()=>{
      let api = await testScvApi();
      let scid = "sn1.9:0.2";
      let sutta_uid = scid.split(":")[0];
      let langTrans = 'en';
      let translator = 'sujato';
      let vnameTrans = "sujato_en";
      let vnameRoot = "sujato_pli";
      let params = { langTrans, translator, scid, vnameTrans, vnameRoot };
      let query = {};
      let res = await api.getPlaySegment({params, query});
      should(res).properties({
        sutta_uid,
        scid,
        langTrans,
        translator,
        vnameTrans: 'Amy',
        vnameRoot: 'Aditi',
      });
      should(res.segment.audio).properties({
        en: '399a42cb8c635d84d8a58d421fd844ea',
        pli: '88ebe8878aee4b27e775b2e05ea39302',
      });
    });
    it("getPlaySegment => HumanTts sn1.1:0.3", async()=>{
      let api = await testScvApi();
      let scid = "sn1.9:0.3";
      let sutta_uid = scid.split(":")[0];
      let langTrans = 'en';
      let translator = 'sujato';
      let vnameTrans = "Matthew";
      let vnameRoot = "sujato_pli";
      let params = { langTrans, translator, scid, vnameTrans, vnameRoot };
      let query = {};
      let res = await api.getPlaySegment({params, query});
      should(res).properties({
        sutta_uid,
        scid,
        langTrans,
        translator,
        vnameTrans,
        vnameRoot,
      });
      should(res.segment.audio).properties({
        en: '5e8c05e6f52a00b58a4be8c90a7d36e9',
        pli: '8d7a014474c041125b5132ae94dc8c7e',
      });
    });
    it("getPlaySegment() => HumanTts DN33", async()=>{
      let api = await testScvApi();
      let scid = "dn33:0.1";
      let langTrans = 'en';
      let translator = 'sujato';
      let vnameTrans = 'sujato_en';
      let vnameRoot = 'sujato_pli';
      let params = { langTrans, translator, scid, vnameTrans };
      let query = {};
      
      let res = await api.getPlaySegment({params, query});
      should(res).properties({
        sutta_uid: 'dn33',
        scid,
        langTrans,
        translator,
        title: 'Long Discourses 33 ',
        section: 0,
        nSections: 12,
        vnameTrans: 'Amy',
        iSegment: 0,
      });
      should.deepEqual(res.segment, {
        scid,
        pli: 'Dīgha Nikāya 33 ',
        en: 'Long Discourses 33 ',
        ref: 'Long Discourses 33 ',
        matched: true,
        audio: {
          en: 'b06d3e95cd46714448903fa8bcb12004',
          pli: '899e4cd12b700b01200f295631b1576b',
        },
      });
    });
    it("getPlaySegment() => Soma", async()=>{
      let api = await testScvApi();
      let scid = "thig1.1:1.1"
      let langTrans = 'en';
      let translator = 'soma';
      let vnameTrans = 'Amy';
      let params = { langTrans, translator, scid, vnameTrans };
      let query = {};
      
      let res = await api.getPlaySegment({params, query});
      should.deepEqual(res.segment, {
        scid,
        pli: '“Sukhaṁ supāhi therike, ',
        en: '“Sleep with ease, Elder, ', // Soma
        ref: 'Sleep softly, little nun, ', // Sujato
        matched: true,
        audio: {
          en: '37cedc61727373870e197793e653330d', // Soma
          pli: '4fb90df3760dd54ac4f9f3c31358c8fa',
        },
      });
    });
    it("getAudio() => Soma", async()=>{
      let filename = 'test-file.mp3';
      let guid = '37cedc61727373870e197793e653330d';
      let sutta_uid = 'thig1.1';
      let langTrans = 'en';
      let translator = 'soma';
      let vnameTrans = 'Amy';
      let api = await testScvApi();
      let params = { 
        filename, guid, sutta_uid, langTrans, translator, vnameTrans,
      };
      let query = {};
      let response = new MockResponse();

      let data = await api.getAudio({params, query}, response);
      should(data.length).equal(13524); // audio
      should(response).properties({
        mockHeaders: {
          'accept-ranges': 'bytes',
          'do_stream' : 'true',
          'Content-disposition': `attachment; filename=${filename}`
        }
      });
    });
    it("getAudio() dhamma", async()=>{
      let filename = 'test-file.mp3';
      let guid = '9937cb38e7d47725b5c00449d72eb40e';
      let langTrans = 'en';
      let translator = 'pli';
      let vnameTrans = 'Aditi';
      let api = await testScvApi();
      let sutta_uid = 'dpd';
      let params = { 
        filename, guid, sutta_uid, langTrans, translator, vnameTrans,
      };
      let query = {};
      let response = new MockResponse();

      let data = await api.getAudio({params, query}, response);
      should(data.length).equal(6157); // audio
      should(response).properties({
        mockHeaders: {
          'accept-ranges': 'bytes',
          'do_stream' : 'true',
          'Content-disposition': `attachment; filename=${filename}`
        }
      });
    });
    it("downloadArgs() => validated args", async()=>{
      let api = await testScvApi();
      let suidref = "thig1.1/en/soma";
      let pattern = encodeURIComponent(suidref);
      let vtrans = 'Vicki';
      let vroot = 'Raveena';
      let langs = ['de', 'pli'];
      let lang = 'de';

      should(api.downloadArgs({pattern})).properties({pattern:suidref});
      should.throws(()=>api.downloadArgs()); // no pattern

      should(api.downloadArgs({pattern, })).properties({vtrans: 'Amy'});
      should(api.downloadArgs({pattern, vtrans})).properties({vtrans});

      should(api.downloadArgs({pattern, })).properties({vroot: 'Aditi'});
      should(api.downloadArgs({pattern, vroot})).properties({vroot});

      should(api.downloadArgs({pattern, audioSuffix:".OGG"}))
        .properties({audioSuffix: '.ogg'});
      should(api.downloadArgs({pattern, audioSuffix:".ogg"}))
        .properties({audioSuffix: '.ogg'});
      should(api.downloadArgs({pattern, audioSuffix:"opus"}))
        .properties({audioSuffix: '.opus'});
      should(api.downloadArgs({pattern, audioSuffix:".opus"}))
        .properties({audioSuffix: '.opus'});
      should(api.downloadArgs({pattern, audioSuffix:"mp3"}))
        .properties({audioSuffix: '.mp3'});
      should(api.downloadArgs({pattern, audioSuffix:".mp3"}))
        .properties({audioSuffix: '.mp3'});
      should.throws(()=>api.downloadArgs({pattern, audioSuffix:"bad"}));

      should(api.downloadArgs({pattern}))
      .properties({langs: ['pli', 'en']});
      should(api.downloadArgs({pattern, langs})).properties({langs});
      should(api.downloadArgs({pattern, langs:'de+pli'}))
      .properties({langs});
      should.throws(()=>api.downloadArgs({pattern, langs:911}));
      should.throws(()=>api.downloadArgs({pattern, langs:{BAD:911}}));

      should(api.downloadArgs({pattern})).properties({lang: 'en'});
      should(api.downloadArgs({pattern, lang:'jpn'}))
      .properties({lang: 'jpn'});
      should(api.downloadArgs({pattern, lang:'jpn'}))
      .properties({lang: 'jpn'});
      should(api.downloadArgs({pattern, lang})).properties({lang});
      should.throws(()=>api.downloadArgs({pattern, lang:911}));
    });
    it("buildDownload() => thig1.1/en/soma", async()=>{
      let audioSuffix = "opus";
      let lang = 'en';
      let langs = 'pli+en';
      let maxResults = 5;
      let pattern = "thig1.1/en/soma";
      let vroot = "Aditi";
      let vtrans = "Matthew";

      let params = { 
        audioSuffix, lang, langs, maxResults, pattern, vroot, vtrans,
      };
      let api = await testScvApi();
       
      let res = await api.buildDownload({
        audioSuffix, lang, langs, maxResults, pattern, vroot, vtrans,
      });
      should(res.filepath).match(/api.sc-voice.net\/local\/sounds\/common/);
      should(res.filepath).match(/26eef1bb9d46a5aef5c4e4a283b30fb4.opus/);
      should(res.filename).equal('thig1.1-en-soma_pli+en_Matthew.opus');
      should.deepEqual(res.stats, {
        chars: {
          en: 306,
          pli: 257,
        },
        duration: 50,
        segments: { 
          en: 9,
          pli: 9,
        },
        tracks: 2,
      });
      should(Date.now() - res.buildDate).above(0).below(15*1000);
    });
    it("buildDownload() => thig1.1, thig1.2, thig1.3", async()=>{
      let audioSuffix = "opus";
      let lang = 'en';
      let langs = 'pli+en';
      let maxResults = 2; // expect only thig1.1, thig1.2
      let pattern = "thig1.1-3/en/soma";
      let vroot = "Aditi";
      let vtrans = "Matthew";
      let task = new Task({name: `test buildDownload()`});

      let params = { 
        audioSuffix, lang, langs, maxResults, pattern, vroot, vtrans,
      };
      let api = await testScvApi();
       
      let res = await api.buildDownload({
        audioSuffix, lang, langs, maxResults, pattern, 
        vroot, vtrans, task,
      });
      should(res.filename).equal('thig1.1-3-en-soma_pli+en_Matthew.opus');
      should(res.filepath)
        .match(/api.sc-voice.net\/local\/sounds\/common/);
      should(res.filepath).match(/a4aff44cf41e1cd8e5b8c8653bad9b2f.opus/);
      let nSegments = 25;
      should.deepEqual(res.stats, {
        chars: {
          en: 808,
          pli: 649,
        },
        duration: 129,
        segments: { 
          en: nSegments,
          pli: nSegments,
        },
        tracks: 6,
      });
      should(Date.now() - res.buildDate).above(0).below(15*1000);
      should(task.actionsTotal).equal(nSegments + 2 + 2);
    });
    it("getBuildDownload() => thig1.1-3/en/soma", async()=>{
      let api = await testScvApi();
      let audioSuffix = "ogg";
      let lang = 'en';
      let langs = 'pli+en';
      let maxResults = 2;
      let pattern = "thig1.1-3/en/soma";
      let vroot = "aditi";
      let vtrans = "amy";
      let params = { 
        audioSuffix, langs, vtrans, pattern: encodeURIComponent(pattern),
      };
      let query = { maxResults: "2", lang };
      //api.logLevel = 'debug';
      let res = await api.getBuildDownload({params, query});
      should(res).properties({ 
        audioSuffix: ".ogg", 
        lang, 
        langs: ['pli', 'en'],
        maxResults: 2, 
        pattern, 
        vroot: 'Aditi', 
        vtrans,
      });
      let taskProperties = [
        "actionsDone", "actionsTotal", "msActive", "started", "lastActive", "summary",
      ];
      should(res.task).properties(taskProperties);
      should(res.filename).equal(undefined);
      should(res.guid).equal(undefined);
      await new Promise(r=>setTimeout(()=>r(),5*1000))

      let resDone = await api.getBuildDownload({params, query});
      should(resDone.task).properties(taskProperties);
      should(resDone.filename).equal('thig1.1-3-en-soma_pli+en_amy.ogg');
      should(resDone.guid).equal('9f3ec6ed8eb09787feaf6c3b751a95eb');
    });
    it("getDownloadPlaylist() => thig1.1-3/en/soma", async()=>{
      let api = await testScvApi();
      let audioSuffix = "ogg";
      let lang = 'en';
      let langs = 'pli+en';
      let maxResults = 2;
      let pattern = "thig1.1-3/en/soma";
      let vroot = "aditi";
      let vtrans = "amy";
      let params = { 
        audioSuffix, langs, vtrans, pattern: encodeURIComponent(pattern),
      };
      let query = { maxResults: "2", lang };
      //api.logLevel = 'debug';
      let url = [ "/download", audioSuffix, langs, 
        vtrans, encodeURIComponent(pattern), vroot, 
      ].join('/');
      let req = {params, query, url};
      let res = new MockResponse();
      let audio = await api.getDownloadPlaylist(req, res);
      should(audio.length).above(250000).below(350000);
      should.deepEqual(res.mockHeaders, {
        'Content-disposition': 
          `attachment; filename=thig1.1-3-en-soma_pli+en_amy.ogg`,
      });
    });
    it("buildDownload() => thig1.1/de", async()=>{
      let audioSuffix = "opus";
      let lang = 'de';
      let langs = 'pli+de';
      let maxResults = 2; 
      let pattern = "thig1.1/de";
      let vroot = "Aditi";
      let vtrans = "Vicki";
      let task = new Task({name: `test buildDownload()`});

      let params = { 
        audioSuffix, lang, langs, maxResults, pattern, vroot, vtrans,
      };
      let req = {params};
      let api = await testScvApi();
       
      let res = await api.buildDownload({
        audioSuffix, lang, langs, maxResults, pattern, vroot, vtrans, task,
      });
      should(res.filename).equal('thig1.1-de_pli+de_Vicki.opus');
      should(res.filepath).match(/api.sc-voice.net\/local\/sounds\/common/);
      should(res.filepath).match(/f6a18c6c48f784475e73c9e9766dc5f3.opus/);
      let nSegments = 9;
      should.deepEqual(res.stats, {
        chars: {
          de: 404,
          pli: 257,
        },
        duration: 59,
        segments: { 
          de: nSegments,
          pli: nSegments,
        },
        tracks: 2,
      });
      should(Date.now() - res.buildDate).above(0).below(15*1000);
      should(task.actionsTotal).equal(nSegments + 2 + 2);
    });
    it("getBuildDownload() => thig1.1/de", async()=>{
      let api = await testScvApi();
      let lang = 'de';
      let langs = 'pli+de';
      let maxResults = 2; 
      let pattern = "thig1.1/de";
      let vroot = "Aditi";
      let vtrans = "Vicki";
      let audioSuffix = "ogg";
      let params = { 
        audioSuffix, langs, vtrans, pattern: encodeURIComponent(pattern),
      };
      let query = { maxResults: "2", lang };
      //api.logLevel = 'debug';
      let res = await api.getBuildDownload({params, query});
      should(res).properties({ 
        audioSuffix: ".ogg", 
        lang, 
        langs: ['pli', 'de'],
        maxResults: 2, 
        pattern, 
        vroot: 'Aditi', 
        vtrans,
      });
      let taskProperties = [
        "actionsDone", "actionsTotal", "msActive", "started", "lastActive", "summary",
      ];
      should(res.task).properties(taskProperties);
      should(res.filename).equal(undefined);
      should(res.guid).equal(undefined);
      await new Promise(r=>setTimeout(()=>r(),5*1000))

      let resDone = await api.getBuildDownload({params, query});
      should(resDone.task).properties(taskProperties);
      should(resDone.filename).equal('thig1.1-de_pli+de_Vicki.ogg');
      should(resDone.guid).equal('f6a18c6c48f784475e73c9e9766dc5f3');
    });

  it("getVoices()", async()=>{
    let api = await testScvApi();
    let voices = await api.getVoices();
    let mathieu = voices.find(v=>v.name==='Mathieu');
    let celine = voices.find(v=>v.name==='Celine');
    should(mathieu).properties({
      name: 'Mathieu',
      locale: 'fr-FR',
      gender: 'male',
      iVoice: 10,
      service: 'aws-polly',
      langTrans: 'fr',
      label: '🤖 Mathieu-robot',
    });
    should(Object.keys(celine).length).equal(7);
    should(voices.length).above(16).below(25);
  });
  it("get_statfs()", async()=>{
    let api = await testScvApi();
    let res = await api.get_statfs();
    should(res.blocks).above(0);
    should(res.bavail_percent).above(0).below(100);
    should(res.ffree_percent).above(0).below(100);
    //console.log(res);
    should(res).properties([
      'type', 'bsize', 'blocks', 'bfree', 'bavail',
      'files', 'ffree',
    ]);
  });
  it("getMonitors()", async()=>{
    let interval = 500;
    //let url="http://worldtimeapi.org/api/timezone/America/Los_Angeles";
    let url="https://raw.githubusercontent.com/sc-voice/scv-bilara/main/package.json";
    let jsonFilter = {datetime: true};
    let type = 'test-type';
    let monitorOpts = [{
      interval,
      probes: [{ url, jsonFilter, type}],
    }];
    let api = new ScvApi({bilaraData, monitors:monitorOpts});
    should(api.monitors).equal(undefined);
    should(api.monitorOpts).equal(monitorOpts);

    // Monitors are created during initialization
    await api.initialize();
    let monitors = await api.getMonitors();
    should(monitors.length).equal(1);
    let monitor0 = monitors[0];
    should(monitor0).properties({interval});
    should(monitor0).instanceOf(Monitor);
    should(monitor0.started).instanceOf(Date);

    let probe0 = monitor0.probes[0];
    should(probe0).instanceOf(UrlProbe);
    let { stateLog } = probe0;
    should(stateLog).instanceOf(StateLog);
    should(monitor0).properties({interval});
    should(stateLog.history.length).equal(0);
    should(stateLog).properties({interval, });
    should(stateLog.state).equal(undefined);
    should(probe0).properties({url, jsonFilter});

    // wait for logged result from probe
    await nap(3*interval);
    monitor0.stop();
    //console.log(stateLog);
    should(stateLog.state).properties({status:200});
    should.deepEqual(Object.keys(stateLog.state.json), ['datetime']);

    //console.log("TEST monitor0", probe0.stateLog);
  });
  it("getProbes()", async()=>{
    let interval = 500;
    //let url="http://worldtimeapi.org/api/timezone/America/Los_Angeles";
    let url="https://raw.githubusercontent.com/sc-voice/scv-bilara/main/package.json";
    let jsonFilter = {datetime: true};
    let type = 'test-type';
    let monitorOpts = [{
      interval,
      probes: [{ url, jsonFilter, type}],
    }];
    let api = new ScvApi({bilaraData, monitors:monitorOpts});
    should(api.monitors).equal(undefined);
    should(api.monitorOpts).equal(monitorOpts);

    // Monitors are created during initialization
    await api.initialize();
    let probes = await api.getProbes();
    let probe0 = probes[0];
    should(probe0).instanceOf(UrlProbe);
    let { stateLog } = probe0;
    should(stateLog).instanceOf(StateLog);
    should(stateLog.history.length).equal(0);
    should(stateLog).properties({interval, });
    should(stateLog.state).equal(undefined);
    should(probe0).properties({url, jsonFilter});

    // wait for logged result from probe
    await nap(4*interval);
    api.monitors[0].stop();
    should(stateLog.state).properties({status:200});
    should.deepEqual(Object.keys(stateLog.state.json), ['datetime']);
  });
  it("getDictionary()", async()=>{
    let api = new ScvApi({bilaraData});
    await api.initialize();
    let paliWord = "dhamma";
    let ipa;
    let params = {  paliWord, ipa };
    let req = {params};
    let query = {};
    let res = await api.getDictionary({params, query});
    should(res.paliWord).equal(paliWord);
    should(res.volume).equal('dpd');
    should(res.ipa).equal('ɖhəm mə');
    should(res.paliGuid).equal('9937cb38e7d47725b5c00449d72eb40e');
    should(res.ssml).match(/<phoneme alphabet="ipa" ph="ɖhəm mə">/);
    should(res.vnameRoot).equal('Aditi');
    should(res.vnameTrans).equal('Amy');
    should(res.customIpaLimit).above(1).below(50);
  });
  it("getDictionary() custom IPA", async()=>{
    let api = new ScvApi({bilaraData});
    await api.initialize();
    let paliWord = "dhamma";
    let ipa = 'ɖhəm mə ma';
    let params = {  paliWord, ipa };
    let req = {params};
    let query = {};
    let res = await api.getDictionary({params, query});
    should(res.paliWord).equal(paliWord);
    should(res.volume).equal('dpd');
    should(res.ipa).equal(ipa);
    should(res.ssml).match(/<phoneme alphabet="ipa" ph="ɖhəm mə ma">/);
    should(res.paliGuid).equal('20ac202d2334d12e78f74aa88f7c75a3');
    should(res.vnameRoot).equal('Aditi');
    should(res.vnameTrans).equal('Amy');
    let { definition } = res;
    should(definition.length).equal(17);
    should(definition[0]).properties([
      'type', 'meaning', 'literal', 'construction',
    ]);
    should(res.customIpaLimit).above(1).below(50);
  });
  it("getPlaySegment() => mn8:1.1 ru", async()=>{
    let api = await testScvApi();
    let scid = "mn8:1.1";
    let langTrans = 'ru';
    let translator = 'sv';
    let vnameTrans = 'Tatyana';
    let params = { langTrans, translator, scid, vnameTrans };
    let query = {};
    
    let res = await api.getPlaySegment({params, query});
    should.deepEqual(res.segment, {
      scid,
      pli: 'Evaṁ me sutaṁ—',
      ru: 'Так я слышал. ', // SV
      ref: 'So I have heard. ', // Sujato
      matched: true,
      audio: {
        pli: '3ada6d9ac3fe0efb8ca9f804d3cb2f80',
        ru: '9278ca65b989ebee4f258b28f0a5fa36', 
      },
    });
  });
});

