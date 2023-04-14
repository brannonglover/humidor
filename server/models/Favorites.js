const mongoose = require('mongoose');

const FavoritesSchema = new mongoose.Schema({
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

module.exports = mongoose.model('Favorite', FavoritesSchema);