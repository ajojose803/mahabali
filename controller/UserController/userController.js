const User = require('../../model/userModel');
const asyncHandler = require('../../middleware/asyncHandler');
const bcrypt = require('bcrypt');
const passport = require('passport');
const randomstring = require('randomstring');
const otpCollection = require('../../model/otpModel');
const nodemailer = require('nodemailer');
require('dotenv').config();

const loadHome = asyncHandler(async (req, res) => {
    res.render('user/home',{user:req.session.user});
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
    res.render('user/otp', { email: email });
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
        return res.status(400).send("User does not exist or OTP expired");
    }

    if (otpRecord.otp !== userOtp) {
        req.flash("error", "Invalid OTP");
        return res.status(400).send("Invalid OTP");
    }

    if (otpRecord.expiry.getTime() < Date.now()) {
        req.flash("error", "OTP expired");
        return res.status(400).send("OTP expired");
    }

    const newUser = new User(req.session.tempUser);
    await newUser.save();

    await otpCollection.deleteOne({ email });

    req.flash("success", "OTP verification successful");
    return res.redirect('/');
});

const loadLogIn = asyncHandler(async (req, res) => {
    const errorMessages = req.flash('error');
    const successMessage = req.flash('success');
    const user = req.session.user;
    res.render('user/login', { errorMessages, successMessage,user });
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
            req.flash('error', 'Invalid Credentials');
            return res.redirect('/login');
        }

        const checkPassword = await bcrypt.compare(password, user.password);
        if (!checkPassword) {
            req.flash('error', 'Invalid Credentials');
            return res.redirect('/login');
        }

        if (!user.isBlocked) {
            req.session.user = user;
            req.session.userId = user._id;
            req.session.isAuth = true;
            console.log("User authenticated successfully. Redirecting to home page...");
            return res.redirect('/');
        } else {
            req.flash('error', 'This user is blocked.');
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

const logout = asyncHandler(async(req,res) => {
    req.session.isAuth = false;
})

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
