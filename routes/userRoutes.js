const express = require('express');
require('../auth/auth')
const userController = require ("../controller/UserController/userController")



const userRouter = express.Router();



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
userRouter.route('/forgot-passowrd').post(userController.forgotPassword);


//auth
userRouter.route('/auth/google').get(userController.googleAuth);
userRouter.route('/auth/google/callback').get(userController.googleCallback);
userRouter.route('/auth/google/failure').get(userController.authFailure);


//otp
userRouter.route('/sendOtp',)

module.exports = userRouter;