const router = require("express").Router();
const { listProducts, getProductById, getProductBySlug } = require("../controllers/productsController");

router.get("/", listProducts);
router.get("/slug/:slug", getProductBySlug);
router.get("/:id", getProductById);

module.exports = router;
