const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    about: {
        type: String,
    },
    price: {
        type: Number,
        required: true,
        default: 0,
    },
    stock: {
        type: Number,
        required: false,
    },
    image: {
        type: [String],
        required: true,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
    },
    discount: {
        type: Number,
        required: true,
        default: 0,
    },
    color: {
        type: String,
        required: false,
    },
    status: {
        type: Boolean,
        default: true
    },
    offerPrice: { 
        type: Number,
         default: 0,
    },
    viewCount:{
        type: Number,
        default: 1,
    }
}, {
    discriminatorKey: 'productType',
    collection: 'products',
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
