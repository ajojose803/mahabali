const asyncHandler = require("../../middleware/asyncHandler");
const User = require("../../model/userModel");
const nodemailer = require('nodemailer');
require('dotenv').config();


const password = process.env.GOOGLE_PASSWORD;
const myEmail = process.env.EMAIL;
const portNumber = process.env.PORT_NUMBER;
const host = process.env.HOST;
const service = process.env.SERVICE;


const transporter = nodemailer.createTransport({
    service:service,
    host: host,
    port: portNumber,
    secure: true,
    auth: {
        user: myEmail,
        pass: password
    }
})

const loadContact = asyncHandler(async (req, res) => {
    const userId = req.session.user._id;
    const userName = req.session.user.userName;
    // Find the user by ID
    const user = await User.findById(userId);
    res.render('user/contact', { userName, userId, user });
});

const contact = asyncHandler(async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ success: false, error: "Please fill in the required inputs" });
    }

    const mailOptions = {
        from: email,
        to: myEmail,
        subject: 'New Contact Form Message',
        text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            return res.status(500).json({ success: false, error: 'Failed to send email' });
        }
        console.log('Email sent: ' + info.response);
        res.redirect('/products/');
    });
});

module.exports = {
    loadContact,
    contact,
};
