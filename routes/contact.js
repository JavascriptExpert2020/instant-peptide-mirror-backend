const router = require("express").Router();
const { submitContactForm } = require("../controllers/contactController");

router.post("/", submitContactForm);

module.exports = router;
