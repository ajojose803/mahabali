const User = require('../../model/userModel');
const asyncHandler = require('../../middleware/asyncHandler');
const bcrypt = require('bcrypt');
const passport = require('passport');
const randomstring = require('randomstring')
const otpCollection = require('../../model/otpModel')
const nodemailer =require('nodemailer')
require('dotenv').config()


const loadHome = asyncHandler(async(req,res) => {
    res.render('user/home')
})


const register = asyncHandler(async(req,res) =>{

    const errorMessage = req.flash('error');
    const successMessage = req.flash('success')
    res.render('user/register', { errorMessage, successMessage })

})
//generating a otp through randomstring gen
const generateOtp = () => {
    try {
        const otp = randomstring.generate({
            length:4,
            charset:'numeric'
        });

        console.log("Generated OTP :", otp);
        return otp;
    } catch (error) {
        console.log(error.message);
        res.render('user/servererror')
    }

}


const password = process.env.GOOGLE_PASSWORD;
const myEmail = process.env.EMAIL;


//function to send an email with the otp to the customer
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
        console.log("e-mail sent successfully")

    } catch (error) {
        console.log("Error in sending mail:", error);

        //res.render('user/servererror')
        throw new Error('Failed to send OTP')
    }
}


//to create a new user
const createUser = asyncHandler(async (req, res) => {
    //destructuring the req.body into fields
    const { username, email, phone, password } = req.body;

    //checking all the fields are entered correctly
    if (!username || !email || !password || !phone) {
        res.status(400);
        req.flash("error", "Please fill all the fields ")
        return res.redirect('/register');
    }

    //checking if the user has previously signed up
    const userExists = await User.findOne({ email })
    if (userExists) res.status(400).send("Existing user");


    // const userBlocked = await User.findOne({ email }, { isBlocked })
    // if (userBlocked) res.status(400).send("Blocked User");

    //hashing the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt)

    //creating a object newUser with the details collected
    const newUser = new User({
        username,
        email,
        phone,
        password: hashedPassword
    })


    //storing the the session data
    req.session.user = newUser;
    req.session.signup = true;

    //otp process
    const otp = generateOtp();
    const expiryTime = Date.now()+ 2 * 60 * 1000;
    
    await otpCollection.updateOne(
        { email: email },
        { email, otp, expiry: new Date(expiryTime) },
        { upsert: true }
    ); 
    
    console.log(`Sending OTP to email: ${email}`)
        await sendEmail(email, otp);

        res.render('user/otp', { email: email });
        //res.redirect('/otp', { email: email }); 


    
    try {
        await newUser.save();
    } catch (error) {
        res.status(400)
        throw new Error("Invalid userdata")
    }

});


const showOtp = async(req,res) =>{
    try {
        const otp = await otpCollection.findOne({email:req.session.user.email})
        res.render('user/otp',{
            expressFlash:{
                otpError : req.flash('otpError')
            },otp:otp,
        });
    } catch (error) {
        console.log(error.message)
    }
   
}

//verify OTP

const otpVerification = asyncHandler(async (req, res) => {
    const { email, digit1,digit2,digit3,digit4 } = req.body;
    const userOtp = parseInt(digit1+digit2+digit3+digit4);
    console.log(userOtp);

    const otpRecord = await otpCollection.findOne({ email });
    console.log(otpRecord.otp)
    if (!otpRecord) {
        req.flash("error", "User does not exist or OTP expired");
        return res.status(400).send("User does not exist or OTP expired");
    }

    if (otpRecord.otp !== userOtp ) {
        req.flash("error", "Invalid OTP");
        return res.status(400).send("Invalid OTP");
    }


    if (otpRecord.expiry.getTime() < Date.now()) {
        req.flash("error", "OTP expired");
        return res.status(400).send("OTP expired");
    }

    // Update the user as verified
    await User.findOneAndUpdate({ email: email }, { $set: { isVerified: true } });

    // Delete the OTP record
    //await otpCollection.deleteOne({ email });

    // Sending a success response
    req.flash("success", "OTP verification successful");
    return res.redirect('/');
});




const loadLogIn = async (req, res) => {
    try {

        const errorMessages = req.flash('error');
        const successMessage = req.flash('success');

        res.render('user/login', { errorMessages, successMessage })

    } catch (error) {
        console.log(error.message);
        res.render('user/servererror')
    }
}
//User Log in
const loginUser = asyncHandler(async (req, res) => {
   
    try {
        const { email, password } = req.body;


    if (!email || !password) {
        throw new Error("Please fill all the fields")
    }


    const user = await User.findOne({ email });
    if (!user) {
        req.flash('error', 'Invalid Credentials');
        return res.redirect('/login');
    }

    const checkPassword = await bcrypt.compare(password, user.password)

    if (!checkPassword) {
        req.flash('error', 'Invalid Credentials');
        return  res.redirect('/login');
    }

    if (user.isBlocked == false) {
        req.session.user = user;
        req.session.userId = user._id;
        req.session.isAuth = true;
        console.log("User authenticated successfully. Redirecting to home page...");
        return res.redirect('/');
      }
      else {
        req.flash('error', 'This user is blocked.');
        return res.redirect('/login');
    }
    } catch (error) {
        console.error(error); // Log the error to the console
        req.flash('error', 'Internal Server Error');
        res.redirect('/login');
    }
});



//forgot Password
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    //checking if user exists
    const user = await User.findOne({email});
    if(!user){
        return req.flash("User does not exist or Invalid E-mail")
    }
})




//google oauth
const googleAuth = passport.authenticate('google', { scope: ['email','profile'] });

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
    loadLogIn
}