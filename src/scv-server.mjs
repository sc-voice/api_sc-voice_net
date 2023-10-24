import fs from "fs";
import path from "path";
import https from 'node:https';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.dirname(__dirname);
const LOCAL_DIR = path.join(APP_DIR, 'local');
global.__appdir = APP_DIR;

import compression from "compression";
import express from "express";
import favicon from "serve-favicon";
import { expressjwt as jwt } from 'express-jwt';
import { logger, } from 'log-instance';
import pkgScApi from 'suttacentral-api';
const { ScApi } = pkgScApi;
import RestApi from './rest-api.cjs';
import ScvApi from './scv-api.cjs';
import ResourceMethod from './resource-method.cjs';
import S3Creds from './s3-creds.cjs';
import { default as ExpressStatusMonitor  } 
  from "@sc-voice/express-status-monitor";

//TBD import ScvApi from "./scv-rest.js";

//TBD import pkgRestApi from "rest-api";
//TBD const { RestApi, RbServer, } = pkgRestApi;
const MS_MINUTE = 60*1000;

const portMap = {};

export default class ScvServer extends RestApi {
  constructor(opts={}) {
    super(Object.assign({
      name: opts.name || "scv",
    }, opts));
    const msg = "ScvServer() ";
    //logger.logInstance(this); // RestApi is a logger

    // configuration
    this.appDir = opts.appDir || APP_DIR;
    this.distDir = opts.distDir || path.join(APP_DIR, 'dist');
    this.initialized = undefined;
    this.sslPath = opts.sslPath || path.join(LOCAL_DIR, 'ssl');
    this.protocol = opts.protocol || "http";
    this.port =  opts.port || 
      this.protocol === "https" && 443 ||
      80;
    let apiUrl = opts.apiUrl || 'http://suttacentral.net/api';
    this.apiUrl = apiUrl;
    let { autoSyncSeconds } = opts;

    // injection
    let app = opts.app || express();
    app.use(ExpressStatusMonitor());
    Object.defineProperty(this, "app", {value: app});
    let scApi = opts.scApi || new ScApi({apiUrl});
    Object.defineProperty(this, "scApi", {value: scApi});
    let scvApi = opts.scvApi || new ScvApi({autoSyncSeconds});
    Object.defineProperty(this, "scvApi", {value: scvApi});

    this.debug("ctor", opts);
    this.info("ctor", this);
  }

  static get portMap() { return portMap }

  _addResourceMethods() {
    let that = this;
    let jsonMime = "application/json";
    let { resourceMethods, scvApi } = this;

    // monitoring
    resourceMethods.push(new ResourceMethod( "get",
      "statfs", (req,res)=>scvApi.get_statfs(req,res) ));

    // ebt-site
    resourceMethods.push(new ResourceMethod( "get", 
      "ebt-site/:sutta_uid", (req,res)=>scvApi.getEbtSite(req,res) ));
    resourceMethods.push(new ResourceMethod( "get", 
      "ebt-site/:sutta_uid/:lang", 
      (req,res)=>scvApi.getEbtSite(req,res) ));
    resourceMethods.push(new ResourceMethod( "get", 
      "ebt-site/:sutta_uid/:lang/:author", 
      (req,res)=>scvApi.getEbtSite(req,res) ));

    // links
    resourceMethods.push(new ResourceMethod( "get", 
      "links/:sutta_uid", (req,res)=>scvApi.getLinks(req,res) ));
    resourceMethods.push(new ResourceMethod( "get", 
      "links/:sutta_uid/:lang", (req,res)=>scvApi.getLinks(req,res) ));
    resourceMethods.push(new ResourceMethod( "get", 
      "links/:sutta_uid/:lang/:author", 
      (req,res)=>scvApi.getLinks(req,res) ));

    // search
    resourceMethods.push(new ResourceMethod( "get", 
      "search/:pattern", (req,res)=>scvApi.getSearch(req,res) ));
    resourceMethods.push(new ResourceMethod( "get", 
      "search/:pattern/:lang", (req,res)=>scvApi.getSearch(req,res) ));

    // play segment
    resourceMethods.push(new ResourceMethod( "get", 
      "play/segment/:sutta_uid/:langTrans/:translator/:scid/:vnameTrans", 
      (req,res)=>scvApi.getPlaySegment(req,res) ));
    resourceMethods.push(new ResourceMethod( "get", 
      "play/segment/:sutta_uid/:langTrans/:translator/:scid/:vnameTrans/:vnameRoot", 
      (req,res)=>scvApi.getPlaySegment(req,res) ));
    resourceMethods.push(new ResourceMethod( "get", 
      "audio/:guid",
      (req,res)=>scvApi.getAudio(req,res), scvApi.audioMIME ));
    resourceMethods.push(new ResourceMethod( "get", 
      "audio/:guid/:filename",
      (req,res)=>scvApi.getAudio(req,res), scvApi.audioMIME ));
    resourceMethods.push(new ResourceMethod( "get", 
      "audio/:sutta_uid/:langTrans/:translator/:vnameTrans/:guid", 
      (req,res)=>scvApi.getAudio(req,res), scvApi.audioMIME ));

    // download
    resourceMethods.push(new ResourceMethod( "get", [
      'build-download',
      ':audioSuffix',
      ':langs',
      ':vtrans',
      ':pattern',
      ':vroot', 
      ].join('/'),
      (req,res)=>scvApi.getBuildDownload(req,res), jsonMime));
      // https://voice.suttacentral.net/
      // scv/build-download/opus/pli+en/Amy/thig1.1%2fen%2fsoma/Aditi
    resourceMethods.push(new ResourceMethod( "get", 
      'download/ogg/:langs/:vtrans/:pattern',
      (req,res)=>scvApi.getDownloadPlaylist(req,res), 'audio/ogg'));
    resourceMethods.push(new ResourceMethod( "get", 
      'download/ogg/:langs/:vtrans/:pattern/:vroot',
      (req,res)=>scvApi.getDownloadPlaylist(req,res), 'audio/ogg'));
    resourceMethods.push(new ResourceMethod( "get", 
      'download/opus/:langs/:vtrans/:pattern',
      (req,res)=>scvApi.getDownloadPlaylist(req,res), 'audio/opus'));
    resourceMethods.push(new ResourceMethod( "get", 
      'download/opus/:langs/:vtrans/:pattern/:vroot',
      (req,res)=>scvApi.getDownloadPlaylist(req,res), 'audio/opus'));
    resourceMethods.push(new ResourceMethod( "get", 
      'download/mp3/:langs/:vtrans/:pattern',
      (req,res)=>scvApi.getDownloadPlaylist(req,res), 'audio/mp3'));
    resourceMethods.push(new ResourceMethod( "get", 
      'download/mp3/:langs/:vtrans/:pattern/:vroot',
      (req,res)=>scvApi.getDownloadPlaylist(req,res), 'audio/mp3'));

    // authenticated
    resourceMethods.push(new ResourceMethod( "get", 
      "auth/aws-creds", (req,res)=>scvApi.getAwsCreds(req,res) ));

    resourceMethods.forEach(rm => 
      this.info('_addResourceMethods', rm.method, rm.name));
  }

