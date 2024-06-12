const express = require('express');
require('../auth/auth')
const userController = require ("../controller/UserController/userController")
const productController = require ("../controller/UserController/userProductController")
const cartController = require ("../controller/UserController/cartController")
const auth = require("../middleware/sessionAuth")
const nocache = require('nocache');
const userProfile = require("../controller/UserController/userProfile")
const checkout = require("../controller/UserController/checkoutController")

const userRouter = express.Router();

userRouter.use(nocache());

userRouter.route('/').get(userController.loadHome)



userRouter.route('/register')
.get(userController.register)
.post(userController.createUser)
//.patch(userController)

userRouter.route('/otp').get(userController.showOtp)
userRouter.route('/verify-otp').post(userController.otpVerification)


userRouter.route('/login')
.get(userController.loadLogIn)



userRouter.route('/login').post(userController.loginUser)
userRouter.route('/forgot-password').post(userController.forgotPassword);


//auth
userRouter.route('/auth/google').get(userController.googleAuth);
userRouter.route('/auth/google/callback').get(userController.googleCallback);
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

//checkout
userRouter.route('/checkout').get(auth.userAuth,checkout.loadCheckout);

//profile.route()
userRouter.route('/profile').get(auth.userAuth,userProfile.LoadProfile)

//address
userRouter.route('/profile/addAddress').get(auth.userAuth,userProfile.LoadAddAddress)
userRouter.route('profile/address/new').post(auth.userAuth, userProfile.addaddress)
userRouter.route('/profile/address').get(auth.userAuth,userProfile.showaddress)
userRouter.route('/profile/editAddress/:id').get(auth.userAuth,userProfile.LoadEditAddress)
userRouter.route('/addressupdated/:id').post(auth.userAuth,userProfile.editaddress)
userRouter.route('/deleteAddress/:id').get(auth.userAuth,userProfile.deleteAddress)



//Password
userRouter.route('/reset-password').get(auth.userAuth,userProfile.LoadResetPassword)
userRouter.route('/password-update').post(auth.userAuth,userProfile.updatePassword)

module.exports = userRouter;