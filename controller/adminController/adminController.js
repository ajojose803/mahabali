
const bcrypt = require('bcryptjs')
const User = require('../../model/userModel');
const asyncHandler = require("../../middleware/asyncHandler");


const adminPage = asyncHandler((req,res) => {
    if(req.session.isAdAuth){
        res.redirect('/admin/dashboard')
    }
    const errorMessages  = req.flash("error");
    res.render('admin/adminLogin',{errorMessages})     
})

const adminLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const admin = await User.findOne({ email });
    if (!admin) {
        req.flash("error", "User not found");
        return res.redirect("/admin/login");
    }

    const passCheck = await bcrypt.compare(password, admin.password);
    if (!passCheck) {
        req.flash("error", "Invalid Credentials");
        return res.redirect("/admin/login");
    }

    if (admin.isAdmin == true) {
        req.session.admin = email;
        req.session.isAdAuth = true;
        return res.redirect('/admin/dashboard');
    } else {
        req.flash('error', 'You are not an Admin!')
        return res.redirect('/admin/login')
    }
})


const adminDashboard = asyncHandler(async(req,res)=>{
    res.render('admin/adminHome')
})
const adminLogout = asyncHandler(async(req,res)=>{
    req.session.destroy();
})




module.exports =
{
    adminPage,
    adminLogin,
    adminDashboard,
    adminLogout,

}