export const errorHandler = (err, req, res, next) => {
  console.log(err);
  // Handle Multer limit errors or custom extension/count validation errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res
      .status(400)
      .send({ error: "File is too large. Maximum size allowed is 5 MB." });
  }
  if (
    err.message &&
    (err.message.includes("allowed") ||
      err.message.includes("limit") ||
      err.message.includes("missing"))
  ) {  
    return res.status(400).send({ error: err.message }); 
  }

  return res.status(500).send({ error: "Internal sever error" });  
};
