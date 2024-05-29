const User = require('../../model/userModel');
const asyncHandler = require('../../middleware/asyncHandler')



const getUser = asyncHandler(async(req,res) => {
    const user = await User.find({isAdmin:false});
    res.render('admin/adminUser',{data:user});
})


module.exports = {
    getUser,
}