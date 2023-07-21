const express = require("express");
const multer = require("multer");
const AWS = require("aws-sdk");
const multerS3 = require("multer-s3");
const dotenv = require("dotenv");
const session = require('express-session');
const cookieParser = require('cookie-parser');

dotenv.config();

const app = express();
const port = process.env.PORT || 80;

// Middleware for sessions and cookies
app.use(cookieParser());
app.use(session({
  secret: process.env.APP_SECRET_KEY, // Replace with a secret key for session encryption
  resave: false,
  saveUninitialized: true,
}));

// Middleware to check authentication status and redirect if not logged in
function checkAuth(req, res, next) {
  console.log(req);
  if (!req.session.authenticated) {
    res.redirect('/login.html');
  } else {
    next();
  }
}

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET_NAME,
    // Remove the 'acl' option to use default bucket permissions
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + "-" + file.originalname);
    },
  }),
});

app.use(express.static("public"));

// Login route
app.post("/login", express.json(), (req, res) => {
  const { username, password } = req.body;
  if ((username === process.env.LOGIN_USERNAME) && (password === process.env.LOGIN_PASSWORD)) {
    // Login successful, set session cookie for authentication
    req.session.authenticated = true;
    res.json({ success: true });
  } else {
    // Login failed
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// Logout route
app.get('/logout', (req, res) => {
  // Clear session and logout user
  req.session.authenticated = false;
  res.sendStatus(200);
});

// Check authentication status
app.get('/checkAuth', (req, res) => {
  res.json({ authenticated: req.session.authenticated || false });
});

// Redirect to login.html if not logged in
app.get("/index.html", checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/upload", checkAuth, upload.array("files"), (req, res) => {
  const fileUrls = req.files.map((file) => file.location);
  res.json({ fileUrls });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
