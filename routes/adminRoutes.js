const express = require("express");
const adminRouter = express.Router();
const User = require('../model/userModel') 


adminRouter.route('/').get(adminRouter)

module.exports = adminRouter