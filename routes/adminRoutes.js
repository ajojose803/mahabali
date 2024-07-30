const express = require('express');
const adminRouter = express.Router();
const adminController = require('../controller/adminController/adminController');
const categoryController = require('../controller/adminController/categoryController');
const productController = require('../controller/adminController/productController');
const userManagement = require('../controller/adminController/userManagement');
const orderManagement = require('../controller/adminController/orderManagement');
const couponController = require('../controller/adminController/couponController');
const auth = require('../middleware/sessionAuth');
const upload = require('../utils/multer')
const nocache = require('nocache');

adminRouter.use(nocache());

adminRouter.route('/').get(adminController.adminPage);
adminRouter.route('/login').get(adminController.adminPage);
adminRouter.route('/logout').get(adminController.adminLogout);

adminRouter.route('/verifyLogin').post(adminController.adminLogin);
adminRouter.route('/dashboard').get(auth.isAdAuth, adminController.adminDashboard);

//adminRouter.get("/dashboard",auth.isAdAuth , adminController.LoadDashboard)
adminRouter.post('/chartData',adminController.chartData)
adminRouter.post('/downloadsales',auth.isAdAuth,adminController.downloadsales)

adminRouter.get('/bestSellingProduct',auth.isAdAuth,adminController.bestSellingProduct)
adminRouter.get('/bestSellingCategory',auth.isAdAuth,adminController.bestSellingCategories)

// User Management System
adminRouter.route('/users').get(auth.isAdAuth, userManagement.getUser);
adminRouter.route('/users/change-status').get(userManagement.blockUser);

// Category and new categories
adminRouter.route('/category').get(auth.isAdAuth, categoryController.loadCategory);
adminRouter.route('/category/update-status').get(categoryController.listingStatusCategory);///use 
adminRouter.route('/add-category').post(categoryController.addNewCategory);
adminRouter.route('/update-category/:id').post(categoryController.updateCategory);

// Products
adminRouter.route('/products').get(auth.isAdAuth, productController.loadProduct);
adminRouter.route('/add-product').get(auth.isAdAuth, productController.loadAddProduct);
adminRouter.route('/add-product').post(upload.array('image', 5), productController.addNewProduct);
adminRouter.route('/edit-product/:id').post(upload.array('image', 5), productController.editProduct);
adminRouter.route('/product/update-status').get(productController.listingStatusProduct); ///use

//Orders
adminRouter.route('/orders').get(auth.isAdAuth, orderManagement.loadOrder);
adminRouter.route('/order/update-status').post(auth.isAdAuth, orderManagement.updateStatus);
adminRouter.route('/orderDetails/:id').get(auth.isAdAuth, orderManagement.getOrderDetails);

//return
adminRouter.route('/orderReturn').get(auth.isAdAuth, orderManagement.loadOrderReturn);
adminRouter.route('/returnApprove/:id').get(auth.isAdAuth, orderManagement.returnApprove);
adminRouter.route('/returnReject/:id').get(auth.isAdAuth, orderManagement.returnReject);


//coupons
adminRouter.route('/coupons').get(auth.isAdAuth, couponController.loadCoupon);
adminRouter.route('/add-coupon').get(auth.isAdAuth, couponController.loadAddCoupon);
adminRouter.route('/add-coupon').post(auth.isAdAuth,couponController.addNewCoupon);
adminRouter.route('/edit-coupon/:id').post(auth.isAdAuth,couponController.editCoupon);
adminRouter.route('/coupon/update-status/:id').get(couponController.couponStatus); ///use


//banners

module.exports = adminRouter;
