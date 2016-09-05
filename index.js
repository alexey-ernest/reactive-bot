/**
 * Reactive bot app.
 */

var http = require('./lib/http');
var worker = require('./lib/worker');

module.exports = {
  http: http,
  worker: worker
};
