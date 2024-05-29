const mongoose = require('mongoose')
const productSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },  
    description:{
        type:String,
    },
    price:{
        type:Number,
        required:true,
        default:0,
    },
    stock: [{
        size: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
      }],
    image:{
        type:[String],
        required:true

    },
    category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"categories",
        required:true

    },
    discount:{
        type:Number,
        required:true,
        default:0,
    },
    color:{
        type:String,
        required:false,
    }
    
})

module.exports = mongoose.model('product', productSchema)