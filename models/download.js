module.exports = (sequelize, Sequelize) => {
  const Download = sequelize.define(
    "Download",
    {
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      productId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      productName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      productSlug: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      coaUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "coa",
      },
    },
    {
      tableName: "downloads",
      updatedAt: false,
    },
  );

  return Download;
};
