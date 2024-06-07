const User = require('../model/userModel')

const isAdAuth = (req, res, next) => {
    if (req.session.isAdAuth) {
        return next();
    }
    req.flash('error', 'Please log in to access this page');
    res.redirect('/admin/login');
};

const userAuth = async (req, res, next) => {
    try {
        if (req.session.isAuth) {
            const user = await User.findById(req.session.userId);

            // Check if the user exists and is not blocked
            if (user && !user.is_blocked) {
                req.user = user;
                return next();
            }
        }
        // If not authenticated or user is blocked, redirect to login
        res.redirect('/login');
    } catch (err) {
        console.error('Error in userAuth middleware:', err);
        res.redirect('/login');
    }
};


module.exports = { isAdAuth,userAuth };
