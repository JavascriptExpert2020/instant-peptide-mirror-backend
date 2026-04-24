const { Sequelize } = require('sequelize');
const loadConfig = require('../helpers/loadConfig');
const userModel = require('./user');
const productModel = require('./product');
const orderModel = require('./order');
const paymentModel = require('./payment');
const downloadModel = require('./download');
const couponModel = require('./coupon');

const environment = process.env.NODE_ENV || 'development';
const config = loadConfig()[environment];

if (!config) {
  throw new Error(`Missing database config for environment: ${environment}`);
}

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config
);

const db = {
  sequelize,
  Sequelize,
  User: userModel(sequelize, Sequelize),
  Product: productModel(sequelize, Sequelize),
  Order: orderModel(sequelize, Sequelize),
  Payment: paymentModel(sequelize, Sequelize),
  Download: downloadModel(sequelize, Sequelize),
  Coupon: couponModel(sequelize, Sequelize),
};

module.exports = db;
