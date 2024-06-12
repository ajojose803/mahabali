const Product = require("../../model/productModel");
const Cart = require("../../model/cartModel");
const asyncHandler = require("../../middleware/asyncHandler");
const User = require("../../model/userModel");
const { getObjectSignedUrl } = require('../../utils/s3');

// Handler to add a product to the cart
const addtocart = asyncHandler(async (req, res) => {
  const productId = req.params.productId;
  const userId = req.session.user._id;
  console.log(productId +" "+userId)

  // Find the user's cart
  let cart = await Cart.findOne({ userId });

  // If the cart does not exist, create a new one
  if (!cart) {
    cart = new Cart({ userId, items: [] });
  }

  // Check if the product already exists in the cart
  const productIndex = cart.items.findIndex(item => item.productId.equals(productId));

  if (productIndex !== -1) {
    // If the product already exists in the cart, increase the quantity
    cart.items[productIndex].quantity += 1;
  } else {
    // Otherwise, add the product to the cart
    cart.items.push({ productId, quantity: 1 });
  }

  await cart.save();

  // Redirect to the cart page after successfully adding the product
  return res.redirect('/cart');
});


// Handler to load the cart
const LoadCart = asyncHandler(async (req, res) => {
  const userId = req.session.user._id;
  const userName = req.session.user.userName;

  // Find the user by ID
  const user = await User.findById(userId);

  // Find the user's cart and populate product details
  let cart = await Cart.findOne({ userId }).populate({
    path: 'items.productId',
    model: 'Product'
  });

  // Check if the cart exists and has items
  if (!cart || !cart.items || cart.items.length === 0) {
    return res.render("user/cart", { userName, user, cart: [] });
  }

  const filteredItems = cart.items.filter(item => item.productId.status === true);


  const cartItems = await Promise.all(filteredItems.map(async (item) => {
    const product = item.productId;
    const imageUrls = await Promise.all(product.image.map(getObjectSignedUrl));
    return {
      ...product._doc,
      imageUrls,
      quantity: item.quantity,
      total: product.price * item.quantity
    };
  }));

  req.flash('success', 'success message');
  const successMessage = req.flash('success')[0];
  console.log('successMessage:', successMessage);

  // Render the cart page with the updated cart items
  res.render("user/cart", { userName, user, cart: cartItems, successMessage });
});



// Handler to update the cart
const updateCart = asyncHandler(async (req, res) => {
  try {
    const { productId, size } = req.params;
    const { action, cartId } = req.body;
    const cart = await Cart.findOne({ _id: cartId });
    const itemIndex = cart.items.findIndex(
      (item) => item.productId.equals(productId) && item.size == size
    );

    if (itemIndex === -1) {
      return res.status(400).json({ success: false, error: "Cart item not found" });
    }

    const currentQuantity = cart.items[itemIndex].quantity;
    const product = await Product.findById(cart.items[itemIndex].productId);
    const stockLimit = product.stock.find(stock => stock.size == size).quantity;
    console.log(stockLimit)
    let updatedQuantity;

    if (action == "1") {
      updatedQuantity = currentQuantity + 1;
    } else if (action == "-1") {
      updatedQuantity = currentQuantity - 1;
    } else {
      return res.status(400).json({ success: false, error: "Invalid action" });
    }

    if (updatedQuantity > stockLimit && action == "1") {
      return re.status(400).json({ success: false, error: "Quantity exceeds stock limits" });
    } else if (updatedQuantity == 0) {
      return res.status(400).json({ success: false, error: "Quantity cannot be zero" });
    }

    cart.items[itemIndex].quantity = updatedQuantity;
    cart.items[itemIndex].total = product.price * updatedQuantity;
    await cart.save();

    const total = cart.items.reduce((acc, item) => acc + item.total, 0);
    cart.total = total;
    await cart.save();

    res.json({
      success: true,
      newQuantity: updatedQuantity,
      newProductTotal: cart.items[itemIndex].total,
      total: total,
    });
  } catch (error) {
    console.error("Error updating cart quantity:", error);
    res.render("user/servererror");
  }
});


const updateQuantity = asyncHandler(async (req, res) => {
  const userId = req.session.user._id; // Assuming you have authenticated user
  const itemId = req.params.id;
  let newQuantity = parseInt(req.body.quantity, 10); // Ensure quantity is an integer

  // Ensure the new quantity does not exceed the maximum allowed
  const MAX_QUANTITY = 3;
  let flashMessage = null;

  if (newQuantity > MAX_QUANTITY) {
    newQuantity = MAX_QUANTITY;
    flashMessage = '3 is the maximum quantity allowed for each item';
  }

  // Retrieve the product information to check stock quantity
  const product = await Product.findById(itemId);
  
  if (!product) {
    return req.flash('error', 'Product not found').redirect('/cart'); // Redirect to cart page
  }

  if (newQuantity > product.quantity) {
    req.flash('error', 'Requested quantity exceeds available stock'); // Set flash message
    return res.redirect('/cart'); // Redirect to cart page
  }

  req.flash('success', 'Your success message here');
  const successMessage = req.flash('success');

  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      req.flash('error', 'Cart not found'); 
      return res.redirect('/cart'); 
    }

    const itemIndex = cart.items.findIndex(item => item.productId.equals(itemId));

    if (itemIndex !== -1) {
      cart.items[itemIndex].quantity = newQuantity;
      await cart.save();

      if (flashMessage) {
        req.flash('info', flashMessage); 
      }

      req.flash('success', 'Quantity updated successfully'); 
      return res.redirect('/cart'); 
    } else {
      req.flash('error', 'Cart item not found'); // Set flash message
      return res.redirect('/cart'); 
    }
  } catch (error) {
    console.error(error);
    req.flash('error', 'Server error'); 
    return res.redirect('/cart'); 
  }
});




// Handler to delete an item from the cart
const deleteCart = asyncHandler(async (req, res) => {
  const productId = req.params.productId;
  const userId = req.session.user._id;
  console.log("Delete: "+" "+ productId+" "+userId)

  const cart = await Cart.findOne({ userId });

  if (cart) {
    cart.items = cart.items.filter(item => !item.productId.equals(productId));
    await cart.save();
  }

  return res.redirect("/cart");
});

module.exports = {
  LoadCart,
  addtocart,
  updateCart,
  deleteCart,
  updateQuantity
}
