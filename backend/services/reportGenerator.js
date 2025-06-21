const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const puppeteer = require('puppeteer');
const { Report, ReportTemplate } = require('../models');
const { io } = require('../app'); // Socket.io instance

class ReportGenerator {
  constructor() {
    this.browser = null;
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  async generateReport(reportId) {
    try {
      const report = await Report.findByPk(reportId, {
        include: [{ model: ReportTemplate, as: 'template' }]
      });

      if (!report) {
        throw new Error('Report not found');
      }

      // Update status to processing
      await report.update({ 
        status: 'processing',
        startedAt: new Date()
      });

      // Emit status update via WebSocket
      io.emit('reportStatusUpdate', {
        reportId: report.id,
        status: 'processing',
        message: 'Report generation started'
      });

      let result;
      switch (report.type) {
        case 'financial':
          result = await this.generateFinancialReport(report);
          break;
        case 'compliance':
          result = await this.generateComplianceReport(report);
          break;
        case 'operational':
          result = await this.generateOperationalReport(report);
          break;
        case 'custom':
          result = await this.generateCustomReport(report);
          break;
        default:
          throw new Error(`Unsupported report type: ${report.type}`);
      }

      // Update report with results
      await report.update({
        status: 'completed',
        completedAt: new Date(),
        outputFile: result.filePath,
        metadata: JSON.stringify(result.metadata)
      });

      // Emit completion status
      io.emit('reportStatusUpdate', {
        reportId: report.id,
        status: 'completed',
        message: 'Report generated successfully',
        downloadUrl: `/api/reports/${report.id}/download`
      });

      return result;
    } catch (error) {
      console.error(`Report generation failed for ID ${reportId}:`, error);
      
      // Update report status to failed
      if (reportId) {
        await Report.update(
          { 
            status: 'failed',
            errorMessage: error.message,
            completedAt: new Date()
          },
          { where: { id: reportId } }
        );

        // Emit failure status
        io.emit('reportStatusUpdate', {
          reportId,
          status: 'failed',
          message: error.message
        });
      }

      throw error;
    }
  }

  async generateFinancialReport(report) {
    const parameters = JSON.parse(report.parameters || '{}');
    const { dateFrom, dateTo, institutions, metrics } = parameters;

    // Simulate data processing
    const data = await this.fetchFinancialData(dateFrom, dateTo, institutions);
    
    // Generate Excel report
    const workbook = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = this.processSummaryData(data, metrics);
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Detailed data sheet
    const detailSheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detailed Data');

    // Charts sheet (placeholder)
    const chartsData = [
      { Metric: 'Total Assets', Value: data.reduce((sum, item) => sum + item.assets, 0) },
      { Metric: 'Total Liabilities', Value: data.reduce((sum, item) => sum + item.liabilities, 0) },
      { Metric: 'Net Worth', Value: data.reduce((sum, item) => sum + (item.assets - item.liabilities), 0) }
    ];
    const chartsSheet = XLSX.utils.json_to_sheet(chartsData);
    XLSX.utils.book_append_sheet(workbook, chartsSheet, 'Key Metrics');

    // Save Excel file
    const fileName = `financial_report_${report.id}_${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, '../reports/', fileName);
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(filePath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    XLSX.writeFile(workbook, filePath);

    // Generate PDF version
    const pdfPath = await this.generatePDFFromData(report, data, summaryData);

    return {
      filePath: pdfPath,
      excelPath: filePath,
      metadata: {
        recordCount: data.length,
        generatedAt: new Date().toISOString(),
        parameters: parameters,
        fileSize: fs.statSync(pdfPath).size
      }
    };
  }

  async generateComplianceReport(report) {
    const parameters = JSON.parse(report.parameters || '{}');
    const { reportingPeriod, regulations, institutions } = parameters;

    // Fetch compliance data
    const complianceData = await this.fetchComplianceData(reportingPeriod, regulations, institutions);
    
    // Process compliance checks
    const complianceResults = this.processComplianceChecks(complianceData, regulations);

    // Generate HTML template for PDF
    const htmlContent = this.generateComplianceHTML(report, complianceResults);
    
    // Convert to PDF
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    
    const fileName = `compliance_report_${report.id}_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, '../reports/', fileName);
    
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1in',
        right: '1in',
        bottom: '1in',
        left: '1in'
      }
    });

    await page.close();

    return {
      filePath,
      metadata: {
        complianceScore: complianceResults.overallScore,
        violations: complianceResults.violations.length,
        generatedAt: new Date().toISOString(),
        parameters: parameters
      }
    };
  }

  async generateOperationalReport(report) {
    const parameters = JSON.parse(report.parameters || '{}');
    
    // Generate operational metrics report
    const operationalData = await this.fetchOperationalData(parameters);
    
    // Create comprehensive Excel report
    const workbook = XLSX.utils.book_new();
    
    // Performance metrics
    const performanceSheet = XLSX.utils.json_to_sheet(operationalData.performance);
    XLSX.utils.book_append_sheet(workbook, performanceSheet, 'Performance');
    
    // Risk metrics
    const riskSheet = XLSX.utils.json_to_sheet(operationalData.risks);
    XLSX.utils.book_append_sheet(workbook, riskSheet, 'Risk Assessment');
    
    // Recommendations
    const recommendationsSheet = XLSX.utils.json_to_sheet(operationalData.recommendations);
    XLSX.utils.book_append_sheet(workbook, recommendationsSheet, 'Recommendations');

    const fileName = `operational_report_${report.id}_${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, '../reports/', fileName);
    
    XLSX.writeFile(workbook, filePath);

    return {
      filePath,
      metadata: {
        metricsCount: operationalData.performance.length,
        riskCount: operationalData.risks.length,
        recommendationsCount: operationalData.recommendations.length,
        generatedAt: new Date().toISOString()
      }
    };
  }

  async generateCustomReport(report) {
    const parameters = JSON.parse(report.parameters || '{}');
    const template = report.template;

    if (!template) {
      throw new Error('Custom report requires a template');
    }

    // Process custom template
    const templateConfig = JSON.parse(template.configuration);
    const data = await this.fetchCustomData(templateConfig.dataSources, parameters);
    
    // Apply template transformations
    const processedData = this.applyTemplateTransformations(data, templateConfig.transformations);
    
    // Generate output based on template format
    let filePath;
    if (templateConfig.outputFormat === 'pdf') {
      filePath = await this.generatePDFFromTemplate(report, processedData, templateConfig);
    } else {
      filePath = await this.generateExcelFromTemplate(report, processedData, templateConfig);
    }

    return {
      filePath,
      metadata: {
        templateId: template.id,
        recordCount: processedData.length,
        generatedAt: new Date().toISOString(),
        parameters: parameters
      }
    };
  }

  // Helper methods for data fetching (these would connect to actual data sources)
  async fetchFinancialData(dateFrom, dateTo, institutions) {
    // Simulate fetching financial data
    const mockData = [];
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    
    institutions.forEach(institution => {
      for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
        mockData.push({
          institution: institution,
          date: d.toISOString().split('T')[0],
          assets: Math.random() * 1000000 + 500000,
          liabilities: Math.random() * 800000 + 400000,
          deposits: Math.random() * 900000 + 300000,
          loans: Math.random() * 700000 + 200000,
          revenue: Math.random() * 100000 + 50000,
          expenses: Math.random() * 80000 + 40000
        });
      }
    });

    return mockData;
  }

  async fetchComplianceData(period, regulations, institutions) {
    // Simulate compliance data
    return {
      period,
      regulations,
      institutions,
      checks: regulations.map(reg => ({
        regulation: reg,
        status: Math.random() > 0.2 ? 'compliant' : 'violation',
        details: `Compliance check for ${reg}`,
        severity: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low'
      }))
    };
  }

  async fetchOperationalData(parameters) {
    return {
      performance: [
        { metric: 'System Uptime', value: '99.9%', target: '99.5%', status: 'Good' },
        { metric: 'Processing Time', value: '2.3s', target: '<3s', status: 'Good' },
        { metric: 'Error Rate', value: '0.1%', target: '<0.5%', status: 'Excellent' }
      ],
      risks: [
        { risk: 'Liquidity Risk', level: 'Medium', mitigation: 'Increase reserves' },
        { risk: 'Credit Risk', level: 'Low', mitigation: 'Continue monitoring' }
      ],
      recommendations: [
        { area: 'Performance', recommendation: 'Optimize database queries' },
        { area: 'Security', recommendation: 'Update authentication protocols' }
      ]
    };
  }

  async fetchCustomData(dataSources, parameters) {
    // This would integrate with various data sources
    return [
      { id: 1, name: 'Sample Data 1', value: 100 },
      { id: 2, name: 'Sample Data 2', value: 200 }
    ];
  }

  // PDF generation helpers
  async generatePDFFromData(report, data, summaryData) {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .summary-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .summary-table th, .summary-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          .summary-table th { background-color: #f2f2f2; }
          .chart-placeholder { height: 200px; background: #f9f9f9; border: 1px solid #ddd; margin: 20px 0; text-align: center; line-height: 200px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SASRA Financial Report</h1>
          <h2>${report.title}</h2>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="summary">
          <h3>Executive Summary</h3>
          <table class="summary-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Previous Period</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              ${summaryData.map(item => `
                <tr>
                  <td>${item.metric}</td>
                  <td>${item.value}</td>
                  <td>${item.previous || 'N/A'}</td>
                  <td>${item.change || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="chart-placeholder">
          [Chart visualization would be rendered here]
        </div>
        
        <div class="footer">
          <p>This report was generated automatically by SASRA Reporting System</p>
        </div>
      </body>
      </html>
    `;

    const browser = await this.initBrowser();
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    
    const fileName = `financial_report_${report.id}_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, '../reports/', fileName);
    
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' }
    });

    await page.close();
    return filePath;
  }

  generateComplianceHTML(report, complianceResults) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .compliance-score { font-size: 24px; font-weight: bold; color: ${complianceResults.overallScore > 80 ? 'green' : complianceResults.overallScore > 60 ? 'orange' : 'red'}; }
          .violations-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .violations-table th, .violations-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          .violations-table th { background-color: #f2f2f2; }
          .high-severity { background-color: #ffebee; }
          .medium-severity { background-color: #fff3e0; }
          .low-severity { background-color: #e8f5e8; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SASRA Compliance Report</h1>
          <h2>${report.title}</h2>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          <div class="compliance-score">Overall Compliance Score: ${complianceResults.overallScore}%</div>
        </div>
        
        <div class="violations">
          <h3>Compliance Issues</h3>
          <table class="violations-table">
            <thead>
              <tr>
                <th>Regulation</th>
                <th>Status</th>
                <th>Severity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${complianceResults.violations.map(violation => `
                <tr class="${violation.severity}-severity">
                  <td>${violation.regulation}</td>
                  <td>${violation.status}</td>
                  <td>${violation.severity.toUpperCase()}</td>
                  <td>${violation.details}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;
  }

  processSummaryData(data, metrics) {
    const summary = [];
    
    if (metrics.includes('assets')) {
      const totalAssets = data.reduce((sum, item) => sum + item.assets, 0);
      summary.push({
        metric: 'Total Assets',
        value: this.formatCurrency(totalAssets),
        previous: this.formatCurrency(totalAssets * 0.95), // Mock previous value
        change: '+5%'
      });
    }

    if (metrics.includes('liabilities')) {
      const totalLiabilities = data.reduce((sum, item) => sum + item.liabilities, 0);
      summary.push({
        metric: 'Total Liabilities',
        value: this.formatCurrency(totalLiabilities),
        previous: this.formatCurrency(totalLiabilities * 1.02), // Mock previous value
        change: '-2%'
      });
    }

    if (metrics.includes('netWorth')) {
      const totalAssets = data.reduce((sum, item) => sum + item.assets, 0);
      const totalLiabilities = data.reduce((sum, item) => sum + item.liabilities, 0);
      const netWorth = totalAssets - totalLiabilities;
      summary.push({
        metric: 'Net Worth',
        value: this.formatCurrency(netWorth),
        previous: this.formatCurrency(netWorth * 0.92), // Mock previous value
        change: '+8%'
      });
    }

    return summary;
  }

  processComplianceChecks(data, regulations) {
    const violations = data.checks.filter(check => check.status === 'violation');
    const compliantChecks = data.checks.filter(check => check.status === 'compliant');
    
    const overallScore = Math.round((compliantChecks.length / data.checks.length) * 100);

    return {
      overallScore,
      violations,
      compliantChecks,
      totalChecks: data.checks.length
    };
  }

  applyTemplateTransformations(data, transformations) {
    // Apply various data transformations based on template configuration
    let processedData = [...data];

    transformations.forEach(transformation => {
      switch (transformation.type) {
        case 'filter':
          processedData = processedData.filter(item => 
            this.evaluateFilter(item, transformation.criteria)
          );
          break;
        case 'sort':
          processedData.sort((a, b) => {
            const aValue = a[transformation.field];
            const bValue = b[transformation.field];
            return transformation.order === 'desc' ? bValue - aValue : aValue - bValue;
          });
          break;
        case 'aggregate':
          processedData = this.aggregateData(processedData, transformation.groupBy, transformation.aggregateFields);
          break;
      }
    });

    return processedData;
  }

  evaluateFilter(item, criteria) {
    // Simple filter evaluation
    return criteria.every(criterion => {
      const itemValue = item[criterion.field];
      switch (criterion.operator) {
        case 'equals':
          return itemValue === criterion.value;
        case 'greater':
          return itemValue > criterion.value;
        case 'less':
          return itemValue < criterion.value;
        case 'contains':
          return itemValue.toString().includes(criterion.value);
        default:
          return true;
      }
    });
  }

  aggregateData(data, groupBy, aggregateFields) {
    const grouped = {};
    
    data.forEach(item => {
      const key = item[groupBy];
      if (!grouped[key]) {
        grouped[key] = { [groupBy]: key };
        aggregateFields.forEach(field => {
          grouped[key][field.name] = 0;
        });
      }
      
      aggregateFields.forEach(field => {
        switch (field.operation) {
          case 'sum':
            grouped[key][field.name] += item[field.sourceField];
            break;
          case 'count':
            grouped[key][field.name]++;
            break;
          case 'avg':
            // This is simplified - would need to track count for proper average
            grouped[key][field.name] = (grouped[key][field.name] + item[field.sourceField]) / 2;
            break;
        }
      });
    });

    return Object.values(grouped);
  }

  async generatePDFFromTemplate(report, data, templateConfig) {
    // Generate PDF based on custom template
    const htmlContent = this.buildHTMLFromTemplate(report, data, templateConfig);
    
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    
    const fileName = `custom_report_${report.id}_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, '../reports/', fileName);
    
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' }
    });

    await page.close();
    return filePath;
  }

  async generateExcelFromTemplate(report, data, templateConfig) {
    const workbook = XLSX.utils.book_new();
    
    // Create sheets based on template configuration
    templateConfig.sheets.forEach(sheetConfig => {
      const sheetData = this.filterDataForSheet(data, sheetConfig.dataFilter);
      const sheet = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, sheet, sheetConfig.name);
    });

    const fileName = `custom_report_${report.id}_${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, '../reports/', fileName);
    
    XLSX.writeFile(workbook, filePath);
    return filePath;
  }

  buildHTMLFromTemplate(report, data, templateConfig) {
    // Build HTML from template configuration
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${templateConfig.styles || ''}
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .data-table th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${templateConfig.title || report.title}</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="content">
          ${this.renderTemplateContent(data, templateConfig)}
        </div>
      </body>
      </html>
    `;
  }

  renderTemplateContent(data, templateConfig) {
    // Render content based on template sections
    return templateConfig.sections.map(section => {
      switch (section.type) {
        case 'table':
          return this.renderTable(data, section);
        case 'chart':
          return `<div class="chart-placeholder">[Chart: ${section.title}]</div>`;
        case 'text':
          return `<div class="text-section">${section.content}</div>`;
        default:
          return '';
      }
    }).join('');
  }

  renderTable(data, section) {
    const tableData = this.filterDataForSection(data, section.dataFilter);
    
    return `
      <div class="table-section">
        <h3>${section.title}</h3>
        <table class="data-table">
          <thead>
            <tr>
              ${section.columns.map(col => `<th>${col.header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${tableData.map(row => `
              <tr>
                ${section.columns.map(col => `<td>${row[col.field] || ''}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  filterDataForSection(data, filter) {
    if (!filter) return data;
    return data.filter(item => this.evaluateFilter(item, filter.criteria));
  }

  filterDataForSheet(data, filter) {
    if (!filter) return data;
    return data.filter(item => this.evaluateFilter(item, filter.criteria));
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Export singleton instance
const reportGenerator = new ReportGenerator();

// Export the main function
const generateReport = async (reportId) => {
  return await reportGenerator.generateReport(reportId);
};

module.exports = {
  generateReport,
  ReportGenerator,
  reportGenerator
};