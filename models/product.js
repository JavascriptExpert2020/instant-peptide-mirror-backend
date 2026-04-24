module.exports = (sequelize, Sequelize) => {
  const Product = sequelize.define(
    'Product',
    {
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      category: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '',
      },
      purity: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      badge: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      images: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      coaUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      variants: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
    },
    {
      tableName: 'products',
    }
  );

  return Product;
};
