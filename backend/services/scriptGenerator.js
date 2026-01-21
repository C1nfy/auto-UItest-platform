class ScriptGenerator {
  generate(config, testCases) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    const script = `// 自动生成的测试脚本
// 页面: ${config.tabName}
// 生成时间: ${new Date().toLocaleString()}
// 配置: ${JSON.stringify(config, null, 2)}

const { test, expect } = require('@playwright/test');

test.describe('${config.tabName} 自动化测试', () => {

  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('${config.url}');
    await page.fill('input[type="text"]', '${config.username}');
    ${config.password ? `await page.fill('input[type="password"]', '${config.password}');` : ''}
    await page.click('button:has-text("登")');
    await page.waitForURL(/.*#\\/.*/);

    // 进入目标页面
    await page.click('a:has-text("${config.tabName}")');
    await page.waitForTimeout(1000);
  });

${this.generateTestCases(testCases)}

});

// 测试配置
module.exports = {
  testConfig: ${JSON.stringify(config, null, 2)},
  generatedAt: '${new Date().toISOString()}'
};
`;

    return script;
  }

  generateTestCases(testCases) {
    return testCases.testCases.map(tc => {
      return `
  test('${tc.id} - ${tc.name}', async ({ page }) => {
    ${this.generateSteps(tc.steps)}

    // 验证结果
    await expect(page.locator('body')).toContainText('${tc.expectedResult}');

    // 截图
    await page.screenshot({
      path: 'screenshots/${tc.id}.png',
      fullPage: true
    });
  });`;
    }).join('\n');
  }

  generateSteps(steps) {
    return steps.map(step => {
      if (step.action === 'click') {
        return `await page.click('${step.selector}');`;
      } else if (step.action === 'fill') {
        return `await page.fill('${step.selector}', '${step.value}');`;
      } else if (step.action === 'navigate') {
        return `await page.goto('${step.url}');`;
      }
    }).join('\n    ');
  }
}

module.exports = ScriptGenerator;