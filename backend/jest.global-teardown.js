const mongoose = require('mongoose');

module.exports = async () => {
  await mongoose.connection.close();
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();
  }
};
