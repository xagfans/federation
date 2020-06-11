const ApiServer = require('./ApiServer.js');

const mountApi  = require('./xagapi');
const mountAudit = require('./auditapi');

server = new ApiServer(8001);
mountApi(server);
mountAudit(server);

server.listen();