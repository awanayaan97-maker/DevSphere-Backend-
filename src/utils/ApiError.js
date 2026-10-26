
class ApiError extends Error {

    constructor(statusCode, message,) {
        super(message)

        this.statusCode = statusCode,
        this.status  = false
    }
}

module.exports = ApiError