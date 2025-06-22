const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ReportTemplate = sequelize.define('ReportTemplate', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        len: [3, 200]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('monthly', 'quarterly', 'annual', 'custom'),
      allowNull: false,
      defaultValue: 'monthly'
    },
    category: {
      type: DataTypes.ENUM('financial', 'compliance', 'operational', 'regulatory'),
      allowNull: false,
      defaultValue: 'compliance'
    },
    template: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Template structure and configuration'
    },
    schema: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Data schema for the template'
    },
    parameters: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Template parameters and defaults'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this is a default template'
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Template version number'
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    sasraCompliant: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether template meets SASRA requirements'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional template metadata'
    }
  }, {
    tableName: 'report_templates',
    timestamps: true,
    paranoid: true, // Soft deletes
    indexes: [
      {
        name: 'idx_report_templates_type',
        fields: ['type']
      },
      {
        name: 'idx_report_templates_category',
        fields: ['category']
      },
      {
        name: 'idx_report_templates_is_active',
        fields: ['isActive']
      },
      {
        name: 'idx_report_templates_is_default',
        fields: ['isDefault']
      },
      {
        name: 'idx_report_templates_sasra_compliant',
        fields: ['sasraCompliant']
      },
      {
        name: 'idx_report_templates_created_by',
        fields: ['createdBy']
      }
    ],
    hooks: {
      beforeCreate: (template, options) => {
        // Ensure only one default template per type
        if (template.isDefault) {
          return sequelize.models.ReportTemplate.update(
            { isDefault: false },
            {
              where: {
                type: template.type,
                isDefault: true,
                id: { [sequelize.Sequelize.Op.ne]: template.id }
              }
            }
          );
        }
      },
      beforeUpdate: (template, options) => {
        // Ensure only one default template per type
        if (template.changed('isDefault') && template.isDefault) {
          return sequelize.models.ReportTemplate.update(
            { isDefault: false },
            {
              where: {
                type: template.type,
                isDefault: true,
                id: { [sequelize.Sequelize.Op.ne]: template.id }
              }
            }
          );
        }
      }
    }
  });

  // Define associations
  ReportTemplate.associate = (models) => {
    // ReportTemplate belongs to User (creator)
    ReportTemplate.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });

    // ReportTemplate has many Reports
    ReportTemplate.hasMany(models.Report, {
      foreignKey: 'templateId',
      as: 'reports'
    });
  };

  // Instance methods
  ReportTemplate.prototype.isCompatible = function(reportType) {
    return this.type === reportType || this.type === 'custom';
  };

  ReportTemplate.prototype.getParameterValue = function(key, defaultValue = null) {
    return this.parameters && this.parameters[key] !== undefined 
      ? this.parameters[key] 
      : defaultValue;
  };

  ReportTemplate.prototype.validateData = function(data) {
    if (!this.schema) return true;
    
    // Basic schema validation
    for (const [key, config] of Object.entries(this.schema)) {
      if (config.required && !data[key]) {
        throw new Error(`Required field '${key}' is missing`);
      }
      
      if (data[key] && config.type) {
        const actualType = typeof data[key];
        if (actualType !== config.type) {
          throw new Error(`Field '${key}' should be of type '${config.type}', got '${actualType}'`);
        }
      }
    }
    
    return true;
  };

  // Class methods
  ReportTemplate.findByType = function(type) {
    return this.findAll({
      where: { 
        type,
        isActive: true 
      }
    });
  };

  ReportTemplate.findDefault = function(type) {
    return this.findOne({
      where: { 
        type,
        isDefault: true,
        isActive: true 
      }
    });
  };

  ReportTemplate.findSasraCompliant = function() {
    return this.findAll({
      where: { 
        sasraCompliant: true,
        isActive: true 
      }
    });
  };

  ReportTemplate.getStats = async function() {
    const stats = await this.findAll({
      attributes: [
        'type',
        'category',
        'isActive',
        [sequelize.Sequelize.fn('COUNT', sequelize.Sequelize.col('id')), 'count']
      ],
      group: ['type', 'category', 'isActive'],
      raw: true
    });

    return stats;
  };

  return ReportTemplate;
};
