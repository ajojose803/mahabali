const Product = require("../../model/productModel");
const Cart = require("../../model/cartModel");
const asyncHandler = require("../../middleware/asyncHandler");
const User = require("../../model/userModel");
const { getObjectSignedUrl } = require('../../utils/s3');
const Address = require("../../model/addressModel");
const Order = require("../../model/orderModel");
const Coupon = require("../../model/couponModel");
const Wallet = require("../../model/walletModel")
const Razorpay = require('razorpay');
require('dotenv').config();

var instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const loadCheckout = asyncHandler(async (req, res) => {
  const userId = req.session.user._id;
  req.session.checkoutSave = true;
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Find the user's cart and populate product details
    let cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      model: 'product'
    });

    if (!cart || cart.items.length === 0) {
      cart = { items: [] }; // Ensure cart is an empty array if no items are found
      res.redirect("/products");

    }


    // Calculate original total from cart items
    const originalTotal = cart.items.reduce((acc, item) => {
      return acc + (item.productId.price * item.quantity);
    }, 0);

    // Store original total in session
    req.session.cart = {
      ...req.session.cart,
      originalTotal,
    };

    // Find all addresses for the user
    const userAddresses = await Address.findOne({ userId });

    if (!userAddresses || userAddresses.address.length === 0) {
      req.flash('error', 'No addresses found. Please add a new address.');
      return res.redirect('/profile/address/');
    }

    const addresses = userAddresses.address;

    // Find the default address
    const defaultAddress = addresses.find(addr => addr.status === true);

    // Check if defaultAddress is found
    if (!defaultAddress) {
      req.flash('error', 'No default address found. Please set a default address.');
      return res.redirect('/profile/address/');
    }
    req.session.checkoutSave = false;


    const coupons = await Coupon.find({ status: true });

    // Render the checkout page with user, addresses, cart, and defaultAddress
    res.render('user/checkout', { user, addresses, cart: cart.items, defaultAddress, coupons, couponApplied: req.session.cart.couponApplied });
  } catch (error) {
    console.error('Error loading checkout page:', error);
    res.render('user/servererror');
  }
});


const order = asyncHandler(async (req, res) => {
  try {
    const { address, pay } = req.body;
    const userId = req.session.user._id;
    const cart = await Cart.findOne({ userId }).populate('items.productId');

    // Check if cart and user address exist
    if (!cart || !address) {
      throw new Error("Cart or user address not found");
    }

    const userAddress = await Address.findOne({ userId });
    const selectedAddress = userAddress.address.find(addr => addr._id.toString() === address.toString());

    // Calculate subtotal and apply delivery fee if necessary
    let subtotal = cart.items.reduce((acc, item) => acc + item.productId.price * item.quantity, 0);
    let deliveryFee = 0;
    if (subtotal < 1000) {
      deliveryFee = 99;
    }

    // Apply coupon if one is applied
    if (req.session.cart && req.session.cart.couponApplied) {
      subtotal -= req.session.cart.discountedPrice;
    }

    // Add delivery fee to total amount
    const total = subtotal + deliveryFee;

    // Create order instance
    const orderData = {
      userId,
      items: cart.items.map(item => ({
        productId: item.productId._id,
        quantity: item.quantity,
        price: item.productId.price,
      })),
      subtotal,
      deliveryFee,
      amount: total,
      payment: pay,
      address: selectedAddress,
      createdAt: new Date(),
      updated: new Date(),
      status: pay === 'Razorpay' ? 'Payment pending' : 'Pending',
    };

    const order = new Order(orderData);
    const savedOrder = await order.save();
    console.log("Order.status",orderData.status)

    req.session.orderId = savedOrder.orderId;

    // Clear user's cart after placing the order
    cart.items = [];
    await cart.save();

    // Redirect to payment gateway or order status page
    if (pay === 'Razorpay') {
      // Implement Razorpay integration similar to your existing logic
      // Redirect or render Razorpay checkout page
    } else {
      res.redirect(`/profile/orders`);
    }
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).render('user/servererror');
  }
});


