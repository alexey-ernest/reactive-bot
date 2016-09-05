/**
 * Avia fare for a parameter set.
 */

// env
if (!process.env.MONGODB_CONNECTION) {
  console.log('MONGODB_CONNECTION environment variable required.');
  process.exit(1);
}

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

mongoose.connect(process.env.MONGODB_CONNECTION);

var fareSchema = new Schema({
  jobId: String,
  lowestPrice: Number,
  timestamp: { type: Date, default: Date.now },
  itineraries: [new Schema({
    outbound: new Schema({
      carriers: [String]
    }),
    inbound: new Schema({
      carriers: [String]
    }),
    prices: [new Schema({
      price: Number,
      agent: String
    })]
  })]
});

fareSchema.index({ jobId: 1, lowestPrice: -1 });

module.exports = mongoose.model('Fare', fareSchema);
