import ScvApi from "../src/scv-api.cjs";
import { BilaraData } from "scv-bilara";
import Links from "../src/links.mjs";
import AudioUrls from "../src/audio-urls.cjs";
import SoundStore from "../src/sound-store.cjs";
import SuttaStore from "../src/sutta-store.cjs";
import Task from "../src/task.cjs";
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

typeof describe === "function" &&
  describe("scv-api", function() {
    this.timeout(15*1000);
    let params = {};              // testing default
    let query = { maxResults: 3}; // testing default
    let bilaraData;

    // Create a test singleton to speed up testing
    const TESTSINGLETON = 1;
    var scvApi; 
    async function testScvApi(singleton=TESTSINGLETON) {
      if (bilaraData == null) {
        bilaraData = new BilaraData({
          name: 'ebt-data',
        });
        await bilaraData.initialize();
      }
      should(bilaraData.initialized).equal(true);
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
        mockRedirect: 'https://dhammaregen.net/#/sutta/thig1.1/de',
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
        link: 'https://dhammaregen.net/#/sutta/thig1.1/de',
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
        link: `${SC_VOICE_NET}/#/sutta/${sutta_uid}/${lang}/${author}`,
      });
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
        en: 'b7a709a7c565dc2a78a05ed6acada4b5',
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

      should(api.downloadArgs({pattern})).properties({langs: ['pli', 'en']});
      should(api.downloadArgs({pattern, langs})).properties({langs});
      should(api.downloadArgs({pattern, langs:'de+pli'})).properties({langs});
      should.throws(()=>api.downloadArgs({pattern, langs:911}));
      should.throws(()=>api.downloadArgs({pattern, langs:{BAD:911}}));

      should(api.downloadArgs({pattern})).properties({lang: 'en'});
      should(api.downloadArgs({pattern, lang:'jpn'})).properties({lang: 'jpn'});
      should(api.downloadArgs({pattern, lang:'jpn'})).properties({lang: 'jpn'});
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
        audioSuffix, lang, langs, maxResults, pattern, vroot, vtrans, task,
      });
      should(res.filename).equal('thig1.1-3-en-soma_pli+en_Matthew.opus');
      should(res.filepath).match(/api.sc-voice.net\/local\/sounds\/common/);
      should(res.filepath).match(/a613517f8cd8aa11a3d37f1d4bdd3e8b.opus/);
      let nSegments = 17;
      should.deepEqual(res.stats, {
        chars: {
          en: 571,
          pli: 467,
        },
        duration: 92,
        segments: { 
          en: nSegments,
          pli: nSegments,
        },
        tracks: 4,
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
      should(resDone.guid).equal('104fff42a9ff64423feabf84c674e573');
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
      should(audio.length).equal(252512);
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
  });

