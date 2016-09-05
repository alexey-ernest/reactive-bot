/**
 * Skyscanner API client.
 */

// env
if (!process.env.API_KEY) {
  console.log('API_KEY environment variable required.');
  process.exit(1);
}

var events = require('events');
var util = require('util');
var request = require('request');
var debug = require('debug')('reactive-bot:skyscanner');

var API_URI = 'http://partners.api.skyscanner.net/apiservices/pricing/v1.0';
var POLLING_INTERVAL = 1000; // each second

/**
 * Validates options.
 *
 * @param      {object}  options  The options.
 */
function validateOptions(options) {
  var errors = {};

  if (!options.country) {
    errors.country = 'country option required';
  }
  if (!options.country) {
    errors.country = 'country option required';
  }
  if (!options.currency) {
    errors.currency = 'currency option required';
  }
  if (!options.locale) {
    errors.locale = 'locale option required';
  }
  if (!options.from) {
    errors.from = 'from option required';
  }
  if (!options.to) {
    errors.to = 'to option required';
  }
  if (!options.outbound) {
    errors.outbound = 'outbound option required';
  }

  return errors;
}

/**
 * Creates search flights sessions.
 *
 * @param      {object}    options  The options
 * @param      {Function}  fn       Callback.
 */
function createSession(options, fn) {
  debug('Creating search flights session with params: ' + JSON.stringify(options));

  var params = {
    apiKey: process.env.API_KEY,
    country: options.country,
    currency: options.currency,
    locale: options.locale,
    originplace: options.from,
    destinationplace: options.to,
    outbounddate: options.outbound,
    inbounddate: options.inbound,
    cabinclass: options.cabinclass || 'Economy',
    adults: options.adults || 1,
    children: options.children || 0,
    infants: options.infants || 0,
    grouppricing: true,
    locationSchema: 'iata'
  }
  request.post(API_URI, {form: params}, function (err, res, body) {
    if (err) {
      err.fatal = true;
      return fn(err);
    }

    if (res.statusCode !== 201) {
      err = new Error('Invalid status code received: ' + res.statusCode +
        '. Headers: ' + JSON.stringify(res.headers) + '. Body: ' + body);
      err.fatal = true;
      return fn(err);
    }

    var sessionUri = res.headers['location'] + '?apiKey=' + params.apiKey;
    debug('Flight search session created: ' + sessionUri);

    fn(null, sessionUri);
  });
}

/**
 * Polls session for data.
 *
 * @param      {string}  sessionUri  Session uri.
 */
function pollSession(sessionUri) {
  debug('Polling flight search session for data: ' + sessionUri);

  var scanner = this;

  // request data
  request(sessionUri, function (err, res, body) {
    if (err) {

      // error loading data
      scanner.emit('error', err);
    } else if (res.statusCode === 304) {

      // not modified
      debug('Session data has not been modified.');
    } else if (res.statusCode === 410) {

      // session expired
      debug('Session expired ' + sessionUri);

      err = new Error('Session expired ' + sessionUri);
      err.fatal = true;
      return scanner.emit('error', err);
    } else if (res.statusCode !== 200) {

      // invalid status code received
      err = new Error('Invalid status code received: ' + res.statusCode +
        '. Headers: ' + JSON.stringify(res.headers) + '. Body: ' + body);
      scanner.emit('error', err);
    } else {

      // parsing JSON
      try {
        body = JSON.parse(body);
        scanner.emit('data', body);
      } catch (e) {
        err = new Error('Could not parse data "' + body + '": ' + e.message);
        scanner.emit('error', err);
      }

      if (body.Status === 'UpdatesComplete') {
        // session completed
        debug('Session ' + sessionUri + ' successfully completed');

        scanner.timoutId = null;
        scanner.emit(body);
        return scanner.emit('complete');
      }
    }

    // schedule next call
    scanner.timoutId = setTimeout(function () {
      pollSession.call(scanner, sessionUri);
    }, POLLING_INTERVAL);
  });
}


/**
 * Skyscanner API client.
 *
 * @class      Skyscanner (name)
 * @param      {object}      options  Flight options to scan.
 */
function Skyscanner(options) {
  if (!(this instanceof Skyscanner)) {
    // prevent global pollution
    return new Skyscanner(options);
  }

  events.EventEmitter.call(this);

  this.options = options || {};
  this.timoutId;
}

util.inherits(Skyscanner, events.EventEmitter);


/**
 * Starts fare polling.
 */
Skyscanner.prototype.start = function () {
  var optionErrors = validateOptions(this.options);
  if (Object.keys(optionErrors).length > 0) {
    throw new Error('Invalid options provided: ' + JSON.stringify(optionErrors));
  }

  var scanner = this;

  // creating session and start polling
  createSession(this.options, function (err, sessionUri) {
    if (err) return scanner.emit('error', err);

    pollSession.call(scanner, sessionUri);
  });
};

/**
 * Stops fare polling.
 */
Skyscanner.prototype.stop = function () {
  clearInterval(this.timeoutId);
  this.timeoutId = null;
  this.emit('stop');
}

module.exports = Skyscanner;
