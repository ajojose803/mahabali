const mongoose = require('mongoose');
const Product = require('../productModel');

const posterSchema = new mongoose.Schema({
    dimensions: {
        type: String,
        required: false,
    },
});

const Poster = Product.discriminator('Poster', posterSchema);

module.exports = Poster;
