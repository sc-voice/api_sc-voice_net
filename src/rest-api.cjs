(function (exports) {
  const ResourceMethod = require("./resource-method.cjs");
  const EventEmitter = require("events");
  const RbHash = require("./rb-hash.cjs");
  const srcPkg = require("../package.json");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");
  const jwt = require("jsonwebtoken");
  const express = require("express");
  const bodyParser = require("body-parser");
  const logger = require("log-instance").LogInstance.singleton;
  const _rbHash = new RbHash();
  const { exec } = require("child_process");
  const util = require("util");
  const v8 = require("v8");
  const JWT_SECRET = `JWT${Math.random()}`;

  class RestApi {
    constructor(opts = {}) {
      logger.logInstance(this);
      let { name="test" } = opts;
      if (typeof name !== "string") {
        throw new Error(`bundle name is required: ${name}`);
      }
      this.info(`RestApi.ctor(${name})`);
      this.name = name;
      this.appDir =
        opts.appDir || 
        require.resolve("scv-bilara").split("/node_modules")[0];

      let privateProps = {
        resourceMethods: opts.resourceMethods || [],
        uribase: opts.uribase || `/${name}`,
        scvDir: opts.scvDir || path.join(__dirname, ".."),
        taskBag: [], // unordered task collection with duplicates
        router: express.Router(),
      };
      Object.keys(privateProps).forEach(prop=>{
        Object.defineProperty(this, prop, {
          value: privateProps[prop],
        });
      });
    }

    static get JWT_SECRET() { return JWT_SECRET; }

    static diskBytes(dfString) {
      let byteStr = dfString
        .replace('T', "000000000000")
        .replace('G', "000000000")
        .replace('M', "000000")
        .replace('K', "000")

      return Number(byteStr)
    }

    requireAdmin(req, res) {
      let authorization = req.headers.authorization || "";
      let decoded = jwt.decode(authorization.split(" ")[1]) || {};
      let { username='unidentified-user' } = decoded;
      let { name } = this;
      let { method, path } = req;
      let methodPath = `${method} ${path}`;
      let msg = `requireAdmin() ${methodPath} user:${username}`;
      if (decoded.isAdmin) {
        this.info(`${msg}} => authorized)`);
      } else {
        res.status(401);
        let errMsg = `${msg} => UNAUTHORIZED`;
        res.send({error:errMsg});
        this.warn(errMsg);
        throw new Error(errMsg);
      }
      return true;
    }

    taskPromise(name, cbPromise) {
      return new Promise((resolve, reject) => {
        var onError = (err, n, level) => {
          logger[level]("taskPromise#" + n + ":", err.stack);
          this.taskEnd(name);
          reject(err);
        };
        try {
          this.taskBegin(name);
          try {
            cbPromise(
              (data) => {
                try {
                  this.taskEnd(name);
                  resolve(data);
                } catch (err) {
                  onError(err, 1, "warn"); // implementation error
                }
              },
              (err) => onError(err, 2, "info")
            ); // cbpromise error
          } catch (err) {
            onError(err, 3, "info"); // cbpromise error
          }
        } catch (err) {
          onError(err, 4, "warn"); // implementation error
        }
      });
    }

    taskBegin(name) {
      this.taskBag.push(name);
    }

    taskEnd(name) {
      if (this.taskBag.length < 1) {
        throw new Error(
          "taskEnd() expected:" + name + " actual:(no pending tasks)"
        );
      }
      var iName = this.taskBag.indexOf(name);
      if (iName < 0) {
        throw new Error("taskEnd() could not locate pending task:" + name);
      }
      this.taskBag.splice(iName, 1);
    }

    getAppStats(req, res, next) {
      var stat = req.params.stat || "heap";
      return new Promise((resolve, reject) => {
        try {
          if (stat === "heap") {
            resolve(v8.getHeapSpaceStatistics());
          } else {
            resolve(v8.getHeapSpaceStatistics());
          }
        } catch (e) {
          logger.warn(e.stack);
          reject(e);
        }
      });
    }

    getState(req, res, next) {
      return {
        tasks: this.taskBag,
      };
    }

    async getIdentity(req, res) {
      try {
        var execPromise = util.promisify(exec);
        var cmd = "df -H /";
        var execOpts = {
          cwd: __dirname,
        };
        var res = await execPromise(cmd, execOpts);
        var stdout = res.stdout.split("\n");
        var stats = stdout.at(1).split(/\s\s*/);
        //console.log('getIdentity', stdout);
        let disktotal = RestApi.diskBytes(stats[1]);
        let diskused = RestApi.diskBytes(stats[2]);
        let diskavail = RestApi.diskBytes(stats[3]);
        return {
          name: this.name,
          package: srcPkg.name,
          version: srcPkg.version,
          hostname: os.hostname(),
          uptime: os.uptime(),
          loadavg: os.loadavg(),
          totalmem: os.totalmem(),
          freemem: os.freemem(),
          diskused,
          diskavail,
          diskfree: diskavail,
          disktotal: disktotal,
        };
      } catch (e) {
        logger.warn(`getIdentity()`, e.message);
        throw e;
      }
    }

    postIdentity(req, res, next) {
      throw new Error("POST not supported: " + JSON.stringify(req.body));
    }

    postEcho(req, res, next) {
      return this.taskPromise("postEcho", (resolve, reject) => {
        setTimeout(() => resolve(req.body), 0);
      });
    }

    handleRequestError(req, res, err, next) {
      logger.warn(`RestApi.handleRequestError(${req.method} ${req.url})`);
      logger.warn(err.stack);
      this.$onRequestFail(req, res, err, next);
    }

    bindExpress(app, restHandlers) {
      let { router, name, uribase, resourceMethods} = this;

      restHandlers && restHandlers.forEach(h=>resourceMethods.push(h));
      let { locals } = app;
      router.use(bodyParser.json());
      let restApis = locals.restApis = locals.restApis || [];
      restApis.push(this);
      resourceMethods.sort((a, b) => {
        var cmp = a.method.localeCompare(b.method);
        if (cmp === 0) {
          cmp = a.name.localeCompare(b.name);
          if (cmp === 0) {
            var msg =
              "duplicate REST resource handler: " +
              a.method +
              " " +
              a.name;
            throw new Error(msg);
          }
        }
        return cmp;
      });
      resourceMethods.forEach((resource) => {
        logger.debug(
          "RestApi.bindExpress:",
          resource.method,
          `/${name}/${resource.name} => ${resource.mime}`
        );
        resource.use(router);
      });
      app.disable("x-powered-by"); // suppress header warning
      app.use(uribase, router); // mount API
      return this;
    }

  } // class RestApi

  module.exports = exports.RestApi = RestApi;
})(typeof exports === "object" ? exports : (exports = {}));
