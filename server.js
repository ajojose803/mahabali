const express = require('express');
const path = require('path');
require('dotenv').config();
const session = require('express-session');
const passport = require('passport');
const userRouter = require('./routes/userRoutes');
const adminRouter = require('./routes/adminRoutes');
const flash = require('connect-flash'); // Corrected 'flash' to 'connect-flash'
require('./auth/auth');
const app = express();

const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log(`MongoDB Connected`);
    }).catch((error) => {
        console.error(error);
    });

const PORT = process.env.PORT || 7000;

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

app.set('views', path.join(__dirname, 'views'));
app.set("view engine", "ejs");

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, '/public')));
app.use(express.static(path.join(__dirname, '/public/userAssets')));
app.use(express.static(path.join(__dirname, '/public/adminAssets')));

app.use('/', userRouter);
app.use('/admin', adminRouter);

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
