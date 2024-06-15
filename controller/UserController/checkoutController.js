const Product = require("../../model/productModel");
const Cart = require("../../model/cartModel");
const asyncHandler = require("../../middleware/asyncHandler");
const User = require("../../model/userModel");
const { getObjectSignedUrl } = require('../../utils/s3');
const Address = require("../../model/addressModel");
const Order = require("../../model/orderModel");


const loadCheckout = asyncHandler(async (req, res) => {
  const userId = req.session.user._id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Find the user's cart and populate product details
    let cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      model: 'Product'
    });

    if (!cart || cart.items.length === 0) {
      cart = { items: [] }; // Ensure cart is an empty array if no items are found
    }

    // Find all addresses for the user
    const userAddresses = await Address.findOne({ userId });

    if (!userAddresses || userAddresses.address.length === 0) {
      req.flash('error', 'No addresses found. Please add a new address.');
      return res.redirect('/profile/addAddress');
    }

    const addresses = userAddresses.address;

    // Find the default address
    const defaultAddress = addresses.find(addr => addr.status === true);

    // Log to verify addresses and defaultAddress
    // console.log('Addresses:', addresses);
    // console.log('Default address:', defaultAddress);

    // Check if defaultAddress is found
    if (!defaultAddress) {
      req.flash('error', 'No default address found. Please set a default address.');
      return res.redirect('/profile/addAddress');
    }

    // Render the checkout page with user, addresses, cart, and defaultAddress
    res.render('user/checkout', { user, addresses, cart: cart.items, defaultAddress });
  } catch (error) {
    console.error('Error loading checkout page:', error);
    res.render('user/servererror');
  }
});

const order = asyncHandler(async (req, res) => {
  const { address, pay } = req.body;
  const amount = parseFloat(req.body.amount.replace(/[^\d.-]/g, ''));
  //console.log(amount)
  const userId = req.session.userId;

  // Retrieve user's cart and selected address
  const cart = await Cart.findOne({ userId }).populate({
    path: 'items.productId',
    model: 'Product'
  });
  const userAddress = await Address.findOne({ userId });

  if (!cart || !userAddress) {
    throw new Error('Cart or user address not found');
  }

  // Check if the address is provided
  if (!address) {
    throw new Error('Address is required');
  }

  const selectedAddress = userAddress.address.find(addr => addr._id.toString() === address.toString());
  // Prepare items for the order
  const items = cart.items.map(item => ({
    productId: item.productId,
    quantity: item.quantity,
    size: item.size,
    price: item.productId.price, // Ensure that the price is set for each item
  }));


  // Check if any item has a missing or invalid price
  const invalidItems = items.filter(item => !item.price || isNaN(item.price));
  if (invalidItems.length > 0) {
    throw new Error('Invalid price for one or more items');
  }

  // Deduct purchased quantities from product stock
  for (const item of items) {
    const product = await Product.findOne({ _id: item.productId });
    product.stock -= item.quantity;
    await product.save();
  }


  // Create order instance based on payment status
  const orderData = {
    userId,
    items,
    amount,
    payment: pay,
    address: selectedAddress,
    createdAt: new Date(),
    updated: new Date(),
  };

  if (pay === "paymentPending") {
    orderData.status = "paymentPending";
  }

  const order = new Order(orderData);

  // Clear user's cart after placing the order
  cart.items = [];
  cart.total = 0;
  await cart.save();

  // Save the order to database
  const savedOrder = await order.save();
  // Redirect to order completion page
  req.session.orderId = savedOrder.orderId;
  res.redirect('/checkout/order-status');
});

const getOrderStatus = asyncHandler(async (req, res) => {
  const orderId = req.session.orderId;
  const userId = req.session.user._id;
  const user = await User.findById(userId);

  if (!orderId) {
    return res.status(400).json({ success: false, error: 'Order ID not found' });
  }

  try {
    const order = await Order.findOne({ orderId }).populate({
      path: 'items.productId',
      model: 'Product'
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const orderItems = await Promise.all(order.items.map(async (item) => {
      const product = item.productId;
      if (!product) {
        console.log('Product not found for item:', item);
        return null;
      }

      // Check if product.image is an array and has at least one element
      let imageUrls = [];
      if (Array.isArray(product.image) && product.image.length > 0) {
        imageUrls = await Promise.all(product.image.map(getObjectSignedUrl));
      } else {
        console.log('Product image is not defined or empty for product:', product);
      }

      return {
        ...item._doc,
        product: product._doc,
        imageUrls,
        total: product.price * item.quantity
      };
    }));

    const validOrderItems = orderItems.filter(item => item !== null);
    console.log(order)    
    res.render('user/orderSuccess', {
      user,
      orderId: order.orderId,
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



module.exports = {
  loadCheckout,
  order,
  getOrderStatus,
}