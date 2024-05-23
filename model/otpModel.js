const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email:{
        type: String,
        require:true,
    },
    otp:{
        type: Number,
        require:true,
    },
    expiry:{
        type:Date,
        require:true,
    },
    createdAt:{
        type: Date,
        default: Date.now,
        expires: 60 * 2

    }
})


const otp = mongoose.model('otp', otpSchema);
module.exports = otp;