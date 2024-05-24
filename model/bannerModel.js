const mongoose = require('mongoose');
const bannerSchema = new mongoose.Schema({
    name:{
        type:String,
        require:true,
    },
    image:{
        type:String,
        require:true,
    },
    expiryDate:{
        type:String,
        require:true,
    }
})

module.exports = mongoose.model("banner", bannerSchema)