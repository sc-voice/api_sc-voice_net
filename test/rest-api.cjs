const supertest = require("supertest");

typeof describe === "function" &&
  describe("rest-api", function () {
    const should = require("should");
    const pkg = require("../package.json");
    const jwt = require("jsonwebtoken");
    const RestApi = require("../src/rest-api.cjs");
    const supertest = require("supertest");
    const express = require("express");
    const fs = require("fs");
    const path = require("path");
    const { exec } = require("child_process");
    const util = require("util");
    const { logger } = require("log-instance");
    const RbHash = require("../src/rb-hash.cjs");
    const ResourceMethod = require("../src/resource-method.cjs");
    const APPDIR = path.join(__dirname, '..');
    const LOCAL = path.join(APPDIR, 'local');
    logger.level = "warn";
    function testRb(app, name="test") {
      return app.locals.restApis.filter((ra) => ra.name === name)[0];
    }
    const TEST_ADMIN = {
      username: "test-admin",
      isAdmin: true,
    };

    this.timeout(5 * 1000);

    class TestApi extends RestApi {
      constructor(name, options = {}) {
        super(Object.assign({name}, options));
        let { resourceMethods } = this;
        resourceMethods.push(new ResourceMethod( "get", "color", 
          (req,res,next)=>this.getColor(req,res,next)));
      }

      getColor(req, res, next) {
        return { color: "blue" };
      }
    }

    async function testAuthGet(opts={}) {
      let {
        app,
        url,
        contentType='application/json', 
        accept=contentType,
      } = opts;
      should(app==null).equal(false);
      should(url==null).equal(false);
    
      var token = jwt.sign(TEST_ADMIN, RestApi.JWT_SECRET);
      return supertest(app).get(url)
        .set("Authorization", `Bearer ${token}`)
        .set('Content-Type', contentType)
        .set('Accept', accept)
        .expect('Content-Type', new RegExp(contentType))
        ;
    }

    function testAuthPost(opts={}) {
      let {
        app,
        url,
        data,
        contentType='application/json', 
        accept=contentType,
      } = opts;
      var token = jwt.sign(TEST_ADMIN, RestApi.JWT_SECRET);
      return supertest(app).post(url)
        .set("Authorization", `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .send(data);
    }

    function testHandlers(restApi) {
      return [
        new ResourceMethod("get", "identity", 
          (req,res,next)=>restApi.getIdentity(req,res,next)),
        new ResourceMethod("get", "state", 
          (req,res,next)=>restApi.getState(req,res,next)),
        new ResourceMethod("get", "app/stats/:stat", 
          (req,res,next)=>restApi.getAppStats(req,res,next)),
        new ResourceMethod("post", "identity", 
          (req,res,next)=>restApi.postIdentity(req,res,next)),
        new ResourceMethod("post", "echo", 
          (req,res,next)=>restApi.postEcho(req,res,next)),
      ];
    }

    it("default ctor", ()=>{
      let ra = new RestApi();
      let appDir = APPDIR;
      should.deepEqual(Object.keys(ra).sort(), [
        "appDir",
        "name", 
      ]);
      should(ra.appDir).equal(appDir);
      should(ra.name).equal("test");
      should(ra.uribase).equal("/test");
    });
    it("RestApi can be extended", async()=>{
      var app = express();
      let name = "testExtended";
      var tb = new TestApi(name).bindExpress(app);
      let res = await supertest(app)
        .get(`/${name}/color`)
        .expect(200);

      should.deepEqual(res.body, { color: "blue", });
    });
    it("RestApi resources should be unique", ()=>{
      class TestApi extends RestApi {
        constructor(name, options = {}) {
          super(Object.assign({name}, options));
          let { resourceMethods } = this;
          resourceMethods.push(new ResourceMethod( "get", "state", 
            (req,res,next)=>this.getState(req,res,next)));
          resourceMethods.push(new ResourceMethod( "get", "state", 
            (req,res,next)=>this.getState(req,res,next)));
        }
      }
      var app = express();
      should.throws(() => tb.bindExpress(app));
    });
    it("RestApi returns 500 for bad responses", async()=>{
      class TestApi extends RestApi {
        constructor(name, options = {}) {
          super(Object.assign({name}, options));
          let { resourceMethods } = this;
          this.rm = new ResourceMethod("get", "bad-json", 
            (req,res,next)=>this.getBadJson(req,res,next));
          resourceMethods.push(this.rm);
          this.rm.logLevel = 'error'; // suppress error during test
        }
        getBadJson(req, res, next) {
          var badJson = {
            name: "circular",
          };
          badJson.self = badJson;
          return badJson;
        }
      }
      var app = express();
      var tb = (new TestApi("testBadJSON").bindExpress(app));
      let res = await supertest(app) .get("/testBadJSON/bad-json")
      should(res.body.error).match(/Converting circular structure to JSON/);
      should(res.statusCode).equal(500);
    });
    it("diskusage", async () => {
      var execPromise = util.promisify(exec);
      var cmd = "df -H /";
      var execOpts = {
        cwd: __dirname,
      };
      var res = await execPromise(cmd, execOpts);
      var stdout = res.stdout.split("\n");
      var stats = stdout.at(1).split(/\s+/);
      let total = RestApi.diskBytes(stats[1]);
      let used = RestApi.diskBytes(stats[2]);
      let avail = RestApi.diskBytes(stats[3]);
      let name="testDiskUsage";
      //console.log(`dbg diskusage`, {stats, used, avail, total});

      let ra = new RestApi({ name, });
      let app = express();
      ra.bindExpress(app);
      should(testRb(app, name)).equal(ra);
      var res = await ra.getIdentity();
      let prec = 10E6;
      should(Math.round(res.diskavail/prec)).equal(Math.round(avail/prec));
      should(Math.round(res.diskfree/prec)).equal(Math.round(avail/prec));
      should(Math.round(res.disktotal/prec)).equal(Math.round(total/prec));
      //console.log(`dbg getIdientity`, res);
    });
    it("GET /identity generates HTTP200 response", async()=>{
      let app = express();
      let name = "testIdentity";
      let ra = new RestApi({ name});
      ra.bindExpress(app, testHandlers(ra));
      should(testRb(app, name)).equal(ra);
      let res = await supertest(app)
        .get(`/${name}/identity`)
        .expect(200)
        .expect("content-type", /json/)
        .expect("content-type", /utf-8/)
      res.body.should.properties({
        name,
        package: pkg.name,
      });
      res.body.should.properties([
        "version",
        "hostname",
        "uptime",
        "loadavg",
        "totalmem",
        "freemem",
        "diskused",
        "diskfree",
        "diskavail",
        "disktotal",
      ]);
      should(res.body.diskused).above(0).below(res.body.disktotal);
      should(res.body.diskavail).above(0).below(res.body.diskfree + 1);
      should(res.body.diskfree).above(0).below(res.body.disktotal);
      should(res.body.totalmem).above(0).below(res.body.disktotal);
      res.body.version.should.match(/\d+.\d+.\d+/);
    });
    it("POST /echo => HTTP200 response with a Promise", async()=>{
      let app = express();
      let name = "testEcho";
      let ra = new RestApi({ name });
      ra.bindExpress(app, testHandlers(ra));
      var service = testRb(app, name);
      ra.taskBag.length.should.equal(0);
      ra.taskBegin("testTask");
      ra.taskBag.length.should.equal(1);
      let echoJson = { greeting: "smile" }
      await supertest(app)
        .post(`/${name}/echo`)
        .send(echoJson)
        .expect(200)
        .expect('content-type', /json/)
        .expect('content-type', /utf-8/)
        .expect(echoJson);
    });
    it("taskBegin/taskEnd", async()=>{
      let app = express();
      let name = "testTask";
      let ra = new RestApi({ name });
      ra.bindExpress(app, testHandlers(ra));
      ra.taskBag.length.should.equal(0);

      // Begin server task
      ra.taskBegin("testTask");
      ra.taskBag.length.should.equal(1);
      await supertest(app).get(`/${name}/state`)
        .expect(200)
        .expect('content-type', /json/)
        .expect('content-type', /utf-8/)
        .expect({tasks:['testTask']});
      ra.taskBag.length.should.equal(1);
      ra.taskBag[0].should.equal("testTask");

      // End server task
      ra.taskEnd("testTask");
      ra.taskBag.length.should.equal(0);
      await supertest(app).get(`/${name}/state`)
        .expect(200)
        .expect('content-type', /json/)
        .expect('content-type', /utf-8/)
        .expect({tasks:[]});
    });
    it("POST => HTTP500 response for thrown exception", async()=>{
      let name = "test500";
      let app = express();
      let ra = new RestApi({ name });
      let msg = `${name} expected error`;
      let rm = new ResourceMethod("post", "throwMe", (req,res)=>{
        throw new Error(msg);
      });
      ra.bindExpress(app, [rm]);
      rm.logLevel = "error"; // suppress error log 
      let res = await supertest(app)
        .post(`/${name}/throwMe`)
        .send({ greeting: "whoa" })
        .expect(500)
        .expect('content-type', /json/)
        .expect('content-type', /utf-8/);

      res.body.should.properties("error");
      res.body.error.should.match(msg);
    });
    it("kebab(id) => kebab case of id", function () {
      var kebab = (id) =>
        id
          .replace(/([A-Z])/g, "-$1")
          .toLowerCase()
          .replace(/^-/, "");
      kebab("XFooBar").should.equal("x-foo-bar");
      kebab("xFooBar").should.equal("x-foo-bar");
      kebab("abc").should.equal("abc");
      kebab("aBC").should.equal("a-b-c");
    });
    it("GET /app/stats/heap => v8.getHeapSpaceStatistics", async()=>{
      let app = express();
      let ra = new RestApi({name:"test"});
      ra.bindExpress(app, testHandlers(ra));
      let res = await supertest(app)
        .get("/test/app/stats/heap")
        .expect(200)
      let { body:stats } = res;

      should(stats instanceof Array);
      should(stats.length).above(5);
      res.body.forEach((b) => {
        var mb = b.space_used_size / 10e6;
        logger.info(`heap used ${mb.toFixed(1)}MB ${b.space_name}`);
      });
    });
    it("GET /auth/secret => hello", async()=>{
      let app = express();
      let name = "testAuthGet";
      let ra = new RestApi({name});
      let theSecret =  {secret: "hello"};
      let authPath = "auth/secret";
      var url = `/${name}/${authPath}`;
      let authMethod = new ResourceMethod("get", authPath, (req,res) => {
        ra.requireAdmin(req, res);
        return theSecret;
      });
      ra.bindExpress(app, [authMethod]);

      // authorized
      var resAuth = await testAuthGet({url, app});
      resAuth.statusCode.should.equal(200);
      should.deepEqual(resAuth.body, theSecret);

      // unauthorized
      let eCaught;
      let errMsg = `requireAdmin() GET /${authPath} ` +
        `user:unidentified-user => UNAUTHORIZED`;
      ra.logLevel = 'error';
      authMethod.logLevel = 'error';
      let resPublic = await supertest(app).get(url)
        .expect(401)
        .expect("content-type", /application\/json/)
        .expect({ error: errMsg });
    });
    it("POST /auth/secret => hello", async()=>{
      let app = express();
      let name = "testAuthPost";
      let ra = new RestApi({name});
      let authPath = "auth/secret";
      let url = `/${name}/${authPath}`;
      let authMethod = new ResourceMethod("post", authPath, (req, res)=>{
        ra.requireAdmin(req, res);
        return req.body;
      });
      ra.bindExpress(app, [authMethod]);

      let data = {secret: "hello"};
      let resAuth = await testAuthPost({url, app, data});
      resAuth.statusCode.should.equal(200);
      should.deepEqual(resAuth.body, data);

      ra.logLevel = 'error';
      authMethod.logLevel = 'error';
      let errMsg = `requireAdmin() POST /${authPath} ` +
        `user:unidentified-user => UNAUTHORIZED`;
      let resNoAuth = await supertest(app).post(url).send(data)
        .expect(401)
        .expect("content-type", /application\/json/)
        .expect({error:errMsg});
    });
    /*
    it("GET /play/segment/... => playable segment", done=>{
        (async function() { try {
            await new Promise(resolve=>setTimeout(()=>resolve(),1000));
            var voicename = 'Matthew';
            var scid = "mn1:0.1";
            var url = 
                `/scv/play/segment/mn1/en/sujato/${scid}/${voicename}`;
            var res = await supertest(app).get(url);
            res.statusCode.should.equal(200);
            var data = res.body instanceof Buffer 
                ? JSON.parse(res.body) : res.body;
            should(data.segment.en).match(/^Middle Discourses 1/);
            should(data.segment.audio.pli)
                .match(/eb2c6cf0626c7a0f422da93a230c4ab7/); // no numbers

            var scid = "mn1:3.1";
            var url = 
                `/scv/play/segment/mn1/en/sujato/${scid}/${voicename}`;
            var res = await supertest(app).get(url);
            res.statusCode.should.equal(200);
            var data = res.body instanceof Buffer 
                ? JSON.parse(res.body) : res.body;
            should(data.segment.en).match(/^.Take an uneducated ordinary/);
            if (0) { // simulate REST response using static file
                var testPath = path.join(PUBLIC,
                    `play/segment/mn1/en/sujato/${scid}/${voicename}`);
                fs.writeFileSync(testPath, JSON.stringify(data, null,2));
            }

            done();
        } catch(e) {done(e);} })();
    });
    it("GET /play/segment/... => playable segment", done=>{
        (async function() { try {
            var voicename = '0';
            var scid = "mn1:0.1";
            var url = `/scv/play/segment/mn1/en/sujato/${scid}/${voicename}`;
            var res = await supertest(app).get(url);
            res.statusCode.should.equal(200);
            var data = res.body instanceof Buffer ? JSON.parse(res.body) : res.body;
            should(data.segment.en).match(/^Middle Discourses 1/);
            should(data.segment.audio.pli).match(/eb2c6cf0626c7a0f422da93a230c4ab7/); // no numbers

            if (0) {
                var scid = "mn1:52-74.23";
                var url = `/scv/play/segment/mn1/en/sujato/${scid}/${voicename}`;
                var res = await supertest(app).get(url);
                res.statusCode.should.equal(200);
                var data = res.body instanceof Buffer ? JSON.parse(res.body) : res.body;
                should(data.sutta_uid).equal('mn1');
                should(data.vnameLang).equal('Amy');
                should(data.vnameRoot).equal('Aditi');
                should(data.iSegment).equal(299);
                should(data.section).equal(4);
                should(data.nSections).equal(10);
                should(data.voicename).equal(voicename);
                should(data.language).equal('en');
                should(data.translator).equal('sujato');
                should(data.segment.en).match(/^They directly know extinguishment as/);
                should(data.segment.audio.en).match(/^3f8996/);
                should(data.segment.audio.pli).match(/^a777fb/);
            }


            if (1) {
                var scid = "mn1:3.1";
                var url = `/scv/play/segment/mn1/en/sujato/${scid}/${voicename}`;
                var res = await supertest(app).get(url);
                res.statusCode.should.equal(200);
                var data = res.body instanceof Buffer ? JSON.parse(res.body) : res.body;
                should(data.segment.en).match(/^.Take an uneducated ordinary/);
                var testPath = path.join(PUBLIC,
                    `play/segment/mn1/en/sujato/${scid}/${voicename}`);
                fs.writeFileSync(testPath, JSON.stringify(data, null,2));
            }

            if (0) {
                var scid = "mn1:3.2";
                var url = `/scv/play/segment/mn1/en/sujato/${scid}/${voicename}`;
                var res = await supertest(app).get(url);
                res.statusCode.should.equal(200);
                var data = res.body instanceof Buffer ? JSON.parse(res.body) : res.body;
                should(data.segment.en).match(/^They perceive earth as earth/);
                var testPath = path.join(PUBLIC,
                    `play/segment/mn1/en/sujato/${scid}/${voicename}`);
                fs.writeFileSync(testPath, JSON.stringify(data, null,2));
            }

            done();
        } catch(e) {done(e);} })();
    });
    it("GET /play/audio/:suid/:lang/:trans/:voice/:guid returns audio", function(done) {
        (async function() { try {
            done();
        } catch(e) {done(e);} })();
    });
    it("GET /play/segment/... handles large segment", async()=>{
        console.log(`TODO`, __filename); return; 
        await new Promise(resolve=>setTimeout(()=>resolve(),1000));
        var scid = "an2.281-309:1.1";
        var sutta_uid = scid.split(":")[0];
        var vnameTrans = "1"; // Matthew
        var url = `/scv/play/segment/${sutta_uid}/`+
            `en/sujato/${scid}/${vnameTrans}`;
        var res = await supertest(app).get(url);
        res.statusCode.should.equal(200);
        var data = res.body instanceof Buffer 
            ? JSON.parse(res.body) : res.body;
        should(data.sutta_uid).equal('an2.281-309');
        should(data.vnameTrans).equal('Brian');
        should(data.vnameRoot).equal('Aditi');
        should(data.iSegment).equal(9);
        should(data.nSections).equal(3);
        should(data.language).equal('en');
        should(data.translator).equal('sujato');
        should(data.segment.en)
            .match(/^.For two reasons the Realized One/);
        should(data.segment.audio.en)
            .match(/4341471c187e12334475901a9599698c/);
        should(data.segment.audio.pli)
            .match(/7bd718c9fbda06ab56b2d09a05776353/);
    });
    it("GET /play/segment/... handles HumanTts dn33", async()=>{
        var scid = "dn33:0.1";
        var sutta_uid = scid.split(":")[0];
        var langTrans = 'en';
        var vnameTrans = "sujato_en";
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
        should(data.vnameTrans).equal(vnameTrans);
        should(data.vnameRoot).equal(vnameRoot);
        should(data.iSegment).equal(0);
        should(data.section).equal(0);
        should(data.nSections).equal(12);
        should(data.language).equal('en');
        should(data.translator).equal('sujato');
        should(data.segment.pli).match(/^Dīgha Nikāya 33/);
        should(data.segment.audio.vnamePali).equal('Aditi');
        should(data.segment.audio.vnameTrans).equal('Amy');
        should(data.segment.audio.en)
            .match(/b06d3e95cd46714448903fa8bcb12004/);
        should(data.segment.audio.pli)
            .match(/899e4cd12b700b01200f295631b1576b/);
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
            should(data.segment.pli).match(/Sāvatthinidānaṁ./);
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
                .match(/ekaṁ samayaṁ bhagavā sāvatthiyaṁ./);
            should(data.segment.audio.en)
                .match(/d0a8567a6fca2fbeaa5d14e610304826/);
            should(data.segment.audio.pli)
                .match(/a11ebc9a6bbe583d36e375ca163b6351/);
            should(data.segment.audio.vnamePali).equal('Aditi');

            done();
        } catch(e) {done(e);} })();
    });
    it("GET /play/segment/... handles thig1.1/en/soma", done=>{
        (async function() { try {
            // scv/play/segment/thig1.1/en/soma/thig1.1:1.1/Amy/Aditi
            var sutta_uid = 'thig1.1';
            var langTrans = 'en';
            var translator = 1 ? 'soma' : 'sujato';
            var vnameTrans = "Amy";
            var vnameRoot = "Aditi";
            var segnum = "1.1";
            var scid = `${sutta_uid}:${segnum}`;
            var url = [
                `/scv/play/segment`,
                sutta_uid,
                langTrans,
                translator,
                scid,
                vnameTrans,
                vnameRoot,
            ].join('/');
            console.log('url', url);
            logger.warn("EXPECTED WARN BEGIN");
            var res = await supertest(app).get(url);
            logger.warn("EXPECTED WARN END");
            res.statusCode.should.equal(200);
            var data = res.body instanceof Buffer 
                ? JSON.parse(res.body) : res.body;
            should(data.sutta_uid).equal(scid.split(':')[0]);
            should(data.vnameTrans).equal(vnameTrans);
            should(data.vnameRoot).equal(vnameRoot);
            should(data.language).equal(langTrans);
            should(data.translator).equal(translator);
            should(data.segment.audio.en).match(/37cedc61727373870e197793e653330d/);
            should(data.segment.en).match(/sleep with ease, elder/i);

            done();
        } catch(e) {done(e);} })();
    });
  */
  });
