const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    normalized_name: {
        type: String,
        required: true,
        unique: true // This will automatically create the index
    },
    description: {
        type: String,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    isListed: {
        type: Boolean,
        default: true
    }
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
