

const User = require('../model/userModel');
const asyncHandler = require("../../middleware/asyncHandler");


const adminPage = asyncHandler((req,res) => {
    if(req.session.isAdAuth){
        res.redirect('/dashboard')
    }
    const errorMessages  = req.flash(error);
    res.render('/login',{errorMessages})     
})

const adminLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const admin = await User.findCollection({ email });
    if (!admin) {
        req.flash("error", "Admin not found");
        return res.redirect("/login");
    }

    const passCheck = await bcrypt.compare(password, admin.password);
    if (!passCheck) {
        req.flash("error", "Invalid Credentials");
        return res.redirect("/login");
    }

    if (admin.isAdmin == true) {
        req.session.admin = email;
        req.session.isAdAuth = true;
        return res.redirect('/dashboard');
    } else {
        req.flash('error', 'You are not an Admin!')
        return res.redirect('/login')
    }
})


const adminLogout = asyncHandler(async(req,res)=>{
    req.session.destroy();
})




module.exports =
{
    adminLogin,
    adminLogout,

}