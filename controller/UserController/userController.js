const User = require('../../model/userModel');
const Category = require('../../model/categoryModel');
const Product = require('../../model/productModel');
const asyncHandler = require('../../middleware/asyncHandler');
const Cart = require('../../model/cartModel');
const bcrypt = require('bcrypt');
const passport = require('passport');
const randomstring = require('randomstring');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
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
        user: req.session.user,
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
const portNumber = process.env.PORT_NUMBER;
const host = process.env.HOST;
const service = process.env.SERVICE;

const sendEmail = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service:service,
            host: host,
            port: portNumber,
            secure: true,
            auth: {
                user: myEmail,
                pass: password
            }
        });

        const emailMessage = {
            from: process.env.EMAIL,
            to: email,
            subject: "Otp Verification for your MahaBali Account",
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

    // Validate all fields are filled
    if (!username || !email || !phone || !password) {
        req.flash("error", "Please fill all the fields");
        return res.redirect('/register');
    }

    // Input validation
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const phoneRegex = /^[6-9]\d{9}$/;
    const passwordRegex = /^(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;

    if (!usernameRegex.test(username)) {
        req.flash("error", "Invalid username. Please use only letters, numbers, and underscores.");
        return res.redirect('/register');
    }
    if (!emailRegex.test(email)) {
        req.flash("error", "Invalid email format.");
        return res.redirect('/register');
    }
    if (!phoneRegex.test(phone)) {
        req.flash("error", "Invalid phone number. Please enter a valid 10-digit number.");
        return res.redirect('/register');
    }
    if (!passwordRegex.test(password)) {
        req.flash("error", "Password must be at least 8 characters long and include at least one special character.");
        return res.redirect('/register');
    }

    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            req.flash('error', 'User already exists with this email.');
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
        const expiryTime = Date.now() + 2 * 60 * 1000; // 120 seconds from now

        req.session.otp = {
            value: otp,
            expiry: expiryTime
        };

        await sendEmail(email, otp);
        req.flash('success', 'OTP sent to your email.');
        res.redirect('/otp');
    } catch (error) {
        console.error("Error creating user:", error);
        req.flash('error', 'An error occurred during registration. Please try again.');
        res.redirect('/register');
    }
});


const showOtp = async (req, res) => {
    try {
        const email = req.session.tempUser?.email;
        if (!email) {
            req.flash('error', 'Session expired. Please try again.');
            return res.redirect('/register');
        }

        const errorMessage = req.flash('error');
        res.render('user/otp', { email, errorMessage });
    } catch (error) {
        console.log(error.message);
        res.redirect('/register');
    }
};

const otpVerification = asyncHandler(async (req, res) => {
    const { digit1, digit2, digit3, digit4 } = req.body;
    const userOtp = (digit1 + digit2 + digit3 + digit4).padStart(4, '0'); // Ensure leading zeros are included

    console.log('User entered OTP:', userOtp);
    
    const { otp, tempUser } = req.session;
    console.log(" otp codeeeee",otp)

    if (!otp || !tempUser) {
        req.flash("error", "Session expired. Please try again.");
        return res.redirect("/register");
    }

    if (otp.value !== userOtp) {
        req.flash("error", "Invalid OTP");
        return res.redirect("/otp");
    }

    if (otp.expiry < Date.now()) {
        req.flash("error", "OTP expired");
        return res.redirect("/otp");
    }

    const newUser = new User(tempUser);
    await newUser.save();

    // Clear session data
    req.session.tempUser = null;
    req.session.otp = null;

    req.flash("success", "OTP verification successful");
    req.session.user = newUser;
    req.session.userId = newUser._id;
    req.session.isAuth = true;
    return res.redirect('/');
});

const resendOtp = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const otp = generateOtp();
    req.session.otp = {
        code: otp,
        expiry: Date.now() + 120000  // 120 seconds
    };

    try {
        await sendEmail(email, otp);
        res.json({ success: true, message: 'OTP resent successfully' });
    } catch (error) {
        console.log("Error in sending mail:", error);
        res.status(500).json({ success: false, message: 'Failed to resend OTP' });
    }
});


const loadLogIn = asyncHandler(async (req, res) => {
    const errorMessages = req.flash('loginError');
    const successMessage = req.flash('loginSuccess');
    const user = req.session.user;
    res.render('user/login', { errorMessages, successMessage, user });
});

const loginUser = asyncHandler(async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            req.flash("loginError", "Please fill all the fields");
            return res.redirect('/login');
        }

        const user = await User.findOne({ email });
        if (!user) {
            req.flash('loginError', 'Email');
            return res.redirect('/login');
        }

        const checkPassword = await bcrypt.compare(password, user.password);
        if (!checkPassword) {
            req.flash('loginError', 'Invalid password');
            return res.redirect('/login');
        }

        if (!user.isBlocked) {
            req.session.user = user;
            req.session.userId = user._id;
            req.session.isAuth = true;
            console.log("User authenticated successfully. Redirecting to home page...");
            return res.redirect('/');
        } else {
            req.flash('loginError', 'The website is temporarily down, Contact Admin');
            return res.redirect('/login');
        }
    } catch (error) {
        console.error(error);
        req.flash('loginError', 'Internal Server Error');
        res.redirect('/login');
    }
});


const forgotPassword = asyncHandler(async(req,res) => {
    res.render('user/forgotPassword',{})
})





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
    resendOtp,
    loadLogIn,
    logout
};