  async listenSSL(restBundles=[], sslOpts) {
    let { port, app, sslPath } = this;
    if (!fs.existsSync(sslPath)) {
      throw new Error(`Nonexistent sslPath:${sslPath}`);
    }
    sslOpts = sslOpts || {
      cert: fs.readFileSync(path.join(sslPath, 'server.crt')),
      key: fs.readFileSync(path.join(sslPath, 'server.key')),
    };
    if (portMap[port]) {
      throw new Error(
        `ScvServer.listenSSL() conflict with active port:${port}`);
    }
    this.port = port;
    portMap[port] = this;
    var server = https.createServer(sslOpts, app);
    let httpServer = await server.listen(port);
    if (!httpServer.listening) {
      throw new Error([
        `Could not create active HTTPS listener on port ${port}`,
        `(NOTE: TCP ports below 1024 are restricted to superusers).`,
      ].join(' '));
    }
    return httpServer;
  }

  async listen(restBundles=[]) {
    let { app, port} = this;
    if (portMap[port]) {
      throw new Error(
        `ScvServer.listen() conflict with active port:${port}`);
    }
    this.port = port;
    portMap[port] = this;
    return app.listen(port);
  }

  async close() {
    let { httpServer, port } = this;
    if (httpServer && httpServer.listening) {
      this.info(`server shutting down (port:${port})`);
      await new Promise((resolve, reject) => {
        httpServer.close(()=>resolve());
      });
      this.info(`server shutdown completed (port:${port})`);
      this.httpServer = undefined;
      portMap[port] = undefined;
    } else {
      this.info(`close() ignored (port:${port})`);
    }
  }

  async initialize() {
    let { app, port, scApi, scvApi, name, protocol, distDir } = this;
    if (this.initialized != null) {
      this.info(`initialize() port:${port} already initialized (ignored)`);
      return this;
    }
    if (portMap[port]) {
      throw new Error(`initialize() port conflict with ${name}:${port}`);
    }
    this.initialized = false;

    app.use(compression());
    app.all('*', function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", [
            "X-Requested-With",
            "Content-Type",
            "Access-Control-Allow-Headers",
            "Authorization",
        ].join(","));
        res.header("Access-Control-Allow-Methods", "GET, OPTIONS, PUT, POST");
        next();
    });
   
    app.get('/scv/auth/*', (req, res, next) => {
      try {
        super.requireAdmin(req, res);
        this.debug(`${req.path} auth:OK`);
        next();
      } catch(e) {
        this.debug(`${req.path} ${e.message}`);
      }
    });
    this._addResourceMethods();
    this.bindExpress(app);

    Object.entries({
      "/scv/index.html": "index.html",
      "/scv/img": "img",
      "/assets": "assets",
      "/favicon.png": "favicon.png",
      "/audio": "audio",
      "/css": "css",
      "/fonts": "fonts",
      "/MaterialIcons.css": "MaterialIcons.css",
      "/MaterialIcons.ttf": "MaterialIcons.ttf",
      "/scv/js": "js",
      "/scv/css": "css",
      "/scv/fonts":  "fonts",
      "/scv/sounds": "../local/sounds",
    }).forEach(kv => {
      let [ urlPath, value ] = kv;
      let filePath = path.join(distDir, value);
      app.use(urlPath, express.static(filePath));
      this.debug(`initialize() static: ${urlPath} => ${filePath}`);
    });

    app.use(favicon(path.join(distDir, "img/favicon.png")));

    app.get(["/","/scv"], function(req,res,next) {
        res.redirect("/scv/index.html");
        next();
    });

    // create RestApis
    //TODO var opts = {
        //TODO scApi,
        //TODO ephemeralAge: 60*MS_MINUTE,
    //TODO };
    await scvApi.initialize();

    let httpServer = protocol === "https"
      ? await this.listenSSL()
      : await this.listen()
    Object.defineProperty(this, "httpServer", {
      writable: true,
      value: httpServer,
    });

    this.info("initialize() => listening on port:", port);
    this.initialized = true;
    return this;
  }
}
