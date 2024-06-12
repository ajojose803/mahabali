const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },

  addressline1: {
    type: String,
    required: true,
  },
  addressline2: {
    type: String, // Capitalized "String"
  },
  country: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  pincode: {
    type: Number,
    required: true,
  },
  userid: {
    type: String, 
  },
  status: {
    type: Boolean,
    default: false,
  },
  phone:{
    type: Number,
    required:true,
  },
  email:{
    type: String,
    required:true,
  }
});

const Address = mongoose.model("Address", userSchema);
module.exports = Address;