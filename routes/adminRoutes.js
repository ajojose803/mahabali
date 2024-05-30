const express = require("express");
const adminRouter = express.Router();
const adminController = require("../controller/adminController/adminController")
const categoryController = require("../controller/adminController/categoryController")
const productController = require("../controller/adminController/productController");
const userManagement = require('../controller/adminController/userManagement');


adminRouter.route('/').get(adminController.adminPage)
adminRouter.route('/login').get(adminController.adminPage)


adminRouter.route('/verifyLogin').post(adminController.adminLogin)
adminRouter.route('/dashboard').get(adminController.adminDashboard)


//User Management System
adminRouter.route('/users').get(userManagement.getUser)


//category and new categories
adminRouter.route('/category').get(categoryController.loadCategory)
adminRouter.route('/category/update-status').get(categoryController.listingStatusCategory);
adminRouter.route('/add-category').post(categoryController.addNewCategory);
adminRouter.route('/update-category').post(categoryController.updateCategory);

//Changing the listing of the Categories
//adminRouter.route('/categoryisListed/:id').get(categoryController.listingStatusCategory)


//products
adminRouter.route('/products').get(productController.loadProduct)
adminRouter.route('/add-product').get(productController.loadAddProduct)





module.exports = adminRouter