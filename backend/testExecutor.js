const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class TestExecutor {
  async runTests(config, testCases) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    const results = {
      total: testCases.testCases.length,
      passed: 0,
      failed: 0,
      details: [],
      screenshots: []
    };

    try {
      // 登录
      await page.goto(config.url);
      await page.type('input[type="text"]', config.username);
      if (config.password) {
        await page.type('input[type="password"]', config.password);
      }
      await page.click('button:has-text("登")');
      await page.waitForNavigation();

      // 执行每个测试用例
      for (const testCase of testCases.testCases) {
        try {
          const result = await this.executeTestCase(page, testCase, config);
          results.details.push(result);

          if (result.passed) {
            results.passed++;
          } else {
            results.failed++;
          }

          // 截图
          const screenshot = await page.screenshot({
            path: `outputs/screenshots/${testCase.id}.png`,
            fullPage: true
          });
          results.screenshots.push({
            testCaseId: testCase.id,
            path: `outputs/screenshots/${testCase.id}.png`
          });

        } catch (error) {
          results.failed++;
          results.details.push({
            testCaseId: testCase.id,
            passed: false,
            error: error.message
          });
        }
      }

    } finally {
      await browser.close();
    }

    return results;
  }

  async executeTestCase(page, testCase, config) {
    // 根据测试用例的步骤执行操作
    for (const step of testCase.steps) {
      if (step.action === 'click') {
        await page.click(step.selector);
      } else if (step.action === 'fill') {
        await page.fill(step.selector, step.value);
      } else if (step.action === 'navigate') {
        await page.goto(step.url);
      }
      await page.waitForTimeout(500);
    }

    // 验证预期结果
    const result = await page.evaluate((expected) => {
      // 在页面上下文中验证
      return document.body.innerText.includes(expected);
    }, testCase.expectedResult);

    return {
      testCaseId: testCase.id,
      passed: result,
      actualResult: result ? testCase.expectedResult : '未匹配预期结果'
    };
  }
}

module.exports = TestExecutor;