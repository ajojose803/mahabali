const express = require('express');
const adminRouter = express.Router();
const adminController = require('../controller/adminController/adminController');
const categoryController = require('../controller/adminController/categoryController');
const productController = require('../controller/adminController/productController');
const userManagement = require('../controller/adminController/userManagement');
const orderManagement = require('../controller/adminController/orderManagement');
const auth = require('../middleware/sessionAuth');
const upload = require('../utils/multer')
const nocache = require('nocache');

adminRouter.use(nocache());

adminRouter.route('/').get(adminController.adminPage);
adminRouter.route('/login').get(adminController.adminPage);
adminRouter.route('/logout').get(adminController.adminLogout);

adminRouter.route('/verifyLogin').post(adminController.adminLogin);
adminRouter.route('/dashboard').get(auth.isAdAuth, adminController.adminDashboard);

// User Management System
adminRouter.route('/users').get(auth.isAdAuth, userManagement.getUser);
adminRouter.route('/users/change-status').get(userManagement.blockUser);

// Category and new categories
adminRouter.route('/category').get(auth.isAdAuth, categoryController.loadCategory);
adminRouter.route('/category/update-status').get(categoryController.listingStatusCategory);///use 
adminRouter.route('/add-category').post(categoryController.addNewCategory);
adminRouter.route('/update-category').post(categoryController.updateCategory);

// Products
adminRouter.route('/products').get(auth.isAdAuth, productController.loadProduct);
adminRouter.route('/add-product').get(auth.isAdAuth, productController.loadAddProduct);
adminRouter.route('/add-product').post(upload.array('image', 5), productController.addNewProduct);
adminRouter.route('/edit-product/:id').post(upload.array('image', 5), productController.editProduct);
adminRouter.route('/product/update-status').get(productController.listingStatusProduct); ///use

//Orders
adminRouter.route('/orders').get(auth.isAdAuth, orderManagement.loadOrder);
adminRouter.route('/order/update-status').post(auth.isAdAuth, orderManagement.updateStatus);


//coupons


//banners

module.exports = adminRouter;
