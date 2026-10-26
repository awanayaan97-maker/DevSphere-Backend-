
class ApiResponse{

    constructor(statusCode, message, data = {}){
        this.message = message,
        this.statusCode = statusCode,
        this.data = data
        this.status = true
    }
}

module.exports = ApiResponse