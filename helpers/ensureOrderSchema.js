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
  ];

  for (const { name, definition } of columnsToAdd) {
    if (!Object.prototype.hasOwnProperty.call(table, name)) {
      await queryInterface.addColumn(tableName, name, definition);
    }
  }
};

module.exports = ensureOrderSchema;
