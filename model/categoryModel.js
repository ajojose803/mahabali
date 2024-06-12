const mongoose = require('mongoose');
const { lowercase } = require('validator');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        lowercase: true,
        unique: true
    },
    description: {
        type: String,
    },
    isListed: {
        type: Boolean,
        default: true,
        required: true,
    },
    discount: {
        type: Number,
        default: 0,
        required: false,
    }
}, { timestamps: true });

// Middleware to ensure the name is in lowercase before saving
categorySchema.pre('save', function(next) {
    this.name = this.name.toLowerCase();
    next();
});

// Create a unique index with case-insensitive collation
categorySchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

const Category = mongoose.model("Category", categorySchema);
module.exports = Category;
