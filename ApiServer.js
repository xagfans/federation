const http  = require('http');
const url   = require('url');
const { pathToRegexp, match, parse, compile } = require("path-to-regexp");

class ApiServer {
  constructor(port){
    this.port = port;
    this.server;
    this.router = [];
  }
  
  get(path, handler) {
    this.router.push({
      path : path,
      method : 'GET',
      handler : handler
    });
  }
  
  listen() {
    this.server = http.createServer((req, res) => {
      this.handler(req, res);
    }).listen(this.port);
    console.log('API Server running at localhost:', this.port);
  }
  
  handler(req, res) {
    var pathname = url.parse(req.url, true).pathname;
    
    for(var i=0; i<this.router.length; i++){
      var rule = this.router[i];
      var matched = match(rule.path, { decode: decodeURIComponent })(pathname);
      if(matched && (req.method === rule.method || rule.method === '*')) {
        console.log('matched', pathname)
        return rule.handler(req, res, matched);
      }
    }

    return this.notSupported(req, res);
  }
  
  notSupported(req, res) {
    res.writeHead(200, { 'Content-Type' : 'application/json; charset=UTF-8'});
    console.warn(req.url);
    res.end(JSON.stringify({
      error: 'Method not supported.',
      request: url.parse(req.url, true)
    }));
  }
}

module.exports = ApiServer;
