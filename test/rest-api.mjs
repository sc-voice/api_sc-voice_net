import { describe, it, expect } from '@sc-voice/vitest';
import should from 'should';
import pkg from '../package.json' assert { type: 'json' };
import jwt from 'jsonwebtoken';
import supertest from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { logger } from 'log-instance';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RestApi = require('../src/rest-api.cjs');
const RbHash = require('../src/rb-hash.cjs');
const ResourceMethod = require('../src/resource-method.cjs');

const APPDIR = path.join(__dirname, '..');
const LOCAL = path.join(APPDIR, 'local');
logger.level = 'warn';

function testRb(app, name='test') {
  return app.locals.restApis.filter((ra) => ra.name === name)[0];
}

const TEST_ADMIN = {
  username: 'test-admin',
  isAdmin: true,
};

class TestApi extends RestApi {
  constructor(name, options = {}) {
    super(Object.assign({name}, options));
    let { resourceMethods } = this;
    resourceMethods.push(new ResourceMethod('get', 'color',
      (req,res,next)=>this.getColor(req,res,next)));
  }

  getColor(req, res, next) {
    return { color: 'blue' };
  }
}

async function testAuthGet(opts={}) {
  let {
    app,
    url,
    contentType='application/json',
    accept=contentType,
  } = opts;
  expect(app==null).toBe(false);
  expect(url==null).toBe(false);

  var token = jwt.sign(TEST_ADMIN, RestApi.JWT_SECRET);
  return supertest(app).get(url)
    .set('Authorization', `Bearer ${token}`)
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
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .send(data);
}

function testHandlers(restApi) {
  return [
    new ResourceMethod('get', 'identity',
      (req,res,next)=>restApi.getIdentity(req,res,next)),
    new ResourceMethod('get', 'state',
      (req,res,next)=>restApi.getState(req,res,next)),
    new ResourceMethod('get', 'app/stats/:stat',
      (req,res,next)=>restApi.getAppStats(req,res,next)),
    new ResourceMethod('post', 'identity',
      (req,res,next)=>restApi.postIdentity(req,res,next)),
    new ResourceMethod('post', 'echo',
      (req,res,next)=>restApi.postEcho(req,res,next)),
  ];
}

