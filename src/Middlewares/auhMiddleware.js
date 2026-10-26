
const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");

function authMiddleware(req, res, next){

    try {
        
    const authHeader = req.headers.authorization;

    if(!authHeader) return next(new ApiError(401, "No token provided"))

    let token = authHeader.split(" ")[1]

    let decodeToken = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = decodeToken
    
    next()

    } 
    
    catch (error) {
       next(error)
    }

}

module.exports = authMiddleware