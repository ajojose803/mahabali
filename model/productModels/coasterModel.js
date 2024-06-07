const mongoose = require('mongoose');
const Product = require('../productModel');

const coasterSchema = new mongoose.Schema({
    material: {
        type: String,
        required: true,
    },
});

const Coaster = Product.discriminator('Coaster', coasterSchema);

module.exports = Coaster;