describe('rest-api', () => {
  it('default ctor', () => {
    let ra = new RestApi();
    let appDir = APPDIR;
    expect(Object.keys(ra).sort()).toEqual([
      'appDir',
      'name',
    ]);
    expect(ra.appDir).toBe(appDir);
    expect(ra.name).toBe('test');
    expect(ra.uribase).toBe('/test');
  });
  it('RestApi can be extended', async () => {
    var app = express();
    let name = 'testExtended';
    var tb = new TestApi(name).bindExpress(app);
    let res = await supertest(app)
      .get(`/${name}/color`)
      .expect(200);

    expect(res.body).toEqual({ color: 'blue', });
  });
  it('RestApi resources should be unique', () => {
    class TestApi extends RestApi {
      constructor(name, options = {}) {
        super(Object.assign({name}, options));
        let { resourceMethods } = this;
        resourceMethods.push(new ResourceMethod('get', 'state',
          (req,res,next)=>this.getState(req,res,next)));
        resourceMethods.push(new ResourceMethod('get', 'state',
          (req,res,next)=>this.getState(req,res,next)));
      }
    }
    var app = express();
    expect(() => tb.bindExpress(app)).toThrow();
  });
  it('RestApi returns 500 for bad responses', async () => {
    class TestApi extends RestApi {
      constructor(name, options = {}) {
        super(Object.assign({name}, options));
        let { resourceMethods } = this;
        this.rm = new ResourceMethod('get', 'bad-json',
          (req,res,next)=>this.getBadJson(req,res,next));
        resourceMethods.push(this.rm);
        this.rm.logLevel = 'error';
      }
      getBadJson(req, res, next) {
        var badJson = {
          name: 'circular',
        };
        badJson.self = badJson;
        return badJson;
      }
    }
    var app = express();
    var tb = (new TestApi('testBadJSON').bindExpress(app));
    let res = await supertest(app) .get('/testBadJSON/bad-json')
    expect(res.body.error).toMatch(/Converting circular structure to JSON/);
    expect(res.statusCode).toBe(500);
  });
  it('diskusage', async () => {
    var execPromise = util.promisify(exec);
    var cmd = 'df -H /';
    var execOpts = {
      cwd: __dirname,
    };
    var res = await execPromise(cmd, execOpts);
    var stdout = res.stdout.split('\n');
    var stats = stdout.at(1).split(/\s+/);
    let total = RestApi.diskBytes(stats[1]);
    let used = RestApi.diskBytes(stats[2]);
    let avail = RestApi.diskBytes(stats[3]);
    let name='testDiskUsage';

    let ra = new RestApi({ name, });
    let app = express();
    ra.bindExpress(app);
    expect(testRb(app, name)).toBe(ra);
    var res = await ra.getIdentity();
    let prec = 10E6;
    expect(Math.round(res.diskavail/prec)).toBe(Math.round(avail/prec));
    expect(Math.round(res.diskfree/prec)).toBe(Math.round(avail/prec));
    expect(Math.round(res.disktotal/prec)).toBe(Math.round(total/prec));
  });
  it('GET /identity generates HTTP200 response', async () => {
    let app = express();
    let name = 'testIdentity';
    let ra = new RestApi({ name});
    ra.bindExpress(app, testHandlers(ra));
    expect(testRb(app, name)).toBe(ra);
    let res = await supertest(app)
      .get(`/${name}/identity`)
      .expect(200)
      .expect('content-type', /json/)
      .expect('content-type', /utf-8/)
    expect(res.body).toMatchObject({
      name,
      package: pkg.name,
    });
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('hostname');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('loadavg');
    expect(res.body).toHaveProperty('totalmem');
    expect(res.body).toHaveProperty('freemem');
    expect(res.body).toHaveProperty('diskused');
    expect(res.body).toHaveProperty('diskfree');
    expect(res.body).toHaveProperty('diskavail');
    expect(res.body).toHaveProperty('disktotal');
    expect(res.body.diskused).toBeGreaterThan(0);
    expect(res.body.diskused).toBeLessThan(res.body.disktotal);
    expect(res.body.diskavail).toBeGreaterThan(0);
    expect(res.body.diskavail).toBeLessThan(res.body.diskfree + 1);
    expect(res.body.diskfree).toBeGreaterThan(0);
    expect(res.body.diskfree).toBeLessThan(res.body.disktotal);
    expect(res.body.totalmem).toBeGreaterThan(0);
    expect(res.body.totalmem).toBeLessThan(res.body.disktotal);
    expect(res.body.version).toMatch(/\d+.\d+.\d+/);
  });
  it('POST /echo => HTTP200 response with a Promise', async () => {
    let app = express();
    let name = 'testEcho';
    let ra = new RestApi({ name });
    ra.bindExpress(app, testHandlers(ra));
    var service = testRb(app, name);
    expect(ra.taskBag.length).toBe(0);
    ra.taskBegin('testTask');
    expect(ra.taskBag.length).toBe(1);
    let echoJson = { greeting: 'smile' }
    await supertest(app)
      .post(`/${name}/echo`)
      .send(echoJson)
      .expect(200)
      .expect('content-type', /json/)
      .expect('content-type', /utf-8/)
      .expect(echoJson);
  });
  it('taskBegin/taskEnd', async () => {
    let app = express();
    let name = 'testTask';
    let ra = new RestApi({ name });
    ra.bindExpress(app, testHandlers(ra));
    expect(ra.taskBag.length).toBe(0);

    ra.taskBegin('testTask');
    expect(ra.taskBag.length).toBe(1);
    await supertest(app).get(`/${name}/state`)
      .expect(200)
      .expect('content-type', /json/)
      .expect('content-type', /utf-8/)
      .expect({tasks:['testTask']});
    expect(ra.taskBag.length).toBe(1);
    expect(ra.taskBag[0]).toBe('testTask');

    ra.taskEnd('testTask');
    expect(ra.taskBag.length).toBe(0);
    await supertest(app).get(`/${name}/state`)
      .expect(200)
      .expect('content-type', /json/)
      .expect('content-type', /utf-8/)
      .expect({tasks:[]});
  });
  it('POST => HTTP500 response for thrown exception', async () => {
    let name = 'test500';
    let app = express();
    let ra = new RestApi({ name });
    let msg = `${name} expected error`;
    let rm = new ResourceMethod('post', 'throwMe', (req,res) => {
      throw new Error(msg);
    });
    ra.bindExpress(app, [rm]);
    rm.logLevel = 'error';
    let res = await supertest(app)
      .post(`/${name}/throwMe`)
      .send({ greeting: 'whoa' })
      .expect(500)
      .expect('content-type', /json/)
      .expect('content-type', /utf-8/);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(msg);
  });
  it('kebab(id) => kebab case of id', () => {
    var kebab = (id) =>
      id
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '');
    expect(kebab('XFooBar')).toBe('x-foo-bar');
    expect(kebab('xFooBar')).toBe('x-foo-bar');
    expect(kebab('abc')).toBe('abc');
    expect(kebab('aBC')).toBe('a-b-c');
  });
  it('GET /app/stats/heap => v8.getHeapSpaceStatistics', async () => {
    let app = express();
    let ra = new RestApi({name:'test'});
    ra.bindExpress(app, testHandlers(ra));
    let res = await supertest(app)
      .get('/test/app/stats/heap')
      .expect(200)
    let { body:stats } = res;

    expect(stats instanceof Array).toBe(true);
    expect(stats.length).toBeGreaterThan(5);
    res.body.forEach((b) => {
      var mb = b.space_used_size / 10e6;
      logger.info(`heap used ${mb.toFixed(1)}MB ${b.space_name}`);
    });
  });
  it('GET /auth/secret => hello', async () => {
    let app = express();
    let name = 'testAuthGet';
    let ra = new RestApi({name});
    let theSecret =  {secret: 'hello'};
    let authPath = 'auth/secret';
    var url = `/${name}/${authPath}`;
    let authMethod = new ResourceMethod('get', authPath, (req,res) => {
      ra.requireAdmin(req, res);
      return theSecret;
    });
    ra.bindExpress(app, [authMethod]);

    var resAuth = await testAuthGet({url, app});
    expect(resAuth.statusCode).toBe(200);
    expect(resAuth.body).toEqual(theSecret);

    let eCaught;
    let errMsg = `requireAdmin() GET /${authPath} ` +
      `user:unidentified-user => UNAUTHORIZED`;
    ra.logLevel = 'error';
    authMethod.logLevel = 'error';
    let resPublic = await supertest(app).get(url)
      .expect(401)
      .expect('content-type', /application\/json/)
      .expect({ error: errMsg });
  });
  it('POST /auth/secret => hello', async () => {
    let app = express();
    let name = 'testAuthPost';
    let ra = new RestApi({name});
    let authPath = 'auth/secret';
    let url = `/${name}/${authPath}`;
    let authMethod = new ResourceMethod('post', authPath, (req, res) => {
      ra.requireAdmin(req, res);
      return req.body;
    });
    ra.bindExpress(app, [authMethod]);

    let data = {secret: 'hello'};
    let resAuth = await testAuthPost({url, app, data});
    expect(resAuth.statusCode).toBe(200);
    expect(resAuth.body).toEqual(data);

    ra.logLevel = 'error';
    authMethod.logLevel = 'error';
    let errMsg = `requireAdmin() POST /${authPath} ` +
      `user:unidentified-user => UNAUTHORIZED`;
    let resNoAuth = await supertest(app).post(url).send(data)
      .expect(401)
      .expect('content-type', /application\/json/)
      .expect({error:errMsg});
  });
});
