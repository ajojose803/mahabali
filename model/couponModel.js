const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  discountType: {
    type: String,
    default: "flat",
  },
  discountAmount: {
    type: Number,
    required: true,
  },
  minPurchaseAmount: {
    type: Number,
    default: 0,
  },
  maxRedeem:{
    type: Number,
    required: true,
  },
  validFrom: {
    type: Date,
    required: true,
  },
  validTo: {
    type: Date,
    required: true,
  },
  oncePerUser: {
    type: Boolean,
    required: true,
    default: false,
  },
  status:{
    type: Boolean,
    required: true,
    default: true,
  }
},{timestamps:true});

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;