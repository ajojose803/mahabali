const mongoose = require('mongoose');

const categorySchema = new mongoose.schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: Text,

    },
    isListed: {
        type: Boolean,
        default: true,
        require: true,
    },


}, { timestamps: true })

const category = mongoose.model("category",categorySchema)
module.exports = category;