const getOrderStatus = asyncHandler(async (req, res) => {
  const orderId = req.session.orderId || req.params.id;
  console.log("Order Id in getOrderStatus: ", orderId)
  if (!orderId) {
    return res.status(400).json({ success: false, error: 'Order ID not found' });
  }

  const userId = req.session.user._id;
  const user = await User.findById(userId);

  try {
    const order = await Order.findOne({ orderId: orderId }).populate({
      path: 'items.productId',
      model: 'product'
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const orderItems = await Promise.all(order.items.map(async (item) => {
      const product = item.productId;
      if (!product) {
        //console.log('Product not found for item:', item);
        return null;
      }

      let imageUrls = [];
      if (Array.isArray(product.image) && product.image.length > 0) {
        imageUrls = await Promise.all(product.image.map(getObjectSignedUrl));
      } else {
        //console.log('Product image is not defined or empty for product:', product);
      }

      return {
        ...item._doc,
        product: product._doc,
        imageUrls,
        total: product.price * item.quantity
      };
    }));

    const validOrderItems = orderItems.filter(item => item !== null);
    console.log(order.amount);

    res.render('user/orderSuccess', {
      user,
      orderId: order._id,
      orderStatus: order.status,
      paymentMethod: order.payment,
      orderItems: validOrderItems,
      totalAmount: order.amount,
      address: order.address,
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).render('error');
  }
});


const applyCoupon = async (req, res) => {
  try {
    console.log("Reaching applyCoupon")
    const { code, subtotal } = req.body;
    const userId = req.session.user._id;

    // Step 1: Find the coupon
    const coupon = await Coupon.findOne({ code });

    if (!coupon) {
      return res.json({ success: false, message: "Coupon not found" });
    }

    // Step 2: Validate coupon status
    if (!coupon.status) {
      return res.json({ success: false, message: "Coupon is not active" });
    }

    // Step 3: Check if user has already used the coupon
    const user = await User.findById(userId);
    if (user.usedCoupons.includes(code)) {
      return res.json({ success: false, message: "Coupon has already been redeemed" });
    }

    // Step 4: Check coupon expiry and minimum purchase amount
    if (coupon.validTo < new Date() || coupon.minPurchaseAmount > subtotal) {
      return res.json({ success: false, message: "Coupon is invalid for this purchase" });
    }

    // Step 5: Calculate discounted price
    let discountedPrice;
    if (coupon.discountType === "percentageDiscount") {
      discountedPrice = (subtotal * coupon.discountAmount) / 100;
      if (discountedPrice > coupon.maxRedeem) {
        discountedPrice = coupon.maxRedeem;
      }
    } else if (coupon.discountType === "flatDiscount") {
      discountedPrice = coupon.discountAmount;
    }

    // Step 6: Apply coupon to session cart
    const newTotal = subtotal - discountedPrice;
    req.session.cart = {
      ...req.session.cart,
      total: newTotal,
      discountedPrice,
      couponApplied: true,
    };

    // Step 7: Mark coupon as used for the user
    if (coupon.oncePerUser) {
      await User.findByIdAndUpdate(userId, { $addToSet: { usedCoupons: code } });
    }

    console.log(`Discount applied. New subtotal: ${newTotal}, New total: ${newTotal}`);
    res.json({ success: true, newSubtotal: newTotal, newTotal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error. Please try again later." });
  }
};

const revokeCoupon = async (req, res) => {
  try {
    console.log("Reaching Revoke Coupon")
    const { couponCode } = req.body;
    const subtotal = req.session.cart.originalTotal;
    console.log("Subtotal: ", subtotal)
    const userId = req.session.userId;
    const coupon = await Coupon.findOne({ code: couponCode });
    console.log("Cart Body: ", req.session.cart)

    if (!coupon) {
      return res.json({ success: false, message: "Coupon not found" });
    }


    // Assuming your logic to check validity here:
    if (coupon.validTo < new Date() || coupon.minPurchaseAmount > subtotal) {
      return res.json({ success: false, message: "Coupon is invalid for revoking" });
    }

    // Update user's usedCoupons by removing the couponCode
    await User.findByIdAndUpdate(userId, { $pull: { usedCoupons: couponCode } });

    // Reset session cart properties related to coupon
    req.session.cart = {
      ...req.session.cart,
      total: subtotal, // Assuming subtotal is correct here
      discountedPrice: 0,
      couponApplied: false,
    };

    // Send success response with updated subtotal and total
    res.json({
      success: true,
      originalSubtotal: subtotal, // Return the updated subtotal
      originalTotal: subtotal, // Assuming total is the same as subtotal after revoking
    });

  } catch (error) {
    console.error('Error revoking coupon:', error);
    res.status(500).json({ success: false, message: "Server error. Please try again later." });
  }
};





// const verifyPayment = asyncHandler(async (req, res) => {
//   const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
//   const userId = req.session.user._id;
//   const orderId = req.session.razorpayOrderId;

//   console.log("Verifying payment:", { razorpay_payment_id, razorpay_order_id, razorpay_signature });
//   console.log("Generated signature:", generatedSignature);
//   console.log("Received signature:", razorpay_signature);

//   const crypto = require("crypto");
//   const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
//   hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
//   const generatedSignature = hmac.digest('hex');

//   if (generatedSignature === razorpay_signature) {
//     const order = await Order.findOne({ razorpayOrderId: orderId });
//     if (!order) {
//       return res.status(404).json({ success: false, message: 'Order not found' });
//     }

//     order.paymentStatus = 'paid';
//     order.paymentId = razorpay_payment_id;
//     order.status = 'pending';
//     await order.save();

//     req.session.orderId = order._id;
//     res.redirect(`/checkout/order-status/${order._id}`);
//   } else {
//     res.status(400).json({ success: false, message: 'Payment verification failed' });
//   }
// });


// const upi = async (req, res) => {
//   console.log("Reaching Upi")
//   var options = {
//     amount: req.body.amount,
//     currency: "INR",
//     receipt: "order_rcpt"
//   };
//   instance.orders.create(options, function (err, order) {
//     res.send({ orderId: order.id })
//   })
// }

const createRazorpayOrder = async (req, res) => {
  const { amount } = req.body;
  console.log("Amount", amount)
  if (!amount) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST_ERROR',
        description: 'amount: is required.',
        reason: 'input_validation_failed'
      }
    });
  }

  try {
    const options = {
      amount: amount, // Amount in paise
      currency: 'INR',
      receipt: 'order_rcptid_' + Date.now(),
      payment_capture: 1, // Auto-capture payment after order creation
    };

    const order = await instance.orders.create(options);
    console.log('Razorpay Order:', order);

    // Store Razorpay order ID in your database or session
    // Example: Assuming you have an Order model where you save order details
    const newOrder = new Order({
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      payment_capture: order.payment_capture,
      status: 'created', // Set initial status as created or pending
      // Add other relevant fields as per your schema
    });

    await newOrder.save();

    // Return the Razorpay order details to the client
    res.status(200).json({
      id: order.id,
      currency: order.currency,
      amount: order.amount,
    });

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Failed to create Razorpay order' });
  }
};

const payWithWallet = asyncHandler(async (req, res) => {
  const userId = req.session.user._id;
  const { amount } = req.body;

  try {
      // Fetch the user's wallet
      const wallet = await Wallet.findOne({ userId });

      if (!wallet) {
          return res.status(400).json({ success: false, message: "Wallet not found" });
      }

      // Check if the wallet has enough balance
      if (wallet.balance < amount) {
          return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
      }

      // Deduct the amount from the wallet balance
      wallet.balance -= amount;
      wallet.history.push({
          transaction: "debit",
          amount: amount,
          date: new Date(),
          reason: "Purchase",
      });
      await wallet.save();

      // Place the order
      const cart = await Cart.findOne({ userId }).populate('items.productId');

      if (!cart) {
          return res.status(400).json({ success: false, message: "Cart not found" });
      }

      const userAddress = await Address.findOne({ userId });
      const selectedAddress = userAddress.address.find(addr => addr._id.toString() === req.body.address.toString());

      const subtotal = cart.items.reduce((acc, item) => acc + item.productId.price * item.quantity, 0);
      const deliveryFee = subtotal < 1000 ? 99 : 0;
      const total = subtotal + deliveryFee;

      const orderData = {
          userId,
          items: cart.items.map(item => ({
              productId: item.productId._id,
              quantity: item.quantity,
              price: item.productId.price,
          })),
          subtotal,
          deliveryFee,
          amount: total,
          payment: "wallet",
          address: selectedAddress,
          createdAt: new Date(),
          updated: new Date(),
          status: "Pending",
      };

      const order = new Order(orderData);
      const savedOrder = await order.save();

      // Clear the user's cart after placing the order
      cart.items = [];
      await cart.save();

      return res.status(200).json({ success: true, message: "Order placed successfully", order: savedOrder });
  } catch (error) {
      console.error("Error processing wallet payment:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
  }
});



module.exports = {
  loadCheckout,
  order,
  getOrderStatus,
  applyCoupon,
  revokeCoupon,
  createRazorpayOrder,
  // upi,
  // verifyPayment,
  payWithWallet,
}