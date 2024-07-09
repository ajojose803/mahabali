const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username:{
        type: String,
        required: true,
    },
    email:{
        type: String,
        required: true,
        unique:true,
    },
    password:{
        type: String,
        required: true,
    },
    isAdmin:{
        type: Boolean,
        default: false,

    },
    phone:{
        type: Number,
        required:true,
    },
    isBlocked:{
        type: Boolean,
        default: false,
        required:true,

    },
    wallet:{
        type:Number,
        default:0
    }, 
    usedCoupons:[{
        type:String,
    }] 

}, {timestamps:true});

const user = mongoose.model('user', userSchema);
module.exports = user;