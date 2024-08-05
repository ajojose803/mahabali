const express = require('express');
require('../auth/auth')
const userController = require ("../controller/UserController/userController")
const productController = require ("../controller/UserController/userProductController")
const cartController = require ("../controller/UserController/cartController")
const wishlistController = require ("../controller/UserController/wishlistController")
const auth = require("../middleware/sessionAuth")
const nocache = require('nocache');
const userProfile = require("../controller/UserController/userProfile")
const checkout = require("../controller/UserController/checkoutController")
const other = require("../controller/UserController/other")

const userRouter = express.Router();

userRouter.use(nocache());

userRouter.route('/').get(userController.loadHome)



userRouter.route('/register')
.get(auth.isloggedOut, userController.register)
.post(userController.createUser)
//.patch(userController)

userRouter.route('/otp').get(userController.showOtp)
userRouter.route('/verify-otp').post(userController.otpVerification)
userRouter.route('/resend-otp').post(userController.resendOtp)


userRouter.route('/login').get(auth.isloggedOut,userController.loadLogIn)
userRouter.route('/logout').get(userController.logout)



userRouter.route('/login').post(userController.loginUser)
userRouter.route('/forgot-password').post(userController.forgotPassword);


//auth
userRouter.route('/auth/google').get(userController.googleAuth);
userRouter.route('/google/callback').get(userController.googleCallback);
userRouter.route('/auth/google/failure').get(userController.authFailure);


//
// userRouter.get('/account', (req,res)=> {
// res.render('user/myAccount')
// })


//product
userRouter.route('/products').get(auth.userAuth,productController.getAllProducts);
userRouter.route('/product/:productId').get(auth.userAuth,productController.getProduct);

//cart
userRouter.route('/cart').get(auth.userAuth,cartController.LoadCart);
userRouter.route('/add-to-cart/:productId').post(auth.userAuth,cartController.addtocart);
userRouter.route('/cart/delete/:productId').get(auth.userAuth,cartController.deleteCart);
userRouter.route('/cart/update').post(auth.userAuth,cartController.updateCart);
userRouter.route('/cart/update-cart/:id').put(auth.userAuth,cartController.updateQuantity);
//router.post('/cart/update-cart/:id', 

//wishlist
userRouter.route('/wishlist').get(auth.userAuth,wishlistController.wishlist);
userRouter.route('/add-to-wishlist/:productId').post(auth.userAuth,wishlistController.addtoWishlist);
userRouter.route('/wishlist/delete/:productId').get(auth.userAuth,wishlistController.deleteWishlist);

//checkout
userRouter.route('/checkout').get(auth.userAuth,checkout.loadCheckout);
userRouter.route('/checkout/place-order').post(auth.userAuth,checkout.order);
userRouter.route('/checkout/order-status/:id').get(auth.userAuth,checkout.getOrderStatus);

userRouter.route('/checkout/apply-coupon').post(auth.userAuth,checkout.applyCoupon);
userRouter.route('/checkout/revoke-coupon').post(auth.userAuth,checkout.revokeCoupon);
//userRouter.route('/checkout/verify-payment').post(auth.userAuth,checkout.verifyPayment);
userRouter.route('/checkout/create/orderId').post(auth.userAuth,checkout.createRazorpayOrder);
userRouter.route('/checkout/pay-with-wallet').post(auth.userAuth,checkout.payWithWallet);


//profile.route()
userRouter.route('/profile').get(auth.userAuth,userProfile.LoadProfile)
userRouter.route('/update-profile').post(auth.userAuth,userProfile.updateProfile)

//address
userRouter.route('/profile/address/new')
.get(auth.userAuth,userProfile.LoadAddAddress)
.post(auth.userAuth, userProfile.addAddress)
userRouter.route('/profile/address').get(auth.userAuth,userProfile.showaddress)
userRouter.route('/profile/address/:id/edit')
.get(auth.userAuth,userProfile.LoadEditAddress)
.post(auth.userAuth,userProfile.editaddress)
userRouter.route('/profile/address/:id/delete').get(auth.userAuth,userProfile.deleteAddress)
userRouter.route('/profile/address/:id/default').get(auth.userAuth, userProfile.setDefaultAddress);

//wallet
userRouter.route('/profile/wallet').get(auth.userAuth,userProfile.loadWallet)
userRouter.route('/wallet-topup').post(auth.userAuth,userProfile.walletTopup)


//Password
userRouter.route('/profile/change-password').get(auth.userAuth,userProfile.LoadResetPassword)
userRouter.route('/profile/password-update').post(auth.userAuth,userProfile.updatePassword)

//orders
userRouter.route('/profile/orders').get(auth.userAuth,userProfile.loadOrderList);
userRouter.route('/order/:id/cancel').get(auth.userAuth,userProfile.cancelOrder);
userRouter.route('/order/:orderId/cancel-product/:productId').get(auth.userAuth,userProfile.cancelProduct);
userRouter.route('/order/invoice/:orderId').get(auth.userAuth,userProfile.downloadInvoice);
userRouter.route('/order/:orderId/return').post(auth.userAuth,userProfile.returnReason);
userRouter.route('/re-order/:id').post(auth.userAuth,userProfile.reOrder);

//misc
userRouter.route('/contact').get(auth.userAuth,other.loadContact);
userRouter.route('/contact').post(auth.userAuth,other.contact);

module.exports = userRouter;