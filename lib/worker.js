/**
 * Worker service.
 */

var debug = require('debug')('reactive-bot:worker');
var Skyscanner = require('./skyscanner');
var Fare = require('./db').Fare;

var JOBS = [
  {
    id: 1,
    from: 'MOSC-sky',
    to: 'HER-sky',
    outbound: '2016-10-01',
    inbound: '2016-10-09',
    country: 'RU',
    locale: 'ru-RU',
    currency: 'RUB',
    adults: 2,
    children: 1,
    infants: 1,
    cabinclass: 'Economy'
  },
  {
    id: 2,
    from: 'MOSC-sky',
    to: 'HER-sky',
    outbound: '2016-10-01',
    inbound: '2016-10-08',
    country: 'RU',
    locale: 'ru-RU',
    currency: 'RUB',
    adults: 2,
    children: 1,
    infants: 1,
    cabinclass: 'Economy'
  },
  {
    id: 3,
    from: 'MOSC-sky',
    to: 'HER-sky',
    outbound: '2016-10-02',
    inbound: '2016-10-09',
    country: 'RU',
    locale: 'ru-RU',
    currency: 'RUB',
    adults: 2,
    children: 1,
    infants: 1,
    cabinclass: 'Economy'
  },

  // with parents
  {
    id: 4,
    from: 'MOSC-sky',
    to: 'HER-sky',
    outbound: '2016-10-01',
    inbound: '2016-10-09',
    country: 'RU',
    locale: 'ru-RU',
    currency: 'RUB',
    adults: 4,
    children: 1,
    infants: 1,
    cabinclass: 'Economy'
  },
  {
    id: 5,
    from: 'MOSC-sky',
    to: 'HER-sky',
    outbound: '2016-10-01',
    inbound: '2016-10-08',
    country: 'RU',
    locale: 'ru-RU',
    currency: 'RUB',
    adults: 4,
    children: 1,
    infants: 1,
    cabinclass: 'Economy'
  },
  {
    id: 6,
    from: 'MOSC-sky',
    to: 'HER-sky',
    outbound: '2016-10-02',
    inbound: '2016-10-09',
    country: 'RU',
    locale: 'ru-RU',
    currency: 'RUB',
    adults: 4,
    children: 1,
    infants: 1,
    cabinclass: 'Economy'
  },
  {
    id: 7,
    from: 'MOSC-sky',
    to: 'HER-sky',
    outbound: '2016-10-03',
    inbound: '2016-10-11',
    country: 'RU',
    locale: 'ru-RU',
    currency: 'RUB',
    adults: 4,
    children: 1,
    infants: 1,
    cabinclass: 'Economy'
  },
  {
    id: 8,
    from: 'MOSC-sky',
    to: 'HER-sky',
    outbound: '2016-10-04',
    inbound: '2016-10-12',
    country: 'RU',
    locale: 'ru-RU',
    currency: 'RUB',
    adults: 4,
    children: 1,
    infants: 1,
    cabinclass: 'Economy'
  }
];

var JOB_FILTER = {
  stops: 0
}

function getLowestPrice(data) {
  var lowestPrice = Number.MAX_SAFE_INTEGER,
      lowestItinerary,
      i,
      j,
      len = data.Itineraries.length,
      prices,
      priceLen;

  for (i = 0; i < len; i+=1) {
    prices = data.Itineraries[i].PricingOptions;
    priceLen = prices.length;
    for (j = 0; j < priceLen; j+=1) {
      if (prices[j].Price < lowestPrice) {
        lowestPrice = prices[j].Price;
        lowestItinerary = data.Itineraries[i];
      }
    }
  }

  return [lowestPrice, lowestItinerary];
}


var jobIdx = 0;

function getJob() {
  return JOBS[jobIdx++ % JOBS.length];
}

function start() {
  var job = getJob();
  var scanner = new Skyscanner(job, JOB_FILTER);

  var results;
  scanner
    .on('error', function (err) {
      debug(err);

      if (err.fatal) {
        // queue new job
        debug('Recovering after fatal error...');
        setTimeout(start, 5000);
      }
    })
    .on('data', function (data) {
      results = data;
    })
    .on('complete', function () {
      var lowestPrice = getLowestPrice(results);
      var price = lowestPrice[0];
      var itinerary = lowestPrice[1];

      debug('Lowest price: ' + price);

      // saving results
      Fare.create({
        jobId: job.id,
        lowestPrice: price
      }, function (err) {
        if (err) debug(err);

        // queue new job
        debug('Queuing new job...');
        setTimeout(start, 5000);
      });
    })
    .start();
}

module.exports = {
  start: function (fn) {

    start();

    fn();
  }
};
