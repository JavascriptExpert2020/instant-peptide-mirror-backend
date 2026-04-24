const dotenv = require("dotenv");
dotenv.config();

const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_S3_BUCKET || "iphcstorage",
    acl: "public-read",
    cacheControl: "max-age=31536000",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata(req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key(req, file, cb) {
      const folder = String(req.query.type || "uploads").replace(/^\/+/, "");
      const name = file.originalname.replace(/\s+/g, "-");
      cb(null, `${folder}/${Date.now()}-${name}`);
    },
  }),
});

module.exports = upload;
