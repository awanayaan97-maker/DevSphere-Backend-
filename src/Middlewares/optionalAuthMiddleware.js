
const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");

function optionalAuthMiddleware(req, res, next){

    try {
        
    const authHeader = req.headers.authorization ;
    
    if(!authHeader) {
       req.user = null
       next()
       return
    }

    let token = authHeader.split(" ")[1]

    let decodeToken = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decodeToken
    
    next()

    } 
    
    catch (error) {
       next(error)
    }

}

module.exports = optionalAuthMiddleware