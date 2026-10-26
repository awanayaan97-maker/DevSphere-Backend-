
const jwt = require("jsonwebtoken");

function generateToken(firstName, lastName, email, id) {

    let tokenDetails = {
        firstName,
        lastName,
        email,
        id
    }

    let token = jwt.sign(tokenDetails, process.env.JWT_SECRET)

    return token;
}

module.exports = generateToken;