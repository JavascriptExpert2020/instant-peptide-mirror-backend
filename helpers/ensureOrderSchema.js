const { DataTypes } = require("sequelize");

const ensureOrderSchema = async (sequelize) => {
  const queryInterface = sequelize.getQueryInterface();
  const tableName = "orders";
  const table = await queryInterface.describeTable(tableName);

  const columnsToAdd = [
    {
      name: "userId",
      definition: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      name: "shippingMethod",
      definition: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      name: "shippingRateId",
      definition: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      name: "shippingRateProvider",
      definition: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      name: "shippingRateService",
      definition: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      name: "shippingRateEta",
      definition: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      name: "shippingAddressData",
      definition: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      name: "shippingFee",
      definition: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      name: "deliveryGuaranteeFee",
      definition: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      name: "tax",
      definition: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      name: "shippoShipmentId",
      definition: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      name: "shippoShipmentStatus",
      definition: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      name: "shippoShipmentData",
      definition: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      name: "shippoShipmentError",
      definition: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      name: "shippoOrderId",
      definition: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      name: "shippoOrderStatus",
      definition: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      name: "shippoOrderData",
      definition: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      name: "shippoOrderError",
      definition: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
  ];

  for (const { name, definition } of columnsToAdd) {
    if (!Object.prototype.hasOwnProperty.call(table, name)) {
      await queryInterface.addColumn(tableName, name, definition);
    }
  }
};

module.exports = ensureOrderSchema;
