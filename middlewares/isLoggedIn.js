const jwt = require("jsonwebtoken");
const userModel = require("../models/user-model");

module.exports = async (req, res, next) => {
  const token = req.cookies.token;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      const user = await userModel
        .findOne({ email: decoded.email })
        .select("-password");

      if (user) {
        req.user = user; // Attach user to the request object
        res.locals.loggedin = true;
        res.locals.fullname = user.fullname;
        res.locals.avatar = user.avatar;
        res.locals.role = user.role; // Attach user's role to res.locals
      } else {
        res.clearCookie("token");
        res.locals.loggedin = false;
        res.locals.fullname = "";
        res.locals.role = ""; // Clear role if user not found
      }
    } catch (err) {
      console.error("JWT Verification Error:", err);
      res.clearCookie("token");
      res.locals.loggedin = false;
      res.locals.fullname = "";
      res.locals.role = ""; // Clear role on error
    }
  } else {
    res.locals.loggedin = false;
    res.locals.fullname = "";
    res.locals.role = ""; // Clear role if no token
  }

  next();
};
