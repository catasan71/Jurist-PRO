const serverModule = require('../server.js');
const app = serverModule.default || serverModule;

module.exports = app;
