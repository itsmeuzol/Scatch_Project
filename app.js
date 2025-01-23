const express = require("express");
const app = express();
const path = require("path");

const db = require("./config/mongoose-connection");
const Owner = require("./models/owner-model");
const Product = require("./models/product-model");
const User = require("./models/user-model");

const ownersRouter = require("./routes/ownersRouter");
const usersRouter = require("./routes/usersRouter");
const ProductsRouter = require("./routes/productsRouter");

const multer = require("multer");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app.use("public", express.static(path.join(__dirname + "/public")));
app.use(express.json());
app.use(cookieParser());
app.set("view engine", "ejs");

app.use("/owners", ownersRouter);
app.use("/users", usersRouter);
app.use("/products", ProductsRouter);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
