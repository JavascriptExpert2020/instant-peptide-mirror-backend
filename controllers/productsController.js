const { Product } = require("../models");

const listProducts = async (req, res) => {
  try {
    const products = await Product.findAll({ order: [["createdAt", "DESC"]] });
    return res.json({ products });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load products." });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    return res.json({ product });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load product." });
  }
};

const getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({ where: { slug: req.params.slug } });
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    return res.json({ product });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load product." });
  }
};

module.exports = {
  listProducts,
  getProductById,
  getProductBySlug,
};
