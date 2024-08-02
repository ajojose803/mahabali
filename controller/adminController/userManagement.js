const User = require('../../model/userModel');
const asyncHandler = require('../../middleware/asyncHandler')



const getUser = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalUsers = await User.countDocuments({ isAdmin: false });
    const users = await User.find({ isAdmin: false })
                            .skip(skip)
                            .limit(limit);

    res.render('admin/adminUser', {
        data: users,
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit)
    });
});


const blockUser = asyncHandler(async (req,res)=>{
    const id = req.query.id;
    console.log("Reaching block user: ", id);
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