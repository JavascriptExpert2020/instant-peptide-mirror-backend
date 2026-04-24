const adminHome = (req, res) => {
  res.status(200).json({ message: "Admin API is running" });
};

module.exports = {
  adminHome,
};
