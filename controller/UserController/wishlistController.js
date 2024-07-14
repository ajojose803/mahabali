const Category = require('../../model/categoryModel');
const Product = require('../../model/productModel');
const User = require('../../model/userModel');
const Wishlist = require('../../model/wishlistModel');
const asyncHandler = require('../../middleware/asyncHandler');
const { getObjectSignedUrl } = require('../../utils/s3');


const addtoWishlist = asyncHandler(async (req, res) => {
    console.log("Reaching addtoWishlist function")
    const productId = req.params.productId;
    const userId = req.session.user._id;

    // Retrieve the product information to check stock quantity
    const product = await Product.findById(productId);

    if (!product) {
        req.flash('error', 'Product not found');
        return res.redirect('/wishlist');
    }

    // Find the user's wishlist
    let wishlist = await Wishlist.findOne({ userId });

    // If the wishlist does not exist, create a new one
    if (!wishlist) {
        wishlist = new Wishlist({ userId, items: [] });
    }

    // Check if the product already exists in the wishlist
    const productIndex = wishlist.items.findIndex(item => item.productId.equals(productId));

    if (productIndex !== -1) {
        // If the product already exists in the wishlist, increase the quantity
        let newQuantity = wishlist.items[productIndex].quantity + 1;

        if (newQuantity > product.stock) {
            req.flash('error', 'Requested quantity exceeds available stock');
            return res.redirect('/wishlist');
        }

        wishlist.items[productIndex].quantity = newQuantity;
    } else {
        // Otherwise, add the product to the wishlist
        if (product.stock < 1) {
            req.flash('error', 'Product is out of stock');
            return res.redirect('/wishlist');
        }

        wishlist.items.push({ productId, quantity: 1 });
    }

    await wishlist.save();

    // Redirect to the wishlist page after successfully adding the product
    return res.redirect('/products');
});




const wishlist = asyncHandler(async (req, res) => {
    const userId = req.session.user._id;
    const userName = req.session.user.userName;

    const user = await User.findById(userId);

    let wishlist = await Wishlist.findOne({ userId }).populate({
        path: 'items.productId',
        model: 'product'
    });

    if (!wishlist || !wishlist.items || wishlist.items.length === 0) {
        return res.render("user/wishlist", { userName, user, wishlist: [] });
    }

    const filteredItems = wishlist.items.filter(item => item.productId.status === true);


    const wishlistItems = await Promise.all(filteredItems.map(async (item) => {
        const product = item.productId;
        const imageUrls = await Promise.all(product.image.map(getObjectSignedUrl));
        return {
            ...product._doc,
            imageUrls,
        };
    }));

    req.flash('success', '');
    const successMessage = req.flash('success')[0];
    const errorMessage = req.flash('error');
    // console.log('successMessage:', successMessage);

    res.render("user/wishlist", { userName, user, wishlist: wishlistItems, successMessage, errorMessage });


})

const deleteWishlist = asyncHandler(async (req, res) => {
    const productId = req.params.productId;
    const userId = req.session.user._id;
    //console.log("Delete: "+" "+ productId+" "+userId)
  
    const wishlist = await Wishlist.findOne({ userId });
  
    if (wishlist) {
        wishlist.items = wishlist.items.filter(item => !item.productId.equals(productId));
      await wishlist.save();
    }
  
    return res.redirect("/wishlist");
  });

module.exports = {
    addtoWishlist,
    wishlist,
    deleteWishlist,

}