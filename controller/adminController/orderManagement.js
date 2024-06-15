const User = require("../../model/userModel");
const Product = require("../../model/productModel");
const Order = require("../../model/orderModel");
const { getObjectSignedUrl } = require('../../utils/s3');
const asyncHandler = require("../../middleware/asyncHandler");




const LoadOrder = asyncHandler(async(req,res)=>{
        const order = await orderCollection.find({}).sort({ createdAt: -1 }).populate({
            path: 'items.productId',
            select: 'name description'
        })
        res.render("admin/orders", { order: order })
   
})