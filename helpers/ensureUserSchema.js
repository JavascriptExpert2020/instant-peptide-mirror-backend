const { DataTypes } = require("sequelize");

const ensureUserSchema = async (sequelize) => {
  const queryInterface = sequelize.getQueryInterface();
  const tableName = "users";
  const table = await queryInterface.describeTable(tableName);

  const columnsToAdd = [
    {
      name: "role",
      definition: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "user",
      },
    },
    {
      name: "status",
      definition: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "active",
      },
    },
    {
      name: "ordersCount",
      definition: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      name: "totalSpent",
      definition: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      name: "billingAddress",
      definition: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      name: "shippingAddress",
      definition: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: null,
      },
    },
  ];

  for (const { name, definition } of columnsToAdd) {
    if (!Object.prototype.hasOwnProperty.call(table, name)) {
      // Keep the live table aligned with the model without destructive sync changes.
      await queryInterface.addColumn(tableName, name, definition);
    }
  }
};

module.exports = ensureUserSchema;
