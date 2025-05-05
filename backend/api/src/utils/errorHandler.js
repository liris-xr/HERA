export const errorHandler = (err, req, res, next) => {
    console.log(err);
    return res.status(500).send({"error": "Internal sever error"})
}