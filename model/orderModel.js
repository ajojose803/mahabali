const mongoose = require('mongoose');
const shortid = require('shortid');
const Schema = mongoose.Schema;

const orderSchema = new mongoose.Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  orderId: {
    type: String,
    default: shortid.generate,
    unique: true,
  },
  items: [{
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    size: {
      type: String,
      required: false,
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price must be positive'],
    },
    orderId: {
      type: String,
    },
  }],
  wallet: {
    type: Number,
    min: [0, 'Wallet amount must be positive'],
  },
  status: {
    type: String,
    default: "Pending",
    enum: [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancel requested",
      "Cancelled",
      "Returned",
      "Return requested",
      "Payment pending",
    ],
  },
  address: {
    type: Object,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount must be positive'],
  },
  payment: {
    type: String,
    required: true,
  },
  return: [{
    reason: {
      type: String,
    },
    status: {
      type: String,
      default: 'Pending',
    },
  }]
}, {
  timestamps: true,
});

const orderCollection = mongoose.model("orders", orderSchema);

module.exports = orderCollection;
