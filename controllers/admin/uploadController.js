const uploadFile = (req, res) => {
  return res.status(201).json({
    url: req.file.location,
    key: req.file.key,
  });
};

module.exports = {
  uploadFile,
};
