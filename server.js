const express = require("express");
const multer = require("multer");
const AWS = require("aws-sdk");
const multerS3 = require("multer-s3");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT || 80;

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

app.post("/upload", upload.array("files"), (req, res) => {
  const fileUrls = req.files.map(file => file.location);
  res.json({ fileUrls });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
