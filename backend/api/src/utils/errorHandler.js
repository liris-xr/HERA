export const errorHandler = (err, req, res, next) => {
    console.error(err);
    if (res.headersSent) return next(err);
    return res.status(500).json({ error: "Internal server error" });
};