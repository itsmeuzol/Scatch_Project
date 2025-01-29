const express = require("express");
const app = express();
const path = require("path");
const expressSession = require("express-session");
const flash = require("connect-flash");

const db = require("./config/mongoose-connection");
const Owner = require("./models/owner-model");
const Product = require("./models/product-model");
const User = require("./models/user-model");

const ownersRouter = require("./routes/ownersRouter");
const usersRouter = require("./routes/usersRouter");
const ProductsRouter = require("./routes/productsRouter");
const indexRouter = require("./routes/index");

require("dotenv").config();
const multer = require("multer");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app.use("public", express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set("view engine", "ejs");

app.use(
  expressSession({
    secret: process.env.EXPRESS_SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
  })
);
app.use(flash());
app.use("/", indexRouter);
app.use("/owners", ownersRouter);
app.use("/users", usersRouter);
app.use("/products", ProductsRouter);

//index
app.get("/", (req, res) => {
  const error = req.query.error || ""; // Get error from query params, default to an empty string
  res.render("index", { error });
});

app.listen(3000, () => {});
