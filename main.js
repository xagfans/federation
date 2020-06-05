const ApiServer = require('./ApiServer.js');

const mountApi  = require('./xagapi');

server = new ApiServer(8001);
mountApi(server);

server.listen();