/*TODO
(typeof describe === 'function') && describe("scv-rest", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const supertest = require('supertest');
    const jwt = require('jsonwebtoken');
    const { logger } = require('log-instance');
    logger.logLevel = 'warn';
    const {
        UserStore,
    } = require('rest-bundle');
    const { 
        Definitions,
    } = require('suttacentral-api');
    const {
        SCAudio,
        ScvApi,
        Section,
        SoundStore,
        Sutta,
        SuttaFactory,
        VoiceFactory,
        Words,
    } = require("../index");
    const TEST_ADMIN = {
        username: "test-admin",
        isAdmin: true,
    };
    const Queue = require('promise-queue');
    const PUBLIC = path.join(__dirname, '../public');
    const LOCAL = path.join(__dirname, '../local');
    const SC = path.join(LOCAL, 'sc');
    const app = require("../scripts/sc-voice.js"); // access cached instance 
    this.timeout(15*1000);


    function sleep(ms=600) {
        // The testing server takes a while to wakeup
        // and will report 404 until it's ready
        return new Promise(r=>setTimeout(()=>r(),ms)); 
    }

    var testInitialize = sleep(2000);

    function testAuthPost(url, data) {
        var token = jwt.sign(TEST_ADMIN, ScvApi.JWT_SECRET);
        return supertest(app).post(url)
            .set("Authorization", `Bearer ${token}`)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send(data);
    }

    async function testAuthGet(url, contentType='application/json', accept=contentType) {
        var token = jwt.sign(TEST_ADMIN, ScvApi.JWT_SECRET);
        await testInitialize;
        return supertest(app).get(url)
            .set("Authorization", `Bearer ${token}`)
            .set('Content-Type', contentType)
            .set('Accept', accept)
            .expect('Content-Type', new RegExp(contentType))
            ;
    }

    function testGet(url, contentType='application/json', accept=contentType) {
        return supertest(app).get(url)
            .set('Content-Type', contentType)
            .set('Accept', accept)
            .expect('Content-Type', new RegExp(contentType))
            ;
    }

    async function testScvApi() {
        // Wait for server to start
        await testInitialize;
        await app.locals.scvApi.initialize();
        await sleep(500);
    }

    it("ScvApi maintains a SoundStore singleton", function() {
        var scvApi = app.locals.scvApi;
        should(scvApi).instanceOf(ScvApi);
        var soundStore = scvApi.soundStore;
        should(soundStore).instanceOf(SoundStore);
        var voiceFactory = scvApi.voiceFactory;
        should(voiceFactory).instanceOf(VoiceFactory);
        should(voiceFactory.soundStore).equal(soundStore);
    });
    it("GET /identity => restbundle identity JSON", done=>{
        var async = function* () { try {
            var response = yield supertest(app)
                .get("/scv/identity").expect((res) => {
                res.statusCode.should.equal(200);
                var keys = Object.keys(res.body).sort();
                should.deepEqual(keys, [
                    'diskavail', 'diskfree', 'disktotal',
                    'freemem', 'hostname', 'loadavg', 'name', 
                    'package', 'totalmem', 'uptime', 'version'
                ]);
            }).end((e,r) => e ? async.throw(e) : async.next(r));
            done();
        } catch (e) { done(e); } }();
        async.next();
    });
    it("GET download human audio playlist", async()=>{
        console.log(`TODO`, __filename); return; 
        var scvApi = app.locals.scvApi;
        var apiModel = await scvApi.initialize();
        var url = `/scv/download/playlist/en/sujato_en/sn2.3%2Fen%2Fsujato`;
        var res = await supertest(app)
            .get(url)
            .expect('Content-Type', /audio\/mp3/)
            .expect('Content-Disposition', 
                'attachment; filename=sn2.3-en-sujato_en_sujato_en.mp3');
        var contentLength = Number(res.headers['content-length']);
        should(contentLength).above(3400000);
        should(contentLength).below(4600000);
        should(res.statusCode).equal(200);
    });
    it("GET /download/playlist/pli+en/amy/an3.76-77 => mp3", async()=>{
        await testInitialize;
        var scvApi = app.locals.scvApi;
        var apiModel = await scvApi.initialize()
        var res = await supertest(app)
            .get("/scv/download/playlist/pli+en/amy/an3.76-77");
        should(res.headers).properties({
            'content-type': 'audio/mp3',
            'content-disposition': 'attachment; filename=an3.76-77_pli+en_amy.mp3',
        });
        var contentLength = Number(res.headers['content-length']);
        should(contentLength).above(3400000).below(4600000);
        should(res.statusCode).equal(200);
    });
    it("GET /download/playlist/de/vicki/thig1.10 => ogg", async()=>{
        await testInitialize;
        var scvApi = app.locals.scvApi;
        var apiModel = await scvApi.initialize()
        //logger.logLevel = 'info';
        var res = await supertest(app)
            .get("/scv/download/ogg/de/vicki/thig1.10");
        should(res.headers).properties({
            'content-type': 'audio/ogg',
            'content-disposition': 'attachment; filename=thig1.10_de_vicki.ogg',
        });
        var contentLength = Number(res.headers['content-length']);
        should(res.statusCode).equal(200);
        should(contentLength).above(50000).below(110000);
    });
    it("GET /download/playlist/pli+de/vicki/thig1.10 => ogg", async()=>{
        await testInitialize;
        var scvApi = app.locals.scvApi;
        var apiModel = await scvApi.initialize()
        //logger.logLevel = 'info';
        var res = await supertest(app)
            .get("/scv/download/ogg/pli+de/vicki/thig1.10/Aditi");
        should(res.headers).properties({
            'content-type': 'audio/ogg',
            'content-disposition': 'attachment; filename=thig1.10_pli+de_vicki.ogg',
        });
        var contentLength = Number(res.headers['content-length']);
        should(res.statusCode).equal(200);
        should(contentLength).above(90000).below(110000);
    });
    it("GET /download/playlist/de/vicki/thig1.10 => opus", async()=>{
        await testInitialize;
        var scvApi = app.locals.scvApi;
        var apiModel = await scvApi.initialize()
        //logger.logLevel = 'info';
        var res = await supertest(app)
            .get("/scv/download/opus/de/vicki/thig1.10");
        should(res.headers).properties({
            'content-type': 'audio/opus',
            'content-disposition': 'attachment; filename=thig1.10_de_vicki.opus',
        });
        var contentLength = Number(res.headers['content-length']);
        should(res.statusCode).equal(200);
        should(contentLength).above(50000).below(60000);
    });
    it("GET /download/playlist/pli+de/vicki/thig1.10 => opus", async()=>{
        await testInitialize;
        var scvApi = app.locals.scvApi;
        var apiModel = await scvApi.initialize()
        //logger.logLevel = 'info';
        var res = await supertest(app)
            .get("/scv/download/opus/pli+de/vicki/thig1.10/Aditi");
        should(res.headers).properties({
            'content-type': 'audio/opus',
            'content-disposition': 'attachment; filename=thig1.10_pli+de_vicki.opus',
        });
        var contentLength = Number(res.headers['content-length']);
        should(res.statusCode).equal(200);
        should(contentLength).above(90000).below(110000);
    });
    it("Queue handles promises", function(done) {
        (async function() { try {
            var monitor = [];
            var q = new Queue(3, Infinity);
            var doit = (ms) => new Promise((resolve, reject) => {
                setTimeout(() => {
                    monitor.push(ms);
                    resolve(ms);
                }, ms);
            });
            var queuedPromises = [1,2,3,4,5,6,7].map(i => q.add(() => doit(i)));
            var all = Promise.all(queuedPromises);
            should(q.getQueueLength()).equal(4); // waiting
            should(q.getPendingLength()).equal(3); // processing
            should.deepEqual(monitor, []);
            var r1 = await(queuedPromises[1]);
            should(r1).equal(2);
            should.deepEqual(monitor, [1,2]);
            should(q.getQueueLength()).equal(2); // waiting
            should(q.getPendingLength()).equal(3); // processing
            var r2 = await(queuedPromises[2]);
            should(r2).equal(3);
            should(q.getQueueLength()).equal(1); // waiting
            should(q.getPendingLength()).equal(3); // processing
            var r3 = await(queuedPromises[3]);
            should(r3).equal(4);
            should(q.getQueueLength()).equal(0); // waiting
            should(q.getPendingLength()).equal(3); // processing
            var allResult = await(all);
            should.deepEqual(allResult, [1,2,3,4,5,6,7]);
            done();
        } catch(e) {done(e);} })();
    });
    it("GET /scv/play/section/... => playable section", done=>{
        (async function() { try {
            await new Promise(resolve=>setTimeout(()=>resolve(),1000));
            var iSection = 1;
            var vnameTrans = 'Raveena';
            var vnameRoot = 'Aditi';
            var url = `/scv/play/section/mn1/en/sujato/`+
                `${iSection}/${vnameTrans}/${vnameRoot}`;
            var res = await supertest(app).get(url);
            res.statusCode.should.equal(200);
            var section = res.body instanceof Buffer 
                ? JSON.parse(res.body) : res.body;
            should(section.segments.length).equal(332);
            should(section.sutta_uid).equal('mn1');
            should(section.vnameTrans).equal(vnameTrans);
            should(section.vnameRoot).equal(vnameRoot);
            should(section.section).equal(iSection);
            should(section.nSections).equal(2);
            should(section.language).equal('en');
            should(section.translator).equal('sujato');
            should.deepEqual(section.segments[0].audio, {});
            var testPath = path.join(PUBLIC,
                `play/section/mn1/en/sujato/${iSection}/${vnameTrans}`);
            fs.writeFileSync(testPath, JSON.stringify(section, null,2));
            done();
        } catch(e) {done(e);} })();
    });
    it("GET /play/audio/:suid/:lang/:trans/:voice/:guid returns audio", function(done) {
        (async function() { try {
            done();
        } catch(e) {done(e);} })();
    });
    it("GET /play/segment/... handles HumanTts sn1.9", done=>{
        (async function() { try {
            var scid = "sn1.9:1.1";
            var sutta_uid = scid.split(":")[0];
            var langTrans = 'en';
            var vnameTrans = "Matthew";
            var vnameRoot = "sujato_pli";
            var url = [
                `/scv/play/segment`,
                sutta_uid,
                langTrans,
                'sujato',
                scid,
                vnameTrans,
                vnameRoot,
            ].join('/');
            var res = await supertest(app).get(url);
            res.statusCode.should.equal(200);
            var data = res.body instanceof Buffer 
                ? JSON.parse(res.body) : res.body;
            should(data.sutta_uid).equal(scid.split(':')[0]);
            should(data.vnameTrans).equal('Matthew');
            should(data.vnameRoot).equal('sujato_pli');
            should(data.iSegment).equal(3);
            should(data.nSections).equal(2);
            //should(data.section).equal(1);
            should(data.language).equal('en');
            should(data.translator).equal('sujato');
            should(data.segment.pli).match(/Sāvatthinidānaṁ/);
            should(data.segment.audio.en)
                .match(/e5f5e2ec93f9f41908924177d5ee63ca/);
            should(data.segment.audio.pli)
                .match(/57eacb73319677cbe42256c332630451/);
            should(data.segment.audio.vnamePali).equal(undefined);

            done();
        } catch(e) {done(e);} })();
    });
    it("GET /play/segment/... handles HumanTts sn12.1", done=>{
        (async function() { try {
            var scid = "sn12.1:1.2";
            var sutta_uid = scid.split(":")[0];
            var langTrans = 'en';
            var vnameTrans = "Matthew";
            var vnameRoot = "sujato_pli";
            var url = [
                `/scv/play/segment`,
                sutta_uid,
                langTrans,
                'sujato',
                scid,
                vnameTrans,
                vnameRoot,
            ].join('/');
            logger.warn("EXPECTED WARN BEGIN");
            var res = await supertest(app).get(url);
            logger.warn("EXPECTED WARN END");
            res.statusCode.should.equal(200);
            var data = res.body instanceof Buffer 
                ? JSON.parse(res.body) : res.body;
            should(data.sutta_uid).equal(scid.split(':')[0]);
            should(data.vnameTrans).equal('Matthew');
            should(data.vnameRoot).equal('sujato_pli');
            should(data.language).equal('en');
            should(data.translator).equal('sujato');
            should(data.segment.pli)
                .match(/ekaṁ samayaṁ bhagavā sāvatthiyaṁ/);
            should(data.segment.audio.en)
                .match(/d0a8567a6fca2fbeaa5d14e610304826/);
            should(data.segment.audio.pli)
                .match(/a11ebc9a6bbe583d36e375ca163b6351/);
            should(data.segment.audio.vnamePali).equal('Aditi');

            done();
        } catch(e) {done(e);} })();
    });
    it("GET /examples/:n return search examples", function(done) {
        (async function() { try {
            var n = 3;
            var url = `/scv/examples/${n}`;
            var res = await supertest(app).get(url);
            res.statusCode.should.equal(200);
            var data = res.body instanceof Buffer ? JSON.parse(res.body) : res.body;
            should(data instanceof Array);
            should(data.length).equal(3);
            for (var i = 3; i-- > 0; ) { // at least one trial must be different
                var res2 = await supertest(app).get(url);
                try {
                    res2.statusCode.should.equal(200);
                    var data2 = res2.body instanceof Buffer 
                        ? JSON.parse(res2.body) : res2.body;
                    should(data).not.eql(data2);
                    break;
                } catch(e) {
                    if (i === 0) {
                        throw e;
                    }
                }
            }
            done();
        } catch(e) {done(e);} })();
    });
    it("GET /wiki-aria/:page return Aria for wiki page", done=>{
        var WIKIURL = `https://raw.githubusercontent.com/wiki/`+
            `sc-voice/sc-voice`;
        (async function() { try {
            var url = `/scv/wiki-aria/Home.md`;
            var res = await supertest(app).get(url);
            res.statusCode.should.equal(200);
            var html = res.body.html;
            should(res.body.url).equal(`${WIKIURL}/Home.md`);
            var html = res.body.html;
            should(html).match(/These wiki pages/ui);
            done();
        } catch(e) {done(e);} })();
    });
    it("GET auth/sound-store/volume-info return stats", function(done) {
        (async function() { try {
            var url = `/scv/auth/sound-store/volume-info`;
            var scvApi = app.locals.scvApi;
            var token = jwt.sign(TEST_ADMIN, ScvApi.JWT_SECRET);
            var res = await supertest(app).get(url)
                .set("Authorization", `Bearer ${token}`);
            res.statusCode.should.equal(200);
            var soundStore = scvApi.soundStore;
            should.deepEqual(res.body, soundStore.volumeInfo());
            done();
        } catch(e) {done(e);} })();
    });
    it("POST auth/sound-store/clear-volume clears volume cache", done=>{
        (async function() { try {
            var scvApi = app.locals.scvApi;
            var soundStore = scvApi.soundStore;
            var volume = 'test-clear-volume';
            var fpath = soundStore.guidPath({
                volume,
                guid:'12345',
            });
            fs.writeFileSync(fpath, '12345data');
            should(fs.existsSync(fpath)).equal(true);
            var url = `/scv/auth/sound-store/clear-volume`;
            var scvApi = app.locals.scvApi;
            var token = jwt.sign(TEST_ADMIN, ScvApi.JWT_SECRET);

            var data = { volume, };
            var res = await testAuthPost(url, data);
            res.statusCode.should.equal(200);
            should.deepEqual(res.body, {
                filesDeleted:1,
            });
            should(fs.existsSync(fpath)).equal(false);

            var data = { volume:'invalid-volume', };
            logger.warn(`EXPECTED WARN BEGIN`);
            var res = await testAuthPost(url, data);
            res.statusCode.should.equal(500);
            logger.warn(`EXPECTED WARN END`);

            done();
        } catch(e) {done(e);} })();
    });
    it("GET audio-url/... returns supported audio url", async()=>{
        // short url
        var url = '/scv/audio-urls/sn1.23';
        var res = await supertest(app).get(url)
        let urlBase = 
            `https://${SCAudio.SC_OPUS_STORE}.sgp1.cdn.digitaloceanspaces.com`;
        res.statusCode.should.equal(200);
        should.deepEqual(res.body.map(src=>src.url), [
            `${urlBase}/pli/sn/sn1/sn1.23-pli-mahasangiti-sujato.webm`,
            `${urlBase}/en/sn/sn1/sn1.23-en-sujato-sujato.webm`,
        ]);
    });
    it("GET auth/vsm/s3-credentials => sanitized aws-creds.json", done=>{
        var awsCredsPath = path.join(LOCAL, 'aws-creds.json');
        if (!fs.existsSync(awsCredsPath)) {
            logger.warn('skipping vsm/s3-credentials GET test');
            done();
            return;
        }
        (async function() { try {
            var url = `/scv/auth/vsm/s3-credentials`;
            var goodCreds = JSON.parse(fs.readFileSync(awsCredsPath));

            // Returns obfuscated credentials
            var res = await testAuthGet(url);
            res.statusCode.should.equal(200);
            var actualCreds = res.body;
            should(actualCreds.Bucket)
                .equal(goodCreds.Bucket||goodCreds.Bucket);
            should(actualCreds.s3.endpoint).equal(goodCreds.s3.endpoint);
            should(actualCreds.s3.region).equal(goodCreds.s3.region);
            should(actualCreds.s3.accessKeyId.substr(0,5)).equal('*****');
            should(actualCreds.s3.secretAccessKey.substr(0,5)).equal('*****');

            done();
        } catch(e) {done(e);} })();
    });
    it("POST auth/vsm/s3-credentials good creds", async()=>{try{
        await testInitialize;
        var awsCredsPath = path.join(LOCAL, 'aws-creds.json');
        if (!fs.existsSync(awsCredsPath)) {
            logger.warn('skipping vsm/s3-credentials POST test');
            return;
        }
        var url = `/scv/auth/vsm/s3-credentials`;
        //logger.logLevel = 'info';

        // save good creds and make bad creds
        var goodCreds = JSON.parse(fs.readFileSync(awsCredsPath));
        var badCreds = JSON.parse(JSON.stringify(goodCreds));
        badCreds.s3.secretAccessKey = "wrong-key";
        await fs.promises.writeFile(awsCredsPath, JSON.stringify(badCreds, null, 2));

        // Good credentials are saved
        var res = await testAuthPost(url, goodCreds);

        var actualCreds = JSON.parse(await fs.promises.readFile(awsCredsPath));
        await fs.promises.writeFile(awsCredsPath, JSON.stringify(goodCreds, null, 2));
        res.statusCode.should.equal(200);
        should.deepEqual(actualCreds, goodCreds);
    } catch(e) {
        logger.info(`TEST: restoring ${awsCredsPath}`);
        fs.writeFileSync(awsCredsPath, JSON.stringify(goodCreds, null, 2));
        throw e;
    }});
    it("POST auth/vsm/s3-credentials bad creds", async()=>{try{
        await testInitialize;
        var awsCredsPath = path.join(LOCAL, 'aws-creds.json');
        if (!fs.existsSync(awsCredsPath)) {
            logger.warn('skipping vsm/s3-credentials POST test');
            return;
        }

        // Bad credentials are not saved
        var url = `/scv/auth/vsm/s3-credentials`;
        var logLevel = logger.logLevel;
        logger.logLevel = 'error';
        var goodCreds = JSON.parse(fs.readFileSync(awsCredsPath));
        logger.warn("EXPECTED WARNING BEGIN");
        var badCreds = JSON.parse(JSON.stringify(goodCreds));
        badCreds.s3.secretAccessKey = 'bad-secretAccessKey';
        var res = await testAuthPost(url, badCreds);
        logger.warn("EXPECTED WARNING END");
        res.statusCode.should.equal(500);
        var actualCreds = JSON.parse(fs.readFileSync(awsCredsPath));
        should.deepEqual(actualCreds, goodCreds);
    } finally {
        logger.logLevel = logLevel;
    }});
    it("GET auth/vsm/factory-task returns factory status", function(done) {
        (async function() { try {

            // Default Bucket
            var url = `/scv/auth/vsm/factory-task`;
            var res = await testAuthGet(url);
            res.statusCode.should.equal(200);
            should(res.body).properties({
                error: null,
                summary: 'VSMFactory created',
                name: 'VSMFactory',
                msActive: 0,
            });
            should.deepEqual(Object.keys(res.body).sort(), [
                'isActive', 'lastActive',
                'error', 'name', 'msActive', 'started', 'summary', 'uuid',
                'actionsTotal', 'actionsDone',
            ].sort());

            done();
        } catch(e) {done(e);} })();
    });
    it("GET auth/vsm/list-objects lists bucket objects", function(done) {
        var awsCredsPath = path.join(LOCAL, 'aws-creds.json');
        if (!fs.existsSync(awsCredsPath)) {
            logger.warn("skipping auth/vsm/list-objects test");
            done();
            return;
        }
        (async function() { try {

            // Default Bucket
            var url = `/scv/auth/vsm/list-objects`;
            var res = await testAuthGet(url);
            res.statusCode.should.equal(200);
            var s3Result = res.body;
            should(s3Result).properties({
                Name: fs.existsSync(awsCredsPath)
                    ? 'sc-voice-vsm'
                    : 'sc-voice-test',
                MaxKeys: 1000,
                s3: {
                    endpoint: 'https://s3.us-west-1.amazonaws.com',
                    region: 'us-west-1',
                },
            });
            var c0 = s3Result.Contents[0];
            should(c0).properties([
                'Key', 'LastModified', 'ETag', 'Size', 'StorageClass', 'Owner',
                'upToDate',
            ]);
            if (c0.upToDate) {
                should(new Date(c0.restored))
                    .above(new Date(c0.LastModified));
            }
            should(s3Result.Contents[0].Key)
                .match(/[a-z]*_[a-z]*_[a-z]*_[a-z]*.tar.gz/iu);

            done();
        } catch(e) {done(e);} })();
    });
    it("POST auth/vsm/restore-s3-archives", async()=>{
        console.log(`TODO`,__filename); return; // Restore VSM file
        var awsCredsPath = path.join(LOCAL, 'aws-creds.json');
        if (!fs.existsSync(awsCredsPath)) {
            logger.warn('skipping vsm/s3-credentials POST test');
            done();
            return;
        }
        var url = `/scv/auth/vsm/list-objects`;
        var resList = await testAuthGet(url);
        var {
            Contents,
        } = resList.body;

        var url = `/scv/auth/vsm/restore-s3-archives`;
        var restore = [{
            Key: 'kn_en_sujato_amy.tar.gz',
            ETag: '"e2141be1eddffebe4bded17b83aaa5ee"',
        }];
        var clearVolume = false;
        var data = {
            restore,
            clearVolume,
        };
        var res = await testAuthPost(url, data);
        res.statusCode.should.equal(200);
        should(res.body).properties({
            Bucket: 'sc-voice-vsm',
            clearVolume,
            restore,
        });
    });
    it("POST auth/vsm/create-archive create VSM", async()=>{
        console.log(`TODO`,__filename); return; 
        var url = `/scv/auth/vsm/create-archive`;
        var nikaya = 'kn';
        var author = 'sujato';
        var lang = 'pli';
        var voice = 'aditi';
        var maxSuttas = 1;
        var postArchive = false;
        var data = {
            nikaya,
            voice,
            lang,
            author,
            maxSuttas,
            postArchive,
        };

        // the response is immediate since processing is in the background
        var res = await testAuthPost(url, data);
        res.statusCode.should.equal(200);
        should(res.body).properties({
            postArchive,
            author,
            lang,
            nikaya,
            maxSuttas,
            voice,
        });
        var summary = 'Building VSM for nikaya:kn language:pli voice:aditi';
        should(res.body.task).properties({
            actionsTotal: 2,
            actionsDone: 0,
            summary,
            error: null,
            name: 'VSMFactory',
        });

        // an immediately following request should be busy 
        logger.warn("EXPECTED WARNING BEGIN");
        var res = await testAuthPost(url, data);
        logger.warn("EXPECTED WARNING END");
        res.statusCode.should.equal(500);
        should(res.body.error).match(/VSM Factory is busy/);
        var taskUrl = `/scv/auth/vsm/factory-task`;
        var res = await testAuthGet(taskUrl);
        res.statusCode.should.equal(200);
        should(res.body).properties({
            error: null,
            summary,
            name: 'VSMFactory',
            isActive: true,
        });

        // and after a while it should be done
        await new Promise((resolve, reject) => {
            setTimeout(() => resolve(true), 5000);
        });
        var res = await testAuthGet(taskUrl);
        res.statusCode.should.equal(200);
        should(res.body).properties({
            error: null,
            name: 'VSMFactory',
            isActive: false,
        });
        should(res.body.summary)
            .match(/kn_pli_mahasangiti_aditi suttas imported/);

        // and we can submit another request
        var res = await testAuthPost(url, data);
        res.statusCode.should.equal(200);
    });
    it("GET voices returns voices", function(done) {
        (async function() { try {
            // default
            var url = "/scv/voices";
            var res = await supertest(app).get(url)
            should(res.statusCode).equal(200);
            var voices = res.body;
            should.deepEqual(voices.map(v=>v.name).slice(0,8), [
                // en voices first
                'Amy', 'Brian', 'Raveena', 'Matthew', 'sujato_en', 
                // non-en voices
                'Vicki', 'Hans', 'Marlene', // de voices
                //'Ricardo', // pt
                //'Aditi', 'sujato_pli', // pli voices last
            ])
            should(voices[0]).properties({
                name: "Amy",
                iVoice: 0,
                usage: "recite",
            });

            // en
            var url = "/scv/voices/en";
            var res = await supertest(app).get(url)
            should(res.statusCode).equal(200);
            var voices = res.body;
            should.deepEqual(voices.map(v=>v.name), [
                'Amy', 'Brian', 'Raveena', 'Matthew', 'sujato_en', 
                'Aditi', 'sujato_pli', // pli voices last
            ])

            // de
            var url = "/scv/voices/de";
            var res = await supertest(app).get(url)
            should(res.statusCode).equal(200);
            var voices = res.body;
            should.deepEqual(voices.map(v=>v.name), [
                'Vicki', 'Hans', 'Marlene', // de voices
                'Aditi', 'sujato_pli', // pli voices last
            ])

            done();
        } catch(e) {done(e);} })();
    });
    it("GET authors returns authors", function(done) {
        (async function() { try {
            var scvApi = app.locals.scvApi;
            await scvApi.initialize();
            var url = "/scv/authors";
            var res = await supertest(app).get(url)
            should(res.statusCode).equal(200);
            var authors = res.body;
            should.deepEqual(authors.sabbamitta, {
                exampleVersion: 1,
                name: 'Sabbamitta',
                lang: 'de',
                type: 'translator',
            })

            done();
        } catch(e) {done(e);} })();
    });
    it("GET auth/logs returns logfiles", function(done) {
        (async function() { try {
            var logDir = path.join(LOCAL, 'logs');
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir);
                fs.writeFileSync(path.join(logDir, 'test3'), 'test-log3');
                fs.writeFileSync(path.join(logDir, 'test2'), 'test-log2');
                fs.writeFileSync(path.join(logDir, 'test1'), 'test-log1');
            }
            var files = fs.readdirSync(logDir).sort((a,b) => -a.localeCompare(b));
            var url = "/scv/auth/logs";
            var res = await testAuthGet(url);
            should(res.statusCode).equal(200);
            var resFiles = res.body;
            should.deepEqual(resFiles.map(f=>f.name), files);
            should(resFiles[0]).properties(['size', 'mtime']);

            done();
        } catch(e) {done(e);} })();
    });
    it("GET auth/log/:ilog returns logfile", async()=>{
        var logDir = path.join(LOCAL, 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir);
            fs.writeFileSync(path.join(logDir, 'test3'), 'test-log3');
            fs.writeFileSync(path.join(logDir, 'test2'), 'test-log2');
            fs.writeFileSync(path.join(logDir, 'test1'), 'test-log1');
        }
        var files = fs.readdirSync(logDir).sort((a,b) => -a.localeCompare(b));
        var index = 0;
        if (files.length > index) {
            var url = `/scv/auth/log/${index}`;
            var res = await testAuthGet(url, 'text/plain');
            should(res.statusCode).equal(200);
            var log = fs.readFileSync(path.join(logDir, files[index])).toString();
            should(res.text).equal(log);
        }
        index++;
        if (files.length > index) {
            var url = `/scv/auth/log/${index}`;
            var res = await testAuthGet(url, 'text/plain');
            should(res.statusCode).equal(200);
            var log = fs.readFileSync(path.join(logDir, files[index])).toString();
            should(res.text).equal(log);
        }

        // error
        var url = `/scv/auth/log/asdf`;
        logger.warn('EXPECTED WARN: BEGIN');
        var res = await testAuthGet(url, 'text/plain');
        logger.warn('EXPECTED WARN: END');
        should(res.statusCode).equal(500);
        should(res.text).match(/Log file not found:asdf/);
    });
    it("POST auth/update-bilara", async()=>{
        var scvApi = await(testScvApi());
        var url = `/scv/auth/update-bilara`;
        var data = { };
        var res = await testAuthPost(url, data);
        res.statusCode.should.equal(200);
        should(res.body).properties({
            error: null,
            summary: 'Update completed',
        });
        should(res.body.elapsed).above(0);
    });
    it("GET audio info", async()=>{
        var scvApi = await testScvApi();
        var guid = `e0bd9aadd84f3f353f17cceced97ff13`;
        var url = `/scv/auth/audio-info/an_en_sujato_amy/${guid}`;
        var res = await testAuthGet(url);
        var {
            statusCode,
            body: infoArray,
        } = res;
        statusCode.should.equal(200);
        should(infoArray).instanceOf(Array);
        should.deepEqual(infoArray.map(i=>i.api), [
            "aws-polly",]);
        should.deepEqual(infoArray.map(i=>i.voice), [
            "Amy",]);
        should.deepEqual(infoArray.map(i=>i.guid), [
            "e0bd9aadd84f3f353f17cceced97ff13", 
        ]);
    });
    it("GET /search/an4.182/ja returns Kaz sutta", async()=>{
        await testInitialize;
        var maxResults = 3;
        var pattern = `an4.182`;
        var lang = 'ja'

        var url = 
            `/scv/search/${pattern}/${lang}?maxResults=${maxResults}`;
        var response = await supertest(app).get(url);
        response.statusCode.should.equal(200);
        var {
            method,
            results,
        } = response.body;
        should(results).instanceOf(Array);
        should(results.length).equal(1);
        should.deepEqual(results.map(r => r.uid),[
            'an4.182', 
        ]);
        should(results[0].sutta.author_uid).equal('kaz');
        should(method).equal('sutta_uid');
    });
    it("GET /examples/:n => ja examples", async()=>{
        var n = 1000;
        var lang = 'ja';
        var url = `/scv/examples/${n}?lang=${lang}`;
        var res = await supertest(app).get(url);
        res.statusCode.should.equal(200);
        var data = res.body instanceof Buffer ? JSON.parse(res.body) : res.body;
        should.deepEqual(data.sort().slice(0,3), [
            //"全ての活動が静まり",
            "カラス貝",
            "ゾンビ",
            "不機嫌さ、憎しみ、恨み",
        ]);
    });
});

TODO*/
