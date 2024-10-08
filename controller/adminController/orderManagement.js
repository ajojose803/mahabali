const User = require("../../model/userModel");
const Product = require("../../model/productModel");
const Order = require("../../model/orderModel");
const { getObjectSignedUrl } = require('../../utils/s3');
const asyncHandler = require("../../middleware/asyncHandler");
const Wallet = require("../../model/walletModel");


const ITEMS_PER_PAGE = 10; // Adjust as necessary

const loadOrder = asyncHandler(async (req, res) => {
    const page = +req.query.page || 1;
    const totalOrders = await Order.countDocuments();
    const totalPages = Math.ceil(totalOrders / ITEMS_PER_PAGE);

    const orders = await Order.find({})
        .sort({ createdAt: -1 })
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
        .populate({
            path: 'items.productId',
            model: 'product',
            select: 'name description'
        });

    res.render("admin/adminOrders", {
        orders,
        currentPage: page,
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
        prevPage: page - 1,
        nextPage: page + 1
    });
});

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

const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId).populate('items.productId').populate('userId');

        if (!order) {
            return res.status(404).send('Order not found');
        }
        const orderItems = await Promise.all(order.items.map(async (item) => {
            const product = item.productId;
            if (!product) {
              return null;
            }
      
            let imageUrls = [];
            if (Array.isArray(product.image) && product.image.length > 0) {
              imageUrls = await Promise.all(product.image.map(getObjectSignedUrl));
            }
      
            return {
              ...item._doc,
              product: product._doc,
              imageUrls,
              total: product.price * item.quantity
            };
          }));

        res.render('admin/orderDetails', { order, orderItems, orderStatus:order.status, address:order.address }); // Adjust the path to your order details view
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};

module.exports = {
    loadOrder,
    updateStatus,
    loadOrderReturn,
    returnApprove,
    returnReject,
    getOrderDetails,
}