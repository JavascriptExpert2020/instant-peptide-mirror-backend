const { Op } = require("sequelize");
const { User } = require("../../models");

const listUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: {
        role: {
          [Op.ne]: "admin",
        },
      },
      order: [["createdAt", "DESC"]],
    });
    return res.json({ users });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load users." });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.role === "admin") {
      return res.status(403).json({ message: "Admin users cannot be updated here." });
    }

    await user.update({ status: req.body?.status || user.status });
    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update user." });
  }
};

module.exports = {
  listUsers,
  updateUser,
};
