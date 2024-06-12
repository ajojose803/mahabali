const Product = require("../../model/productModel");
const Cart = require("../../model/cartModel");
const asyncHandler = require("../../middleware/asyncHandler");
const User = require("../../model/userModel");
const { getObjectSignedUrl } = require('../../utils/s3');
const Address = require("../../model/addressModel");


const loadCheckout = asyncHandler(async (req, res) => {
    const userId = req.session.user._id;
    console.log(userId )
    // Find the user by ID
    const user = await User.findById(userId);
    
  
    // Find the user's cart and populate product details
    let cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      model: 'Product'
    });
  
    if (!cart || cart.items.length === 0) {
      cart = { items: [] }; // Ensure cart is an empty array if no items are found
    }
  
    // Find the user's addresses
    const addresses = await Address.find({})
  console.log(addresses)
    // Render the checkout page
    res.render('user/checkout', { user, addresses, cart: cart.items });
  });
  


module.exports = {
    loadCheckout,
}