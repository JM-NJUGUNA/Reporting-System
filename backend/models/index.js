const { Sequelize } = require('sequelize');
const path = require('path');

// Database configuration
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sacco_reporting',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
});

// Import models
const User = require('./User')(sequelize);
const Report = require('./Report')(sequelize);
const ReportTemplate = require('./ReportTemplate')(sequelize);

// Define associations
const models = {
  User,
  Report,
  ReportTemplate
};

// Set up associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Database connection and sync
const initializeDatabase = async () => {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Sync models with database
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database models synchronized.');
    } else {
      await sequelize.sync();
      console.log('✅ Database models synchronized (production mode).');
    }

    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Seed data function
const seedDatabase = async () => {
  try {
    // Check if admin user exists
    const adminExists = await User.findOne({
      where: { email: 'admin@sacco.com' }
    });

    if (!adminExists) {
      // Create admin user
      await User.create({
        email: 'admin@sacco.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        department: 'IT',
        position: 'System Administrator',
        isActive: true,
        emailVerified: true
      });

      // Create manager user
      await User.create({
        email: 'manager@sacco.com',
        password: 'password123',
        firstName: 'Manager',
        lastName: 'User',
        role: 'manager',
        department: 'Operations',
        position: 'Operations Manager',
        isActive: true,
        emailVerified: true
      });

      console.log('✅ Seed data created successfully.');
    } else {
      console.log('ℹ️  Seed data already exists, skipping...');
    }
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
  }
};

// Export models and database utilities
module.exports = {
  sequelize,
  Sequelize,
  User,
  Report,
  ReportTemplate,
  initializeDatabase,
  seedDatabase
};
