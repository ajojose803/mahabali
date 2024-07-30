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
        .limit(ITEMS_PER_PAGE);

    const prev = page > 1 ? page - 1 : null;
    const next = page < totalPages ? page + 1 : null;
    const msg = req.query.msg || "";
    const couponExists = req.flash('couponExists');
    const couponAdded = req.flash('couponAdded');

    res.render("admin/adminCoupons", {
        coupons,
        prev,
        next,
        totalPages,
        currentPage: page,
        msg,
        couponExists: couponExists.length > 0 ? couponExists[0] : null,
        couponAdded: couponAdded.length > 0 ? couponAdded[0] : null,
        //couponStatusChanged:couponStatusChanged.length > 0 ? couponStatusChanged[0] : null,
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

    console.log("Coupon: " + code,
        discountType,
        discountAmount,
        minPurchaseAmount,
        maxRedeem,
        validFrom,
        validTo,
        oncePerUser);

    const couponExists = await Coupon.findOne({ code: code });
    if (couponExists) {
        req.flash('couponExists', "Coupon already exists");
        return res.redirect('/admin/add-coupon'); // Ensure no further code runs after the redirect
    }

    if (!code || !discountType || !discountAmount || !minPurchaseAmount || !maxRedeem || !validFrom || !validTo) {
        req.flash('fieldsMissing', "All fields are required.");
        return res.redirect('/admin/coupons'); // Ensure no further code runs after the redirect
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
    req.flash('couponAdded', "Coupon added!");
    res.redirect('/admin/coupons');
});


const editCoupon = asyncHandler(async (req, res) => {
    const couponId = req.params.id;
    console.log("CouponId:", couponId);
   


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
    console.log("Request Body:",  oncePerUser);
    // Check if the coupon exists
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
        req.flash('couponExists', "Coupon does not exist.");
        return res.redirect('/admin/coupons');
    }

    // Check if another coupon with the same code exists
    const couponExists = await Coupon.findOne({ code });
    if (couponExists && couponExists._id.toString() !== couponId.toString()) {
        req.flash('couponExists', "Coupon with this code already exists.");
        return res.redirect('/admin/coupons');
    }

    // Validate required fields
    if (!code || !discountType || !discountAmount || !maxRedeem || !validFrom || !validTo) {
        return res.status(400).send('All fields are required.');
    }

    // Update coupon
    coupon.code = code;
    coupon.discountType = discountType;
    coupon.discountAmount = discountAmount;
    coupon.minPurchaseAmount = minPurchaseAmount;
    coupon.maxRedeem = maxRedeem;
    coupon.validFrom = new Date(validFrom);
    coupon.validTo = new Date(validTo);
    coupon.oncePerUser = oncePerUser === 'on' ? true : false, // Convert checkbox value to boolean

    // Save updated coupon
    await coupon.save();

    // Redirect with success message
    req.flash('couponAdded', "Coupon edited successfully!");
    res.redirect('/admin/coupons');
});


const couponStatus = asyncHandler(async (req, res) => {

    const id = req.params.id;
    console.log("Received ID:", id);
    const coupon = await Coupon.findById(id);
    coupon.status = !coupon.status;
    await coupon.save();
    req.flash('couponStatusChanged', "Coupon status updated successfully")
    res.redirect('/admin/coupons',)
}
)
module.exports = {
    loadCoupon,
    loadAddCoupon,
    addNewCoupon,
    editCoupon,
    couponStatus,
};
