/**
 * Worker service.
 */

var debug = require('debug')('reactive-bot:worker');
var Skyscanner = require('./skyscanner');
var Fare = require('./db').Fare;

var JOB_OPTIONS = {
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
};

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

  return lowestPrice;
}

function start() {
  var scanner = new Skyscanner(JOB_OPTIONS);

  var results;
  scanner
    .on('error', function (err) {
      debug(err);
    })
    .on('data', function (data) {
      results = data;
    })
    .on('complete', function () {
      var price = getLowestPrice(results);

      debug('Lowest price: ' + price);

      // saving results
      Fare.create({
        jobId: 1,
        lowestPrice: price
      }, function (err) {
        if (err) debug(err);

        // queue new job
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
