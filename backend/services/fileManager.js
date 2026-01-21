const fs = require('fs').promises;
const path = require('path');

class FileManager {
  constructor() {
    this.outputDir = path.join(__dirname, '../outputs');
    this.scriptsDir = path.join(this.outputDir, 'scripts');
    this.reportsDir = path.join(this.outputDir, 'reports');
    this.promptsDir = path.join(__dirname, '../prompts');
  }

  async init() {
    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.mkdir(this.scriptsDir, { recursive: true });
    await fs.mkdir(this.reportsDir, { recursive: true });
  }

  // 保存所有文件
  async saveAll({ script, report, screenshots, savePath }) {
    await this.init();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const savedFiles = {};

    // 保存测试脚本（支持合并）
    const scriptPath = savePath || this.scriptsDir;
    savedFiles.script = await this.saveScript(script, scriptPath, timestamp);

    // 保存测试报告
    const reportPath = path.join(this.reportsDir, `report_${timestamp}.md`);
    await fs.writeFile(reportPath, report, 'utf8');
    savedFiles.report = reportPath;

    // 保存截图信息
    savedFiles.screenshots = screenshots;

    return savedFiles;
  }

  // 保存脚本（智能合并）
  async saveScript(newScript, targetPath, timestamp) {
    const fileName = `test_${timestamp}.spec.js`;
    const filePath = path.join(targetPath, fileName);

    // 检查是否已存在同类型脚本
    const existingScripts = await this.findSimilarScripts(targetPath);

    if (existingScripts.length > 0) {
      // 询问用户是否合并（这里简化为自动合并）
      const merged = await this.mergeScripts(existingScripts[0], newScript);
      await fs.writeFile(existingScripts[0], merged, 'utf8');
      return existingScripts[0];
    } else {
      // 保存新脚本
      await fs.mkdir(targetPath, { recursive: true });
      await fs.writeFile(filePath, newScript, 'utf8');
      return filePath;
    }
  }

  // 合并测试脚本
  async mergeScripts(existingPath, newScript) {
    const existing = await fs.readFile(existingPath, 'utf8');

    // 提取测试用例部分
    const existingTests = this.extractTests(existing);
    const newTests = this.extractTests(newScript);

    // 合并（去重）
    const allTests = [...existingTests, ...newTests];
    const uniqueTests = this.deduplicateTests(allTests);

    // 重新组装脚本
    return this.assembleScript(existing, uniqueTests);
  }

  extractTests(script) {
    const testRegex = /test\('([^']+)',[\s\S]*?\}\);/g;
    const tests = [];
    let match;

    while ((match = testRegex.exec(script)) !== null) {
      tests.push({
        id: match[1],
        code: match[0]
      });
    }

    return tests;
  }

  deduplicateTests(tests) {
    const seen = new Set();
    return tests.filter(test => {
      if (seen.has(test.id)) {
        return false;
      }
      seen.add(test.id);
      return true;
    });
  }

  assembleScript(baseScript, tests) {
    // 移除旧的测试用例
    let result = baseScript.replace(/test\('([^']+)',[\s\S]*?\}\);/g, '');

    // 插入新的测试用例
    const testsCode = tests.map(t => t.code).join('\n\n  ');
    result = result.replace(/test\.describe[\s\S]*?\{/, `test.describe('合并的测试', () => {\n\n  ${testsCode}\n\n`);

    return result;
  }

  // 查找相似脚本
  async findSimilarScripts(dirPath) {
    try {
      const files = await fs.readdir(dirPath);
      return files
        .filter(f => f.endsWith('.spec.js'))
        .map(f => path.join(dirPath, f));
    } catch (error) {
      return [];
    }
  }

  // 加载提示词模板
  async loadPrompts() {
    const prompts = {};
    const files = ['analysis.txt', 'testcase.txt', 'execution.txt', 'report.txt', 'script.txt'];

    for (const file of files) {
      try {
        const content = await fs.readFile(path.join(this.promptsDir, file), 'utf8');
        prompts[file.replace('.txt', '')] = content;
      } catch (error) {
        prompts[file.replace('.txt', '')] = '';
      }
    }

    return prompts;
  }

  // 保存提示词模板
  async savePrompts(prompts) {
    await fs.mkdir(this.promptsDir, { recursive: true });

    for (const [key, value] of Object.entries(prompts)) {
      await fs.writeFile(
        path.join(this.promptsDir, `${key}.txt`),
        value,
        'utf8'
      );
    }
  }

  // 列出所有脚本
  async listScripts() {
    const files = await fs.readdir(this.scriptsDir);
    return files.filter(f => f.endsWith('.spec.js'));
  }
}

module.exports = FileManager;