const fs = require('node:fs');
const path = require('node:path');

class AccessibilityReporter {
  constructor() {
    this.results = [];
  }

  onTestEnd(test, result) {
    const attachment = result.attachments.find(({ name }) => name === 'axe-report');
    if (!attachment) return;

    try {
      const contents = attachment.body ?? fs.readFileSync(attachment.path);
      this.results.push({
        test: test.titlePath(),
        status: result.status,
        report: JSON.parse(contents.toString()),
      });
    } catch (error) {
      this.results.push({ test: test.titlePath(), status: result.status, error: error.message });
    }
  }

  onEnd() {
    if (this.results.length === 0) return;

    const reportPath = path.resolve('.quality-reports/accessibility-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(
      reportPath,
      `${JSON.stringify({ generatedAt: new Date().toISOString(), results: this.results }, null, 2)}\n`,
    );
  }
}

module.exports = AccessibilityReporter;