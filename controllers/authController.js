const express = require("express");
const router = express.Router();
const userModel = require("../models/user-model");
const productModel = require("../models/product-model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookie = require("cookie-parser");
const { generateToken } = require("../utils/generateToken");

module.exports.registerUser = async (req, res) => {
  try {
    let { email, fullname, password } = req.body;
    let user = await userModel.findOne({ email: email });
    if (user) {
      req.flash("error", "You already have an account, please login.");
      return res.redirect("/");
    }
    if (!email || !fullname || !password) {
      return res.status(401).send("please fill all the details");
    }
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(password, salt, async (err, hash) => {
        if (err) {
          return res.status(500).send(err);
        } else {
          password = hash;
          let user = await userModel.create({ email, fullname, password });
          const token = generateToken(user);
          res.cookie("token", token), res.send("user created successfully");
        }
      });
    });
  } catch (err) {
    res.send(err.message);
  }
};

module.exports.loginUser = async (req, res) => {
  try {
    let { email, password } = req.body;
    let user = await userModel.findOne({ email: email });
    if (user) {
      bcrypt.compare(password, user.password, async (err, result) => {
        if (result) {
          const token = generateToken(user);
          res.cookie("token", token);
          return res.redirect("/shop");
        } else {
          req.flash("error", "Email or password is incorrect!");
          return res.redirect("/");
        }
      });
    } else {
      req.flash("error", "Email or password is incorrect!");
      return res.redirect("/");
    }
  } catch (err) {
    res.send(err.message);
  }
};

module.exports.logout = async (req, res) => {
  try {
    res.cookie("token", "");
    res.redirect("/");
  } catch (err) {
    res.send(err.message);
  }
};
