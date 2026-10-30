
const { z } = require("zod");

const nameField = (label) =>
    z.string(`${label} is required`)
        .trim()
        .min(1, `${label} is required`)
        .max(30, `${label} must be 30 characters or less`);

const emailField = z.string("Email is required")
    .trim()
    .toLowerCase()
    .pipe(z.email("Please enter a valid email"));

const passwordField = z.string("Password is required")
    .trim()
    .min(1, "Password is required")

const signupSchema = z.object({

    body: z.object({
        firstName: nameField("First name"),
        lastName: nameField("Last name"),
        email: emailField,
        password: z.string("Password is required")
            .min(8, "Password must be at least 8 characters")
            .max(72, "Password must be 72 characters or less")
    })

})

const loginSchema = z.object({
    body: z.object({
        email: emailField,
        password: passwordField
    })
})

const OTPSchema = z.object({

    body: z.object({
        email: emailField,
        otp: z.string("please enter a OTP number sended to your email")
            .trim()
            .min(1, "please enter a OTP number sended to your email")
            .max(6, "invalid OTP number")
    })
})

const resendOTPSchema = z.object({

    body: z.object({
        email: emailField
    })
})

const forgotPasswordSchema = z.object({

    body: z.object({
        email: emailField
    })

})

const resetPasswordSchema = z.object({

    body: z.object({
        password: passwordField
    }),

    params: z.object({
        token: z.string("Reset token is required")
            .trim()
            .min(1, "Token is required")
    })
})

const deactivateAccountSchema = z.object({

    body: z.object({
        password: passwordField
    })

})

module.exports = { signupSchema, loginSchema, OTPSchema, resendOTPSchema, forgotPasswordSchema, resetPasswordSchema, deactivateAccountSchema }