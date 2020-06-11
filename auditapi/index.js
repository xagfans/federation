const info = require('./info.js');

module.exports = (app) => {
  app.get('/auditapi', handle);
}

function handle(req, res, matched) {
  return responseJson(res, info.get());
}

function responseJson(res, data) {
  res.writeHead(200, { 'Content-Type' : 'application/json; charset=UTF-8'});
  res.end(JSON.stringify(data));
}