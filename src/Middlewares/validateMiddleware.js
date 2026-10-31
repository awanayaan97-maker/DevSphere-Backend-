
const ApiError = require("../utils/ApiError");

const validateMiddleware = (schema) => (req, res, next) => {

    console.log(req.query);

    const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params
    });

    if (!result.success) {

        const message = result.error.issues
            .map((issue) => {
                const field = issue.path.slice(1).join(".");
                return field ? `${field}: ${issue.message}` : issue.message;
            })
            .join(", ");

        return next(new ApiError(400, message));
    }

    const data = result.data;

    if (data.body) req.body = data.body;
    req.validated = data;
    console.log(req.validated);
    

    next();
};

module.exports = validateMiddleware;