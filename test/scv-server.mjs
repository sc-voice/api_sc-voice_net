import should from "should";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.dirname(__dirname);
import express from "express";
import bodyParser from "body-parser";
import supertest from "supertest";
import jwt from "jsonwebtoken";
import { logger } from "log-instance";
import ResourceMethod from '../src/resource-method.cjs';
import RestApi from '../src/rest-api.cjs';
import ScvServer from '../src/scv-server.mjs';
const TEST_ADMIN = {
  username: "test-admin",
  isAdmin: true,
};
const SHARED_TEST_PORT = 3001;

logger.logLevel = 'warn';

typeof describe === "function" &&
  describe("scv-server", function() {
    const msStart = Date.now();
    const TEST_SERVERS = {};
    this.timeout(15*1000);

    after(async() => {
      let ports = Object.keys(TEST_SERVERS);
      for (let i = 0; i < ports.length; i++) {
        let port = ports[i];
        let scv = TEST_SERVERS[port];
        logger.info(`after() closing test server on port:${port}`);
        await scv.close();
      }
    });

    function sleep(ms = 600) {
      // The testing server takes a while to wakeup
      // and will report 404 until it's ready
      return new Promise((r) => setTimeout(() => r(), ms));
    }

    async function sharedTestServer() {
      let port = SHARED_TEST_PORT;
      let scv = TEST_SERVERS[port];
      
      if (scv == null) {
        logger.info(`creating test server port:${port}`);
        TEST_SERVERS[port] = scv = new ScvServer({port});
        await scv.initialize();
      } else {
        logger.info(`re-using test server port:${port}`);
      }
      return scv;
    }
    async function testGet(opts={}) {
      let {
        scv,
        url,
        statusCode=200,
        contentType='application/json', 
        accept=contentType,
      } = opts;
      should(scv==null).equal(false);
      should(url==null).equal(false);
    
      return supertest(scv.app).get(url)
        .set('Content-Type', contentType)
        .set('Accept', accept)
        .expect(statusCode)
        .expect('Content-Type', new RegExp(contentType))
        ;
    }
    async function testAuthGet(opts={}) {
      let {
        scv,
        url,
        statusCode=200,
        contentType='application/json', 
        accept=contentType,
      } = opts;
      should(scv==null).equal(false);
      should(url==null).equal(false);
    
      var token = jwt.sign(TEST_ADMIN, RestApi.JWT_SECRET);
      return supertest(scv.app).get(url)
        .set("Authorization", `Bearer ${token}`)
        .set('Content-Type', contentType)
        .set('Accept', accept)
        .expect(statusCode)
        .expect('Content-Type', new RegExp(contentType))
        ;
    }


    it("default ctor()", async()=>{ 
      let port = 80;
      let scv = new ScvServer();
      should(scv).instanceOf(ScvServer);
      should(scv).properties({
        name: "scv",
        port,
        apiUrl: "http://suttacentral.net/api",
        appDir: path.dirname(__dirname),
        initialized: undefined,
        protocol: "http",
        sslPath: path.join(APP_DIR, "local", "ssl"),
      });
      should(typeof scv.app).equal('function'); // express instance
    })
    it("custom ctor()", async()=>{
      let port = 3000;
      let name = "testCustom";
      let appDir = "testAppDir";
      let distDir = "testDistDir";
      let apiUrl = "http://apiUrl";
      let app = { use: ()=>{}, }
      let scApi = "testScApi";
      let protocol = "https";
      let sslPath = "testSSLPath";
      let scv = new ScvServer({
        name,
        apiUrl,
        app,
        appDir,
        distDir,
        port,
        protocol,
        scApi,
        sslPath,
      });
      should(scv).instanceOf(ScvServer);

      // configured properties are enumerable
      should.deepEqual(Object.assign({}, scv), {
        name,
        apiUrl,
        appDir,
        distDir,
        port,
        protocol,
        initialized: undefined,
        sslPath,
      });

      // injected properties are not enumerable
      should(scv.app).equal(app);
      should(scv.scApi).equal(scApi);
    })
    it("custom ctor() protocol and port", async()=>{ 
      let appDir = "testAppDir";
      let distDir = "testDistDir";
      let apiUrl = "http://apiUrl";
      let app = { use: ()=>{}, }
      let scApi = "testScApi";
      let protocol = "https";
      let sslPath = "testSSLPath";
      let name = "TestHttps";
      let scv = new ScvServer({
        name,
        apiUrl,
        app,
        appDir,
        distDir,
        protocol,
        scApi,
        sslPath,
      });
      should(scv).instanceOf(ScvServer);

      // configured properties are enumerable
      should.deepEqual(Object.assign({}, scv), {
        name,
        apiUrl,
        appDir,
        distDir,
        port: 443,
        protocol,
        initialized: undefined,
        sslPath,
      });

      // injected properties are not enumerable
      should(scv.app).equal(app);
      should(scv.scApi).equal(scApi);
    })
    it("sharedTestServer", async()=>{
      let scv = await sharedTestServer();
      let port = SHARED_TEST_PORT;
      should(scv).instanceOf(ScvServer);
      should(await scv.initialize()).equal(scv);
      should(scv).properties({
        initialized:true,
        port,
        protocol: 'http',
        apiUrl: 'http://suttacentral.net/api',
      });
      should(scv.app).not.equal(undefined);
      let { httpServer } = scv;
      should(httpServer.address().port).equal(port);
      should(httpServer.listening).equal(true);
    })
    it("ScvServer() => express instance", async()=>{ 
      //logger.logLevel = 'info';
      let port = 3000;
      let scv = await new ScvServer({port}).initialize();
      let { app } = scv;
      let testPath = '/testExpress';
      let testResponse = { testExpress: 'TEST OK' };
      app.get(testPath, (req, res, next)=>{
        res.status(200).json(testResponse);
      });

      var res = await supertest(scv.app)
        .get(testPath)
        .set('Accept', 'application/json')
        .expect(200)
        .expect("Content-Type", /json/)
        .expect(testResponse);
      await scv.close(); 
    })
    it("ScvServer() testColor", async()=>{ 
      //logger.logLevel = 'info';
      let name = "testColor";
      let testResponse = { [name]: 'blue' };
      let apiMethod = req => testResponse;
      let rm = new ResourceMethod("get", name, apiMethod);
      let port = 3003;
      let resourceMethods = [ rm ];
      let scv = new ScvServer({port, resourceMethods});
      should(scv.resourceMethods).equal(resourceMethods);
      await scv.initialize();
      let { app } = scv;
      var res = await supertest(app)
        .get(`/scv/${name}`)
        .set('Accept', 'application/json')
        .expect(200)
        .expect("Content-Type", /json/)
        .expect(testResponse);
      await scv.close();
    })
    it("GET /favicon", async()=>{ 
      let scv = await sharedTestServer();
      var res = await supertest(scv.app)
        .get('/favicon.ico')
        .expect(200)
        .expect("Content-Type", /image/)
    })
    it("GET /index.html", async()=>{ 
      let scv = await sharedTestServer();
      let indexUrl = '/scv/index.html';
      let res = [
        await supertest(scv.app).get(indexUrl)
          .expect(200)
          .expect("Content-Type", /html/),
        await supertest(scv.app).get('/')
          .expect(302)
          .expect("Location", indexUrl),
        await supertest(scv.app).get('/scv')
          .expect(302)
          .expect("Location", indexUrl),
      ]
    })
    it("GET SSL /index.html", async()=>{ 
      let port = 3443;
      let sslPath = path.join(APP_DIR, 'test', 'ssl');
      let scv = await new ScvServer({protocol: 'https', port, sslPath});
      await scv.initialize();
      let certificate = fs.readFileSync(path.join(sslPath, 'server.crt'));
      let privateKey = fs.readFileSync(path.join(sslPath, 'server.key'));
      let indexUrl = '/scv/index.html';
      await supertest(scv.app).get(indexUrl)
        .trustLocalhost()
        .key(privateKey)
        .cert(certificate)
        .expect(200)
        .expect("Content-Type", /html/);
      scv.close();
    })
    it("GET port conflict", async()=>{ 
      //logger.logLevel = 'info';
      let port = 3003;
      let scv1 = new ScvServer({port});
      let scv2 = new ScvServer({port});
      await scv1.initialize();
      let eCaught;
      try { await scv2.initialize() } catch(e) { eCaught = e; }
      should(eCaught.message).match(new RegExp(
        `port conflict with scv:${port}`));
      should(ScvServer.portMap).properties({[port]:scv1});
      await scv1.close();
      should(ScvServer.portMap[port]).equal(undefined);
      await scv2.initialize();
      should(ScvServer.portMap).properties({[port]:scv2});
      await scv2.close();
    })
    it("GET /scv/search/:pattern", async()=>{
      let scv = await sharedTestServer();
      let pattern = encodeURI(`root of suffering`);

      var maxResults = 5; // the default
      var url = `/scv/search/${pattern}`;
      var res = await supertest(scv.app).get(url)
        .expect(200)
        .expect("Content-Type", /application.json/);

      // Default results
      var { method, results, } = res.body;
      should(method).equal('phrase');
      should(results).instanceOf(Array);
      should(results.length).equal(maxResults);
      should.deepEqual(results.map(r => r.uid),[
        'sn42.11', 'mn105', 'mn1', 'sn56.21', 'mn116',
      ]);
      should.deepEqual(results.map(r => r.count),
        [ 5.091, 3.016, 2.006, 1.043, 1.01 ]);

      // custom results
      var maxResults = 3; // custom
      var url = `/scv/search/${pattern}?maxResults=${maxResults}`;
      var res = await supertest(scv.app).get(url)
        .expect(200)
        .expect("Content-Type", /application.json/);

      var { method, results, } = res.body;
      should(method).equal('phrase');
      should(results).instanceOf(Array);
      should(results.length).equal(3);
      should.deepEqual(results.map(r => r.uid),[
        'sn42.11', 'mn105', 'mn1',
      ]);
      should.deepEqual(results.map(r => r.count),
        [ 5.091, 3.016, 2.006  ]);
    })
    it("GET /scv/search/:pattern/:lang", async()=>{
      let scv = await sharedTestServer();
      let pattern = encodeURI(`wurzel des leidens`);
      let lang = 'de';
      let maxResults = 3; // custom
      var url = `/scv/search/${pattern}/${lang}?maxResults=${maxResults}`;
      var res = await supertest(scv.app).get(url)
        .expect(200)
        .expect("Content-Type", /application.json/);

      var { method, results, } = res.body;
      should(method).equal('phrase');
      should(results).instanceOf(Array);
      should(results.length).equal(3);
      should.deepEqual(results.map(r => r.uid),[
        'sn42.11', 'mn105', 'mn1', 
      ]);
    })
    it("GET /scv/play/segment/...", async()=>{
      let scv = await sharedTestServer();
      let sutta_uid = 'thig1.1';
      let scid = `${sutta_uid}:1.1`;
      let langTrans = 'de';
      let translator = 'sabbamitta';
      let vnameTrans = 'Vicki';
      let url = [
        '/scv/play/segment',
        sutta_uid,
        langTrans,
        translator,
        scid,
        vnameTrans,
      ].join('/');
      var res = await supertest(scv.app).get(url)
        .expect(200)
        .expect("Content-Type", /application.json/);
      let { body } = res;
      should(body).properties({
        sutta_uid,
        scid,
        langTrans,
        translator,
        section: 0,
        nSections: 2,
        vnameTrans,
        iSegment: 4,
        vnameRoot: 'Aditi',
      });
      should(body.title).match(/Strophen der altehrwürdigen Nonnen/);
      should.deepEqual(body.segment, {
        scid: 'thig1.1:1.1',
        pli: '“Sukhaṁ supāhi therike, ',
        de: 'Schlafe sanft, kleine Nonne, ',
        ref: 'Sleep softly, little nun, ',
        matched: true,
        audio: {
          de: 'df3554e56794be279cde5df84b8e38ec',
          pli: '4fb90df3760dd54ac4f9f3c31358c8fa'
        }
      });
    })
    it("GET /scv/auth/test-secret", async()=>{
      let name = 'auth/test-secret';
      let port = 3002;
      let testResponse = { secret: `${name} secret` };
      let apiMethod = (req,res) => {
        scv.requireAdmin(req,res);
        return testResponse;
      }
      let rm = new ResourceMethod("get", name, apiMethod);
      let resourceMethods = [rm];
      let scv = await new ScvServer({resourceMethods, port});
      await scv.initialize();
      var url = `/scv/${name}`;
      var res = await testAuthGet({scv, url});
      should.deepEqual(res.body, testResponse);
      await scv.close();
    })
    /* DEPRECATED
    it("GET /scv/auth/aws-creds", async()=>{
      let name = 'auth/aws-creds';
      let scv = await sharedTestServer();
      var url = `/scv/${name}`;

      // authenticated
      var res = await testAuthGet({scv, url});
      let creds = res.body;
      let properties = ['accessKeyId', 'secretAccessKey'];
      should(creds.Bucket).equal('sc-voice-vsm');
      should(creds.s3).properties({region:'us-west-1'});
      should(creds.s3).properties(properties);
      should(creds.s3.accessKeyId.startsWith('*****')).equal(true);
      should(creds.polly).properties({region:'us-west-1'});
      should(creds.polly).properties(properties);
      should(creds.polly.accessKeyId.startsWith('*****')).equal(true);

      // not authenticated
      let errMsg = `requireAdmin() GET /scv/${name} `+
        `user:unidentified-user => UNAUTHORIZED`;
      scv.logLevel = "error";
      let resNoAuth = await supertest(scv.app).get(url)
        .expect(401)
        .expect({ error: errMsg });
    })
    */
    it("GET /scv/audio/:sutta_uid/...", async()=>{
      let scv = await sharedTestServer();
      let filename = 'test-file.mp3';
      let guid = '37cedc61727373870e197793e653330d';
      let sutta_uid = 'thig1.1';
      let langTrans = 'en';
      let translator = 'soma';
      let vnameTrans = 'Amy';
      let url = [
        '/scv/audio',
        sutta_uid,
        langTrans,
        translator,
        vnameTrans,
        guid,
      ].join('/');
      await supertest(scv.app).get(url)
        .expect(200)
        .expect("Content-Type", /audio.mp3/)
        .expect("Content-Length", "13524");
    });
    it("GET /scv/build-download/...", async()=>{
      let scv = await sharedTestServer();
      let audioSuffix = "opus";
      let langs = "pli+en";
      let pattern = "thig1.1/en/soma";
      let vroot = 'Aditi';
      let vtrans = 'Amy';
      let maxResults = 2;

      // https://voice.suttacentral.net/
      // scv/build-download/opus/pli+en/Amy/thig1.1%2fen%2fsoma/Aditi
      let url = [
        '/scv/build-download',
        audioSuffix,
        langs,
        vtrans,
        encodeURIComponent(pattern),
        vroot,
      ].join('/');
      url += `?maxResults=${maxResults}`;

      let res = await supertest(scv.app).get(url)
        .expect(200)
        .expect('Content-Type', /application.*json/);
      let expectedProps = {
        audioSuffix: '.opus',
        lang: 'en',
        langs: ['pli', 'en'],
        maxResults,
        pattern,
        vroot,
        vtrans,
      }
      await new Promise(r=>setTimeout(()=>r(),3*1000));
      let resDone = await supertest(scv.app).get(url)
        .expect(200)
        .expect('Content-Type', /application.*json/)
      should(resDone.body).properties(expectedProps);
      should(resDone.body).properties({
        filename: 'thig1.1-en-soma_pli+en_Amy.opus',
        guid: 'fdff412ffdfe02501dcbce5ae28b3233',
        stats: {
          duration: 50,
          tracks: 2,
          chars: { pli:257, en:306 },
          segments: { pli:9, en:9},
        },
      });
      //console.log(res.body);
    });
    it("GET /scv/download/...", async()=>{
      let scv = await sharedTestServer();
      let audioSuffix = "opus";
      let langs = "pli+en";
      let pattern = "thig1.1/en/soma";
      let vroot = 'Aditi';
      let vtrans = 'Amy';
      let maxResults = 2;

      let url = [
        '/scv/download',
        audioSuffix,
        langs,
        vtrans,
        encodeURIComponent(pattern),
        vroot,
      ].join('/');
      url += `?maxResults=${maxResults}`;

      let res = await supertest(scv.app).get(url)
        .expect(200)
        .expect('Content-Type', /audio.opus/)
        .expect('Content-disposition', /.*thig1.1-en-soma_pli\+en_Amy.opus/)
        .expect('Content-length', '147436');
    });

  });
