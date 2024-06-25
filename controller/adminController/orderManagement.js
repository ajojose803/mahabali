const User = require("../../model/userModel");
const Product = require("../../model/productModel");
const Order = require("../../model/orderModel");
const { getObjectSignedUrl } = require('../../utils/s3');
const asyncHandler = require("../../middleware/asyncHandler");




const loadOrder = asyncHandler(async(req,res)=>{
        const order = await Order.find({}).sort({ createdAt: -1 }).populate({
            path: 'items.productId',
            model:'product',
            select: 'name description'
        })
        console.log(order[0].items[0])
        res.render("admin/adminOrders", { order })
   
})
const updateStatus = asyncHandler(async(req,res) =>{
    const { orderId, status } = req.body
    console.log(orderId)
    const updateOrder = await Order.updateOne({ _id: orderId }, { status: status, updated: new Date() })
    res.redirect('/admin/orders')

})


module.exports = {
loadOrder,
updateStatus,
}