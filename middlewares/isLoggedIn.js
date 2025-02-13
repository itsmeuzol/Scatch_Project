const jwt = require("jsonwebtoken");
const userModel = require("../models/user-model");

module.exports = async (req, res, next) => {
  const token = req.cookies.token;

  if (token) {
    try {
      let decoded = jwt.verify(token, process.env.JWT_KEY);
      let user = await userModel
        .findOne({ email: decoded.email })
        .select("-password");

      if (user) {
        req.user = user; // Store user in req
        res.locals.loggedin = true;
        res.locals.fullname = user.fullname; // Make username available in views
      } else {
        res.locals.loggedin = false;
        res.locals.username = "";
      }
    } catch (err) {
      console.error("JWT Verification Error:", err);
      res.locals.loggedin = false;
      res.locals.username = "";
    }
  } else {
    res.locals.loggedin = false;
    res.locals.username = "";
  }

  next(); // Continue request processing
};
