(function (exports) {
  const { logger } = require("log-instance");

  class ResourceMethod {
    constructor(
      method = "get",
      name,
      handler,
      mime = "application/json",
      options = {}
    ) {
      logger.logInstance(this);
      if (typeof name !== 'string') {
        throw new Error("ResourceMethod() expected: name");
      }
      if (typeof handler !== 'function') {
        throw new Error("ResourceMethod() expected: handler");
      }
      this.method = method.toUpperCase();
      this.path = name;
      this.name = `${method.toUpperCase()} ${name}`;
      this.handler = handler;
      this.mime = mime;
    }

    async processRequest(req, res, next) {
      const msg = "r12d.processRequest() ";
      let { method, mime, handler } = this;
      let statusOk = 200;
      try {
        res.type(mime);
        let { statusCode } = res;
        let value = await handler(req, res);
        if (!res.headersSent) {
          res.status(statusOk);
          res.send(value);
        }
      } catch(e) {
        this.warn(msg, `HTTP${res.statusCode}:`, req.params, '=>', e);
        if (!res.headersSent) {
          res.type("application/json");
          let { statusCode = statusOk } = res;
          statusCode === statusOk && res.status(500);
          res.send({error:e.message});
        }
      }
    }

    use(app) {
      let { path, method } = this;
      let that = this;
      if (method === "GET") {
        app.get(`/${path}`, async (req,res,next)=> {
          await that.processRequest(req,res);
        });
      } else if (method === "PUT") {
        app.put(`/${path}`, async (req,res,next)=> {
          await that.processRequest(req,res);
        });
      } else if (method === "POST") {
        app.post(`/${path}`, async (req,res,next)=> {
          await that.processRequest(req,res);
        });
      } else if (method === "DELETE") {
        app.delete(`/${path}`, async (req,res,next)=> {
          await that.processRequest(req,res);
        });
      } else if (method === "HEAD") {
        app.get(`/${path}`, async (req,res,next)=> {
          await that.processRequest(req,res);
        });
      } else {
        throw new Error([
          `ResourceMethod.use() unsupported HTTP method:${method}`,
          `[${path}]`,
        ].join(' '));
      }
    }

  }

  module.exports = exports.ResourceMethod = ResourceMethod;
})(typeof exports === "object" ? exports : (exports = {}));
