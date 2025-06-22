// backend/config/db.js
const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables

// Option 1: Using a connection URI (recommended for simplicity with Render/Heroku)
// const sequelize = new Sequelize(process.env.DATABASE_URL, {
//   dialect: 'postgres',
//   logging: false, // Set to true to see SQL queries in console
//   dialectOptions: {
//     ssl: {
//       require: true,
//       rejectUnauthorized: false // IMPORTANT for Render/Heroku with self-signed certs
//     }
//   }
// });

// Option 2: Using individual connection parameters (easier for local development initially)
const sequelize = new Sequelize(
  process.env.DB_NAME || 'sasra_reporting',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false, // Set to true to see SQL queries in console
    pool: { // Connection pooling settings
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);


const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL database connected successfully!');

    // Optional: Sync models with the database (create tables if they don't exist)
    // This is good for development, but manage migrations for production
    // await sequelize.sync({ alter: true }); // Use alter: true carefully in production
    // console.log('Database models synchronized.');

  } catch (error) {
    console.error('Unable to connect to the database:', error.message);
    console.log('⚠️  Running in development mode without database connection.');
    console.log('📝 To set up the database, create a .env file with:');
    console.log('   DB_HOST=localhost');
    console.log('   DB_PORT=5432');
    console.log('   DB_NAME=sasra_reporting');
    console.log('   DB_USER=your_username');
    console.log('   DB_PASSWORD=your_password');
    // Don't exit the process, just log the error
    // process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;
// You might also export sequelize instance for models:
// module.exports = { connectDB, sequelize };