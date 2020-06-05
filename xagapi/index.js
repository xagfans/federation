const url = require('url');
const mapping = require('./mapping.js');
const xag = require('./xag.js');

module.exports = (app) => {
  app.get('/xagapi', handle);
}

function handle(req, res, matched) {
  var request = url.parse(req.url, true);
  var client = request.query['client'];

  if (request.query['type']) {
    switch (request.query['type']) {
      case 'federation':
      case 'quote':
        if (!client) {
          return handleNoClient(request, res);
        }
        dispatchUser(request.query['type'], request, res);
        break;
      default:
        handleInvalidError(request, res);
    }
  } else {
    return handleInvalidError(request, res);
  }
}

function dispatchUser(type, request, res) {
  if(request.query['destination']) {
    var dest = request.query['destination'].toLowerCase();
    switch (dest) {
      case 'xag':
        //TODO: check whether public network
        if (type === 'federation') {
          xag.handleUser(request, res);
        } else {
          xag.handleQuote(request, res);
        }
        break;
      default:
        if (mapping[dest]) {
          handleMappingUser(mapping[dest], request, res);
        } else {
          handleInvalidError(request, res);
        }
    }
  } else {
    handleInvalidError(request, res);
  }
}

function dispatchMethod(handler, type, request, res) {
  if (type === 'federation') {
    handler.handleUser(request, res);
  } else {
    handler.handleQuote(request, res);
  }
}

function responseJson(res, data) {
  res.writeHead(200, { 'Content-Type' : 'application/json; charset=UTF-8'});
  res.end(JSON.stringify(data));
}

function handleMappingUser(address, request, res) {
  var result = {
    result : 'success',
    federation_json : {
      type : 'federation_record',
      destination : request.query['destination'],
      destination_address : address,
      domain : 'xagfans.com',
      request : request.query
    }
  };
  responseJson(res, result);
}

function handleInvalidError(request, res) {
  var error = {
    result : 'error',
    error_message : 'Invalid request. 无效请求',
    request : request.query
  }
  responseJson(res, error);
}

function handleNoClient(request, res) {
  var error = {
    result : 'error',
    error_message : 'Not foxlet client. 请使用最新的瑞波桌面钱包。',
    request : request.query
  }
  responseJson(res, error);
}