require('dotenv').config();

const app = require('./app');
const { sequelize } = require('./models');
const ensureUserSchema = require('./helpers/ensureUserSchema');
const ensureOrderSchema = require('./helpers/ensureOrderSchema');

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    await ensureUserSchema(sequelize);
    await ensureOrderSchema(sequelize);
    console.log('Database connection established.');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();
