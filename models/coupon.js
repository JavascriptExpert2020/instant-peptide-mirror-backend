module.exports = (sequelize, Sequelize) => {
  const Coupon = sequelize.define(
    'Coupon',
    {
      code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'percentage',
      },
      value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      minOrder: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      maxUses: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      usedCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      expiresAt: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'coupons',
    }
  );

  return Coupon;
};
