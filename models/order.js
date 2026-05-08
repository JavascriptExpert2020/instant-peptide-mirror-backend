module.exports = (sequelize, Sequelize) => {
  const Order = sequelize.define(
    'Order',
    {
      orderNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      customer: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      items: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      shippingMethod: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      shippingRateId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      shippingRateProvider: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      shippingRateService: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      shippingRateEta: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      shippingAddressData: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
      },
      shippingFee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      deliveryGuaranteeFee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      tax: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pending',
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      shippingAddress: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '',
      },
      couponCode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      discount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      shippoShipmentId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      shippoShipmentStatus: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      shippoShipmentData: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
      },
      shippoShipmentError: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'orders',
    }
  );

  return Order;
};
