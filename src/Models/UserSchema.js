
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({

    firstName: {
        type: String,
        required: true,
        trim: true,
        maxLength: 20,
        minLength: 3
    },

    lastName: {
        type: String,
        required: true,
        trim: true,
        maxLength: 20,
        minLength: 3
    },

    email: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },

    password: {
        type: String,
        required: () => {
            return this.authProvider === "local"
        },
        trim: true
    },

    authProvider: {
        type: String,
        enum: ["local", "google"],
        default: "local"
    },

    role: {
        type: String,
        default: "",
        trim: true
    },

    headline: {
        type: String,
        default: "",
        trim: true,
        maxLength: 120,
    },

    bio: {
        type: String,
        default: "",
        trim: true,
        maxLength: 500
    },

    location: {
        type: String,
        default: "",
        trim: true
    },

    profileImage: {
        type: String,
        default: ""
    },

    coverImage: {
        type: String,
        default: ""
    },

    website: {
        type: String,
        default: "",
    },

    github: {
        type: String,
        default: "",
    },

    linkedIn: {
        type: String,
        default: "",
    },

    twitter: {
        type: String,
        default: "",
    },

    isDeleted: {
        type: Boolean,
        default: false
    },
    
    deletedAt: {
        type: Date,
        default: null
    }

}, { timestamps: true })

const User = mongoose.model("User", UserSchema);

module.exports = User