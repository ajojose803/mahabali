const express = require("express");
const adminRouter = express.Router();
const adminController = require("../controller/adminController/adminController")
const categoryController = require("../controller/adminController/categoryController")


adminRouter.route('/').get(adminController.adminPage)
adminRouter.route('/login').get(adminController.adminPage)


adminRouter.route('/verifyLogin').post(adminController.adminLogin)
adminRouter.route('/dashboard').get(adminController.adminDashboard)

//category and new categories
adminRouter.route('/category').get(categoryController.loadCategory)

adminRouter.route('/add-category').post(categoryController.addNewCategory);
    //.get(categoryController.loadAddCategory)
    


//adminRouter.route('/users').get(adminController.)

//Changing the listing of the Categories
adminRouter.route('/categoryisListed/:id').post(categoryController.unlistCategory)
module.exports = adminRouter