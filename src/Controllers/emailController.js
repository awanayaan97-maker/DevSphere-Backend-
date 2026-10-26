
const transporter = require("../Config/email");

async function sendOTP(email, otp) {

    await transporter.sendMail({
        from: process.env.PORTAL_EMAIL,
        to: email,
        subject: "Signup Verification OTP",
        text: `Your OTP is ${otp}. This OTP will expire in 5 minutes.`
    });
}

async function sendPasswordReset(email, token) {

    const resetLink =
        `http://localhost:5173/reset-password/${token}`;


    await transporter.sendMail({

        from: process.env.PORTAL_EMAIL,

        to: email,

        subject: "Reset Your DevSphere Password",

        text: `
   You requested to reset your DevSphere password.

   Click the link below to reset your password:

${resetLink}

This link will expire in 15 minutes.

If you did not request this, you can safely ignore this email.
        `

    });
}


module.exports = {sendOTP, sendPasswordReset};