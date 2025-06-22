const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [2, 100]
      }
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [2, 100]
      }
    },
    role: {
      type: DataTypes.ENUM('user', 'manager', 'admin'),
      allowNull: false,
      defaultValue: 'user'
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    position: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: /^[\+]?[1-9][\d]{0,15}$/
      }
    },
    avatar: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'URL to user avatar image'
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    emailVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    passwordResetToken: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    preferences: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'User preferences and settings'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional user metadata'
    }
  }, {
    tableName: 'users',
    timestamps: true,
    paranoid: true, // Soft deletes
    indexes: [
      {
        name: 'idx_users_email',
        fields: ['email'],
        unique: true
      },
      {
        name: 'idx_users_role',
        fields: ['role']
      },
      {
        name: 'idx_users_department',
        fields: ['department']
      },
      {
        name: 'idx_users_is_active',
        fields: ['isActive']
      },
      {
        name: 'idx_users_last_login',
        fields: ['lastLogin']
      }
    ],
    hooks: {
      beforeCreate: async (user, options) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user, options) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });

  // Define associations
  User.associate = (models) => {
    // User has many Reports (as creator)
    User.hasMany(models.Report, {
      foreignKey: 'generatedBy',
      as: 'createdReports'
    });

    // User has many Reports (as approver)
    User.hasMany(models.Report, {
      foreignKey: 'approvedBy',
      as: 'approvedReports'
    });

    // User has many ReportTemplates
    User.hasMany(models.ReportTemplate, {
      foreignKey: 'createdBy',
      as: 'createdTemplates'
    });
  };

  // Instance methods
  User.prototype.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };

  User.prototype.getFullName = function() {
    return `${this.firstName} ${this.lastName}`;
  };

  User.prototype.hasRole = function(role) {
    return this.role === role;
  };

  User.prototype.hasAnyRole = function(roles) {
    return roles.includes(this.role);
  };

  User.prototype.isAdmin = function() {
    return this.role === 'admin';
  };

  User.prototype.isManager = function() {
    return this.role === 'manager' || this.role === 'admin';
  };

  User.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    delete values.password;
    delete values.passwordResetToken;
    delete values.passwordResetExpires;
    return values;
  };

  // Class methods
  User.findByEmail = function(email) {
    return this.findOne({
      where: { email: email.toLowerCase() }
    });
  };

  User.findActive = function() {
    return this.findAll({
      where: { isActive: true }
    });
  };

  User.findByRole = function(role) {
    return this.findAll({
      where: { role }
    });
  };

  User.getStats = async function() {
    const stats = await this.findAll({
      attributes: [
        'role',
        'isActive',
        [sequelize.Sequelize.fn('COUNT', sequelize.Sequelize.col('id')), 'count']
      ],
      group: ['role', 'isActive'],
      raw: true
    });

    return stats;
  };

  return User;
};
