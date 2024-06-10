const express = require('express');
const path = require('path');
require('dotenv').config();
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash'); 
const nocache = require("nocache");
require('./auth/auth');
const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const methodOverride = require('method-override');


const userRouter = require('./routes/userRoutes');
const adminRouter = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 7000;
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log(`MongoDB Connected`);
    }).catch((error) => {
        console.error(error);
    });


app.use(
    session({
        secret: 'secret',
        saveUninitialized: false,
        resave: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 30,
        }
    })
);
app.use(flash());
app.use(nocache());

app.use(passport.initialize());
app.use(passport.session());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(methodOverride('_method'));

app.set('views', path.join(__dirname, 'views'));
app.set("view engine", "ejs");

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, '/public')));
app.use(express.static(path.join(__dirname, '/public/userAssets')));
app.use(express.static(path.join(__dirname, '/public/adminAssets')));

app.use('/', userRouter);
app.use('/admin', adminRouter);

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
