const jwt = require("jsonwebtoken");
const userModel = require("../models/user-model");

module.exports = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    req.flash("error", "Please login first");
    return res.redirect("/");
  }
  try {
    let decoded = jwt.verify(token, process.env.JWT_KEY);
    let user = await userModel
      .findOne({ email: decoded.email })
      .select("-password");
    req.user = user;
    next();
  } catch (err) {
    req.flash("error", "Something went wrong");
    res.redirect("/");
  }
};
