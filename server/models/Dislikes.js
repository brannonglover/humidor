const mongoose = require('mongoose');

const DislikesSchema = new mongoose.Schema({
  id: {
    type: Number
  },
  binder: {
    type: String
  },
  brand: {
    type: String
  },
  description: {
    type: String
  },
  filler: {
    type: String
  },
  image: {
    type: String
  },
  name: {
    type: String
  },
  wrapper: {
    type: String
  },
  size: {
    type: Object
  }
});

module.exports = mongoose.model('Dislike', DislikesSchema);