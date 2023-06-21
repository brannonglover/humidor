const mongoose = require('mongoose');

const HumidorSchema = new mongoose.Schema({
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
    type: String
  }
});

module.exports = mongoose.model('Humidor', HumidorSchema);