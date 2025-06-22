const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Report = sequelize.define('Report', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        len: [5, 200]
      }
    },
    type: {
      type: DataTypes.ENUM('monthly', 'quarterly', 'annual', 'custom'),
      allowNull: false,
      defaultValue: 'monthly'
    },
    status: {
      type: DataTypes.ENUM('pending', 'generating', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Report data and metrics'
    },
    templateId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'ReportTemplates',
        key: 'id'
      }
    },
    fileUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Path to generated report file'
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'File size in bytes'
    },
    generatedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    approvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    complianceScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    sasraSubmissionId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'SASRA submission reference ID'
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Report due date for compliance'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional metadata for the report'
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Report version number'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'reports',
    timestamps: true,
    paranoid: true, // Soft deletes
    indexes: [
      {
        name: 'idx_reports_type',
        fields: ['type']
      },
      {
        name: 'idx_reports_status',
        fields: ['status']
      },
      {
        name: 'idx_reports_generated_by',
        fields: ['generatedBy']
      },
      {
        name: 'idx_reports_created_at',
        fields: ['createdAt']
      },
      {
        name: 'idx_reports_due_date',
        fields: ['dueDate']
      },
      {
        name: 'idx_reports_compliance_score',
        fields: ['complianceScore']
      }
    ],
    hooks: {
      beforeCreate: (report, options) => {
        // Set due date if not provided and type is monthly/quarterly
        if (!report.dueDate) {
          const now = new Date();
          switch (report.type) {
            case 'monthly':
              report.dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 15);
              break;
            case 'quarterly':
              const quarter = Math.floor(now.getMonth() / 3);
              report.dueDate = new Date(now.getFullYear(), (quarter + 1) * 3, 30);
              break;
            case 'annual':
              report.dueDate = new Date(now.getFullYear() + 1, 2, 31); // March 31st next year
              break;
          }
        }
      }
    }
  });

  // Define associations
  Report.associate = (models) => {
    // Report belongs to User (creator)
    Report.belongsTo(models.User, {
      foreignKey: 'generatedBy',
      as: 'creator'
    });

    // Report belongs to User (approver)
    Report.belongsTo(models.User, {
      foreignKey: 'approvedBy',
      as: 'approver'
    });

    // Report belongs to ReportTemplate
    Report.belongsTo(models.ReportTemplate, {
      foreignKey: 'templateId',
      as: 'reportTemplate'
    });
  };

  // Instance methods
  Report.prototype.isOverdue = function() {
    return this.dueDate && new Date() > this.dueDate && this.status !== 'completed';
  };

  Report.prototype.canBeEdited = function() {
    return ['pending', 'failed'].includes(this.status);
  };

  Report.prototype.canBeApproved = function() {
    return this.status === 'completed' && !this.approvedBy;
  };

  Report.prototype.canBeSubmitted = function() {
    return this.status === 'completed' && this.approvedBy && !this.submittedAt;
  };

  // Class methods
  Report.findOverdue = function() {
    return this.findAll({
      where: {
        dueDate: {
          [sequelize.Sequelize.Op.lt]: new Date()
        },
        status: {
          [sequelize.Sequelize.Op.ne]: 'completed'
        }
      }
    });
  };

  Report.findByComplianceScore = function(minScore) {
    return this.findAll({
      where: {
        complianceScore: {
          [sequelize.Sequelize.Op.gte]: minScore
        }
      }
    });
  };

  Report.getStats = async function() {
    const stats = await this.findAll({
      attributes: [
        'type',
        'status',
        [sequelize.Sequelize.fn('COUNT', sequelize.Sequelize.col('id')), 'count'],
        [sequelize.Sequelize.fn('AVG', sequelize.Sequelize.col('complianceScore')), 'avgComplianceScore']
      ],
      group: ['type', 'status'],
      raw: true
    });

    return stats;
  };

  return Report;
}; 