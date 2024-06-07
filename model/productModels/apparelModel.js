const mongoose = require('mongoose');
const Product = require('../productModel');

const apparelSchema = new mongoose.Schema({
  sizes: {
    type: Map,
    of: Number,
    required: true,
  },
  material: {
    type: String,
    required: true,
  },
});

const Apparel = Product.discriminator('Apparels', apparelSchema);

module.exports = Apparel;
