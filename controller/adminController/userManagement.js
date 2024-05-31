const User = require('../../model/userModel');
const asyncHandler = require('../../middleware/asyncHandler')



const getUser = asyncHandler(async(req,res) => {
    const user = await User.find({isAdmin:false});
    res.render('admin/adminUser',{data:user});
})

const blockUser = asyncHandler(async (req,res)=>{
    const id = req.query.id;
    const user = await User.findById(id);
    user.isBlocked = !user.isBlocked;
    await user.save();
    req.flash('success', "User status updated successfully")
    res.redirect('/admin/users',)

})

module.exports = {
    getUser,
    blockUser,

}