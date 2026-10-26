
const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        maxLength: 20,
        minLength: 3
    },

    lastName: {
        type: String,
        required: true,
        maxLength: 20,
        minLength: 3
    },

    email: {
        type: String,
        required: true,
        unique: true,
    },

    password: {
        type: String,
        required: true,
    },

    otp: {
        type : String,
        required: true
    },

    attempts: {
    type: Number,
    default: 0,
  },

    createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400,
  }
})

const PendingSignup = mongoose.model("PendingSignup", otpSchema)

module.exports  = PendingSignup