const User = require('../../model/userModel');
const Category = require('../../model/categoryModel');
const Product = require('../../model/productModel');
const asyncHandler = require('../../middleware/asyncHandler');
const Cart = require('../../model/cartModel')
const bcrypt = require('bcrypt');
const passport = require('passport');
const randomstring = require('randomstring');
const otpCollection = require('../../model/otpModel');
const mongoose = require('mongoose')
const nodemailer = require('nodemailer');
require('dotenv').config();

const loadHome = asyncHandler(async (req, res) => {
    const id = req.session.userId;
    const currentPage = 'home';
    const categories = await Category.find({ status: true }).limit(3);
    const searchQuery = req.query.search;
    let products;

    if (searchQuery) {
        const searchRegex = new RegExp(searchQuery, 'i');
        let searchCriteria = { description: searchRegex, status: true };
        products = await Product.find(searchCriteria).exec();
    } else {
        products = await Product.find({ status: true }).exec();
    }

    if (req.user) {
        req.session.isAuth = true;
        req.session.userId = req.user._id;
    }

    let itemCount = 0;
    if (id) {
        const result = await Cart.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(id) } },
            { $unwind: '$item' },
            { $group: { _id: null, itemCount: { $sum: 1 } } },
        ]);

        if (result.length > 0) {
            itemCount = result[0].itemCount;
            req.session.cartCount = itemCount;
        }
    }

    res.render('user/home', {
        user:req.session.user,
        products,
        categories,
        itemCount,
        currentPage,
        searchQuery,
        scrollToResults: searchQuery && products.length > 0,
    });
});

const register = asyncHandler(async (req, res) => {
    const errorMessage = req.flash('error');
    const successMessage = req.flash('success');
    res.render('user/register', { errorMessage, successMessage });
});

const generateOtp = () => {
    try {
        const otp = randomstring.generate({
            length: 4,
            charset: 'numeric'
        });
        console.log("Generated OTP :", otp);
        return otp;
    } catch (error) {
        console.log(error.message);
        res.render('user/servererror');
    }
};

const password = process.env.GOOGLE_PASSWORD;
const myEmail = process.env.EMAIL;

const sendEmail = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            host: 'smtp.gmail.com',
            port: 587,
            secure: true,
            auth: {
                user: myEmail,
                pass: password
            }
        });

        const emailMessage = {
            from: process.env.EMAIL,
            to: email,
            subject: "E-Mail Verification for your MahaBali Account",
            text: "Your OTP is: " + otp,
        };

        await transporter.sendMail(emailMessage);
        console.log("E-mail sent successfully");
    } catch (error) {
        console.log("Error in sending mail:", error);
        throw new Error('Failed to send OTP');
    }
};

const createUser = asyncHandler(async (req, res) => {
    const { username, email, phone, password } = req.body;

    if (!username || !email || !password || !phone) {
        req.flash("error", "Please fill all the fields");
        return res.redirect('/register');
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
        req.flash('error', 'Existing user');
        return res.redirect('/register');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    req.session.tempUser = {
        username,
        email,
        phone,
        password: hashedPassword
    };

    const otp = generateOtp();
    const expiryTime = Date.now() + 2 * 60 * 1000;

    await otpCollection.updateOne(
        { email: email },
        { email, otp, expiry: new Date(expiryTime) },
        { upsert: true }
    );

    await sendEmail(email, otp);
    const succesMessage = req.flash('success');
    const errorMessage = req.flash('error');
    res.render('user/otp', { email: email, errorMessage });
});

const showOtp = async (req, res) => {
    try {
        const otp = await otpCollection.findOne({ email: req.session.tempUser.email });
        res.render('user/otp', {
            expressFlash: {
                otpError: req.flash('otpError')
            }, otp: otp,
        });
    } catch (error) {
        console.log(error.message);
    }
};

const otpVerification = asyncHandler(async (req, res) => {
    const { email, digit1, digit2, digit3, digit4 } = req.body;
    const userOtp = parseInt(digit1 + digit2 + digit3 + digit4);
    const otpRecord = await otpCollection.findOne({ email });

    if (!otpRecord) {
        req.flash("error", "User does not exist or OTP expired");
        return res.redirect("/otp");
    }

    if (otpRecord.otp !== userOtp) {
        req.flash("error", "Invalid OTP");
        return res.redirect("/otp");
    }

    if (otpRecord.expiry.getTime() < Date.now()) {
        req.flash("error", "OTP expired");
        return res.redirect("/otp");
    }

    const newUser = new User(req.session.tempUser);
    await newUser.save();

    await otpCollection.deleteOne({ email });

    req.flash("success", "OTP verification successful");
    req.session.user = newUser;
    req.session.userId = newUser._id;
    req.session.isAuth = true;
    return res.redirect('/');
});

const loadLogIn = asyncHandler(async (req, res) => {
    const errorMessages = req.flash('error');
    const successMessage = req.flash('success');
    const user = req.session.user;
    res.render('user/login', { errorMessages, successMessage, user });
});

const loginUser = asyncHandler(async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            req.flash("error", "Please fill all the fields");
            return res.redirect('/login');
        }

        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error', 'Email');
            return res.redirect('/login');
        }

        const checkPassword = await bcrypt.compare(password, user.password);
        if (!checkPassword) {
            req.flash('error', 'Invalid password');
            return res.redirect('/login');
        }

        if (!user.isBlocked) {
            req.session.user = user;
            req.session.userId = user._id;
            req.session.isAuth = true;
            console.log("User authenticated successfully. Redirecting to home page...");
            return res.redirect('/');
        } else {
            req.flash('error', 'The website is temporarily down, Contact Admin');
            return res.redirect('/login');
        }
    } catch (error) {
        console.error(error);
        req.flash('error', 'Internal Server Error');
        res.redirect('/login');
    }
});

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        req.flash("error", "User does not exist or Invalid E-mail");
        return res.redirect('/forgot-password');
    } else {
        res.render('user/forgot-password');
    }
});

const logout = asyncHandler(async (req, res) => {
    req.session.isAuth = false;
    req.session.user = null;
    req.session.userId = null;
    req.flash('success', 'Logged out successfully.');
    res.redirect('/login');
});

const googleAuth = passport.authenticate('google', { scope: ['email', 'profile'] });

const googleCallback = passport.authenticate('google', {
    successRedirect: '/',
    failureRedirect: '/auth/failure'
});

const authFailure = (req, res) => {
    res.send('Something went wrong..');
};

module.exports = {
    loadHome,
    register,
    createUser,
    loginUser,
    forgotPassword,
    googleAuth,
    googleCallback,
    authFailure,
    showOtp,
    otpVerification,
    loadLogIn,
    logout
};
