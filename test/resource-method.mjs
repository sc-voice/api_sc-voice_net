import { describe, it } from '@sc-voice/vitest';
import should from "should";
import supertest from "supertest";
import express from "express";
import ResourceMethod from "../src/resource-method.cjs"
import util from "util";

describe("resource-method", () => {
    it("default ctor()", async()=>{
      let eCaught;
      try {
        let rm = new ResourceMethod();
        rm.handler();
      } catch(e) {
        eCaught = e;
      }
      should(eCaught.message).match(/expected: name/);
    })

    class MockResponse {
      constructor(data, code, type) {
        this.mockData = data;
        this.statusCode = code;
        this.mockType = type;
      }

      send(data) { this.mockData = data; }
      status(code) { this.statusCode = code; }
      type(t) { this.mockType = t; }
    }

    it("custom ctor()", async()=>{
      let name = 'testName';
      let method = 'testMethod';
      let METHOD = method.toUpperCase();
      let mime = 'testMime';
      let testResponse = {hello: 'testHandler'};
      let handler = (req, res, next)=>testResponse;

      { // all custom
        let rm = new ResourceMethod(method, name, handler, mime);
        should(rm).properties({
          name: `${method.toUpperCase()} ${name}`, 
          method:METHOD, 
          mime, 
          handler,
        });
        should(rm.handler()).equal(testResponse);
      }

      { // mime is optional
        let mime = "application/json";
        let rm = new ResourceMethod(method, name, handler, );
        should(rm).properties({
          name: `${method.toUpperCase()} ${name}`, 
          method:METHOD, 
          mime, 
          handler,
        });
        should(rm.handler()).equal(testResponse);
      }
    })
    it("processRequest() => HTTP200 response", async() => {
      let name = "testProcessRequest";
      let testResponse = {[name]: 'OK'};
      let method = "get";
      let mime = "application/json";
      let handler = (req, res) => testResponse;
      let rm = new ResourceMethod(method, name, handler, mime);
      let req = {};
      let res = new MockResponse();
      await rm.processRequest(req,res);
      should.deepEqual(res, new MockResponse(testResponse, 200, mime));
    })
    it("processRequest() => HTTP500 response", async() => {
      let name = "testHTTP500";
      let errMsg = `${name}-error-message`;
      let method = "get";
      let mime = "text/html";
      let handler = (req, res) => { 
        throw new Error(errMsg); 
      };
      let rm = new ResourceMethod(method, name, handler, mime);
      rm.logLevel = 'error';
      let req = {};
      let res = new MockResponse();
      await rm.processRequest(req,res);
      let testResponse = { error: errMsg };
      should.deepEqual(res, 
        new MockResponse(testResponse, 500, "application/json"));
    })
    it("use() => bind to express get", async()=>{
      let name = "testUse";
      let testResponse = {[name]: 'OK'};
      let method = "get";
      let app = express();
      let port = 3002;

      let rm = new ResourceMethod(method, name, (req)=>testResponse);
      let req = {};
      rm.use(app);
      let listener = app.listen(port);
      var testRes = await supertest(app)
        .get(`/${name}`)
        .set('Accept', 'application/json')
        .expect(200)
        .expect("Content-Type", /json/)
        .expect(testResponse);

      await new Promise(resolve => listener.close(()=>resolve()));
    });
    it("use() => invalid method", async()=>{
      let name = "testUseInvalid";
      let testResponse = {[name]: 'OK'};
      let method = "BAD-METHOD";
      let rm = new ResourceMethod(method, name, (req)=>testResponse);
      let req = {};
      let app = express();
      let eCaught;
      try {
        rm.use(app);
      } catch(e) { eCaught = e}
      should(eCaught.message).equal(
        `ResourceMethod.use() unsupported HTTP method:${method} [${name}]`
      );
    });
  });
