const fs = require('fs').promises;
const path = require('path');

class AuditLogger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.auditFile = path.join(this.logDir, 'audit.log');
    this.errorFile = path.join(this.logDir, 'errors.log');
    this.ensureLogDirectory();
  }

  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  formatLogEntry(level, message, data = {}) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...data
    };
  }

  async writeToFile(filePath, entry) {
    try {
      const logEntry = JSON.stringify(entry) + '\n';
      await fs.appendFile(filePath, logEntry);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  // Log user authentication events
  logAuthEvent(userId, email, action, success, details = {}) {
    const entry = this.formatLogEntry('AUTH', `${action} ${success ? 'SUCCESS' : 'FAILED'}`, {
      userId,
      email,
      action,
      success,
      ip: details.ip,
      userAgent: details.userAgent,
      ...details
    });
    
    this.writeToFile(this.auditFile, entry);
  }

  // Log report generation events
  logReportEvent(userId, reportId, action, details = {}) {
    const entry = this.formatLogEntry('REPORT', `Report ${action}`, {
      userId,
      reportId,
      action,
      reportType: details.type,
      reportTitle: details.title,
      ...details
    });
    
    this.writeToFile(this.auditFile, entry);
  }

  // Log data access events
  logDataAccess(userId, resource, action, details = {}) {
    const entry = this.formatLogEntry('ACCESS', `Data ${action}`, {
      userId,
      resource,
      action,
      ...details
    });
    
    this.writeToFile(this.auditFile, entry);
  }

  // Log system configuration changes
  logConfigChange(userId, configKey, oldValue, newValue, details = {}) {
    const entry = this.formatLogEntry('CONFIG', 'Configuration changed', {
      userId,
      configKey,
      oldValue,
      newValue,
      ...details
    });
    
    this.writeToFile(this.auditFile, entry);
  }

  // Log compliance-related events
  logComplianceEvent(userId, complianceType, action, details = {}) {
    const entry = this.formatLogEntry('COMPLIANCE', `Compliance ${action}`, {
      userId,
      complianceType,
      action,
      ...details
    });
    
    this.writeToFile(this.auditFile, entry);
  }

  // Log errors
  logError(error, req = null, details = {}) {
    const entry = this.formatLogEntry('ERROR', error.message, {
      error: error.stack,
      userId: req?.user?.id,
      ip: req?.ip,
      userAgent: req?.get('User-Agent'),
      url: req?.originalUrl,
      method: req?.method,
      ...details
    });
    
    this.writeToFile(this.errorFile, entry);
  }

  // Log API requests for monitoring
  logApiRequest(req, res, duration) {
    const entry = this.formatLogEntry('API', `${req.method} ${req.originalUrl}`, {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
    
    this.writeToFile(this.auditFile, entry);
  }

  // Log file operations
  logFileOperation(userId, fileName, operation, details = {}) {
    const entry = this.formatLogEntry('FILE', `File ${operation}`, {
      userId,
      fileName,
      operation,
      fileSize: details.size,
      fileType: details.type,
      ...details
    });
    
    this.writeToFile(this.auditFile, entry);
  }

  // Get audit logs with filtering
  async getAuditLogs(filters = {}) {
    try {
      const content = await fs.readFile(this.auditFile, 'utf8');
      const lines = content.trim().split('\n');
      
      let logs = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      }).filter(log => log !== null);

      // Apply filters
      if (filters.level) {
        logs = logs.filter(log => log.level === filters.level);
      }
      
      if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId);
      }
      
      if (filters.startDate) {
        logs = logs.filter(log => new Date(log.timestamp) >= new Date(filters.startDate));
      }
      
      if (filters.endDate) {
        logs = logs.filter(log => new Date(log.timestamp) <= new Date(filters.endDate));
      }

      return logs;
    } catch (error) {
      console.error('Failed to read audit logs:', error);
      return [];
    }
  }

  // Generate compliance report from audit logs
  async generateComplianceReport(startDate, endDate) {
    try {
      const logs = await this.getAuditLogs({ startDate, endDate });
      
      const report = {
        period: { startDate, endDate },
        totalEvents: logs.length,
        authEvents: logs.filter(log => log.level === 'AUTH').length,
        reportEvents: logs.filter(log => log.level === 'REPORT').length,
        accessEvents: logs.filter(log => log.level === 'ACCESS').length,
        configChanges: logs.filter(log => log.level === 'CONFIG').length,
        complianceEvents: logs.filter(log => log.level === 'COMPLIANCE').length,
        errors: logs.filter(log => log.level === 'ERROR').length,
        uniqueUsers: [...new Set(logs.map(log => log.userId).filter(Boolean))].length
      };

      return report;
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      return null;
    }
  }
}

module.exports = new AuditLogger();
