const express = require("express");
const app = express();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app.use("public", express.static(__dirname + "/public"));
app.use(express.json());
