const User = require("../../model/userModel");
const Product = require("../../model/productModel");
const Order = require("../../model/orderModel");
const { getObjectSignedUrl } = require('../../utils/s3');
const asyncHandler = require("../../middleware/asyncHandler");
const Wallet = require("../../model/walletModel");




const loadOrder = asyncHandler(async (req, res) => {
    const order = await Order.find({}).sort({ createdAt: -1 }).populate({
        path: 'items.productId',
        model: 'product',
        select: 'name description'
    })
    console.log(order[0].items[0])
    res.render("admin/adminOrders", { order })

})


const updateStatus = asyncHandler(async (req, res) => {
    const { orderId, status } = req.body
    console.log(orderId)
    const updateOrder = await Order.updateOne({ _id: orderId }, { status: status, updated: new Date() })
    res.redirect('/admin/orders')

})

const loadOrderReturn = async (req, res) => {
    try {
        const order = await Order.find({ 'return': { $exists: true, $ne: [] } }).sort({ createdAt: -1 }).populate({
            path: 'items.productId',
            select: 'name'
        })
        res.render("admin/return", { order: order })
    } catch (error) {
        console.log(error);
        res.render("user/servererror");
    }
}

const returnApprove = async (req, res) => {
    try {
        const orderId = req.params.id;
        const update = await Order.updateOne(
            { _id: orderId },
            {
                $set: {
                    status: "returned",
                    updated: new Date(),
                    "return.$[].status": "Accepted"
                }
            }
        );
        const order = await Order.findOne({ _id: orderId })
        const userId = order.userId;
        const user = await User.findOne({ _id: userId })
        user.wallet += order.amount
        await user.save()

        const wallet = await Wallet.findOne({ userId: userId })
        if (!wallet) {
            const newWallet = new Wallet({
                userId: userId,
                history: [
                    {
                        transaction: "Credited",
                        amount: order.amount,
                        date: new Date(),
                        reason: "Order Returned"
                    }
                ]
            })
            await newWallet.save();
        } else {
            wallet.history.push({
                transaction: "Credited",
                amount: order.amount,
                date: new Date(),
                reason: "Order Returned"
            })
            await wallet.save();
        }

        const items = order.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            size: item.size,

        }))
        for (const item of items) {
            const product = await Product.findOne({ _id: item.productId })
            product.stock += item.quantity
            await product.save()
        }

        res.redirect('/admin/orderReturn');
    } catch (error) {
        console.log(error);
        res.render("user/servererror");
    }
}

const returnReject = async (req, res) => {
    try {
        const orderId = req.params.id;
        const update = await Order.updateOne(
            { _id: orderId },
            {
                $set: {
                    "return.$[].status": "Rejected",
                }
            }
        );
        res.redirect('/admin/orderReturn');
    } catch (error) {
        console.log(error);
        res.render("user/servererror");
    }
}

module.exports = {
    loadOrder,
    updateStatus,
    loadOrderReturn,
    returnApprove,
    returnReject,
}