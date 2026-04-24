const healthCheck = (req, res) => {
  res.status(200).json({ message: 'API is running' });
};

module.exports = {
  healthCheck,
};
