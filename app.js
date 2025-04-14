const express = require("express");
const app = express();
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const middleware = require("./middlewares/isLoggedIn");

const db = require("./config/mongoose-connection");

const authMiddleware = require("./middlewares/isLoggedIn"); // Import middleware

require("dotenv").config();
const multer = require("multer");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.set("view engine", "ejs");
app.use(authMiddleware); // Apply middleware globally

app.use(
  session({
    secret: process.env.EXPRESS_SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using HTTPS
  })
);

const ownersRouter = require("./routes/ownersRouter");
const usersRouter = require("./routes/usersRouter");
const ProductsRouter = require("./routes/productsRouter");
const staffRouter = require("./routes/staffRouter");
const indexRouter = require("./routes/index");
const doctorRouter = require("./routes/doctorRouter");

app.use(flash());
app.use("/", indexRouter);
app.use("/owners", ownersRouter);
app.use("/users", usersRouter);
app.use("/products", ProductsRouter);
app.use("/doctor", doctorRouter);
app.use("/staff", staffRouter);

app.use((req, res, next) => {
  res.locals.loggedin = req.session.loggedin || false;
  res.locals.username = req.session.username || "";
  next();
});

//index
app.get("/", (req, res) => {
  const error = req.query.error || ""; // Get error from query params, default to an empty string
  res.render("index", { error });
});

app.listen(3000, () => {});
