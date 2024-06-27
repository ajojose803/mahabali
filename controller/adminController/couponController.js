const asyncHandler = require('../../middleware/asyncHandler');
const Category = require('../../model/categoryModel');
const Product = require('../../model/productModel');
const Coupon = require('../../model/couponModel')

const ITEMS_PER_PAGE = 4;

const loadCoupon = asyncHandler(async (req, res) => {
    const page = +req.query.page || 1;
    const totalCoupons = await Coupon.countDocuments();
    const totalPages = Math.max(Math.ceil(totalCoupons / ITEMS_PER_PAGE), 1);
    const skipAmount = Math.max(0, (page - 1) * ITEMS_PER_PAGE);

    const coupons = await Coupon.find()
        .skip(skipAmount)
        .limit(ITEMS_PER_PAGE)

    const prev = page > 1 ? page - 1 : null;
    const next = page < totalPages ? page + 1 : null;
    //   const categories = await Category.find({});
    const msg = req.query.msg || "";
    const couponExists = req.flash('couponExists');
    const couponAdded = req.flash('couponAdded');

    res.render("admin/adminCoupons", {
        coupons,
        prev,
        next,
        totalPages,
        currentPage: page,
        //CatData: categories,
        msg,
        couponExists,
        couponAdded
    });
});




const loadAddCoupon = asyncHandler(async (req, res) => {
    const couponExists = req.flash('couponExists');
    const couponAdded = req.flash('couponAdded');
    res.render('admin/adminCoupons-add', { couponExists, couponAdded });
});

const addNewCoupon = asyncHandler(async (req, res) => {
    const {
        code,
        discountType,
        discountAmount,
        minPurchaseAmount,
        maxRedeem,
        validFrom,
        validTo,
        oncePerUser,
    } = req.body;

    console.log("Coupon: "+ code,
        discountType,
        discountAmount,
        minPurchaseAmount,
        maxRedeem,
        validFrom,
        validTo,
        oncePerUser,)

    const couponExists = await Coupon.findOne({ code: code });
    if (couponExists) {
        req.flash('couponExists', "Coupon already exists");
        res.redirect('/admin/add-coupon')
    }

    if (!code || !discountType || !discountAmount ||!minPurchaseAmount || !maxRedeem || !validFrom || !validTo) {
        return res.status(400).send('All fields are required.');
    }

    const coupon = new Coupon({
        code,
        discountType,
        discountAmount,
        minPurchaseAmount,
        maxRedeem,
        validFrom,
        validTo,
        oncePerUser: oncePerUser === 'on' ? true : false, // Convert checkbox value to boolean
    });

    // Save the new coupon to the database
    await coupon.save();

    // Redirect to the coupons list
    req.flash('couponAdded', "Coupon added!")
    res.redirect('/admin/coupons');
});

const editCoupon = asyncHandler(async (req, res) => {
    const couponId = req.params.id;
    const {
        code,
        discountType,
        discountAmount,
        minPurchaseAmount,
        maxRedeem,
        validFrom,
        validTo,
        oncePerUser,
    } = req.body;

    const couponCheck = await Coupon.findById({ couponId });

    if (!couponCheck) {
        req.flash('couponExists', "Coupon does not exists");
        res.redirect('/admin/coupons')
    }

    const couponExists = await Coupon.findOne({ code: code });
    if (couponExists) {
        req.flash('couponExists', "Coupon already exists");
        res.redirect('/admin/add-coupon')
    }

    if (!code || !discountType || !discountAmount || !maxRedeem || !validFrom || !validTo) {
        return res.status(400).send('All fields are required.');
    }



    // Redirect to the coupons list
    req.flash('couponAdded', "Coupon added!")
    res.redirect('/admin/coupons');
});


const couponStatus = asyncHandler(async (req, res) => {

    const id = req.query.id;
    //console.log("Received ID:", id);
    const product = await Product.findById(id);
    product.status = !product.status;
    await product.save();
    req.flash('success', "Product status updated successfully")
    res.redirect('/admin/products',)
}
)
module.exports = {
    loadCoupon,
    loadAddCoupon,
    addNewCoupon,
    editCoupon,
    couponStatus,
};
