const { Product } = require("../../models");

const toSlug = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

const listProducts = async (req, res) => {
  try {
    const products = await Product.findAll({ order: [["createdAt", "DESC"]] });
    return res.json({ products });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load products." });
  }
};

const createProduct = async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || "").trim();
    const coaUrl = String(body.coaUrl || "").trim();

    if (!name) {
      return res.status(400).json({ message: "Product name is required." });
    }

    if (!coaUrl) {
      return res.status(400).json({ message: "COA is required to create a product." });
    }

    const product = await Product.create({
      name,
      slug: toSlug(body.slug || name),
      category: String(body.category || "").trim(),
      description: String(body.description || "").trim(),
      purity: body.purity ? String(body.purity).trim() : null,
      badge: body.badge ? String(body.badge).trim() : null,
      images: Array.isArray(body.images) ? body.images : [],
      coaUrl,
      variants: Array.isArray(body.variants) ? body.variants : [],
    });

    return res.status(201).json({ product });
  } catch (error) {
    return res.status(500).json({ message: "Unable to create product." });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const body = req.body || {};
    const name = String(body.name || product.name).trim();

    await product.update({
      name,
      slug: toSlug(body.slug || name),
      category: String(body.category || product.category).trim(),
      description: String(body.description || product.description).trim(),
      purity: body.purity ?? product.purity,
      badge: body.badge ?? product.badge,
      images: Array.isArray(body.images) ? body.images : product.images,
      coaUrl: body.coaUrl ?? product.coaUrl,
      variants: Array.isArray(body.variants) ? body.variants : product.variants,
    });

    return res.json({ product });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update product." });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const deleted = await Product.destroy({ where: { id: req.params.id } });
    if (!deleted) {
      return res.status(404).json({ message: "Product not found." });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: "Unable to delete product." });
  }
};

module.exports = {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};
