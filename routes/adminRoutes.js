const express = require("express");
const adminRouter = express.Router();
const adminController = require("../controller/adminController/adminController")
const categoryController = require("../controller/adminController/categoryController")



    adminRouter.route('/categories').get(categoryController.loadCategory)
    adminRouter.route('/add-categories').get(categoryController.loadaddCategory)
    adminRouter.route('/ad-categories').get(categoryController.loadaddCategory)

module.exports = adminRouter