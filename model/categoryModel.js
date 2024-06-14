const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name:
    {
        type: String,
        required: true
    },
    normalized_name:
    {
        type: String,
        required: true,
        unique: true

    },
    description:
    {
        type: String,
        required: true
    },

    discount:
    {
        type: Number,
        default: 0
    }
});

categorySchema.index({ normalized_name: 1 }, { unique: true });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
