const mongoose = require('mongoose');
const Product = require('../productModel');

const apparelSchema = new mongoose.Schema({
    sizes: [{
        size: {
            type: String,
            enum: ['S', 'M', 'L', 'XL', 'XXL'],
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
        },
    }],
    material: {
        type: String,
        required: true,
    },
});

const Apparel = Product.discriminator('Apparel', apparelSchema);

module.exports = Apparel;
