
const { z } = require("zod");

const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(30).default(10)
});

const objectId = z.string("Id is required")
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid id");


module.exports = { paginationSchema, objectId }