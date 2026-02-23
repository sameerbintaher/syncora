const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

module.exports = async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  global.__MONGOD__ = mongod;
};
