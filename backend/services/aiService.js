// 这个文件包含：
// - AIServiceFactory (工厂类)
// - BaseAIService (基类)
// - ClaudeService (Claude实现)
// - DeepSeekService (DeepSeek实现)
// - OpenAIService (OpenAI实现)
// - GeminiService (Gemini实现)
// - QwenService (通义千问实现)
// - GLMService (智谱GLM实现)
// - AutoTestService (主服务类)

// 我之前生成的 "多AI引擎支持的自动化测试平台" 代码
// 完整内容就放在这个文件里

// ============================================
// AI 服务抽象层 - 支持多种AI引擎
// ============================================

/**
 * AI服务工厂类
 * 统一的接口，支持切换不同的AI提供商
 */
class AIServiceFactory {
  static create(provider, config) {
    switch (provider.toLowerCase()) {
      case 'claude':
        return new ClaudeService(config);
      case 'deepseek':
        return new DeepSeekService(config);
      case 'openai':
        return new OpenAIService(config);
      case 'gemini':
        return new GeminiService(config);
      case 'qwen':
        return new QwenService(config);
      case 'glm':
        return new GLMService(config);
      default:
        throw new Error(`不支持的AI提供商: ${provider}`);
    }
  }
}

/**
 * AI服务基类 - 定义统一接口
 */
class BaseAIService {
  constructor(config) {
    this.config = config;
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL;
    this.model = config.model;
  }

  // 必须实现的方法
  async analyze(config, prompt) {
    throw new Error('子类必须实现 analyze 方法');
  }

  async generateTestCases(analysis, prompt) {
    throw new Error('子类必须实现 generateTestCases 方法');
  }

  async generateReport(results, prompt) {
    throw new Error('子类必须实现 generateReport 方法');
  }

  // 通用方法
  fillTemplate(template, vars) {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return result;
  }

  parseJSON(text) {
    // 尝试提取JSON（处理AI可能返回的Markdown代码块）
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                      text.match(/```\s*([\s\S]*?)\s*```/) ||
                      [null, text];

    try {
      return JSON.parse(jsonMatch[1] || text);
    } catch (error) {
      console.error('JSON解析失败:', error);
      return { error: 'JSON解析失败', raw: text };
    }
  }
}

// ============================================
// Claude AI 服务实现
// ============================================
class ClaudeService extends BaseAIService {
  constructor(config) {
    super(config);
    const Anthropic = require('@anthropic-ai/sdk');
    this.client = new Anthropic({
      apiKey: this.apiKey
    });
    this.model = this.model || 'claude-sonnet-4-20250514';
  }

  async analyze(testConfig, promptTemplate) {
    const prompt = this.fillTemplate(promptTemplate, testConfig);

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    return this.parseJSON(message.content[0].text);
  }

  async generateTestCases(analysis, promptTemplate) {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `${promptTemplate}\n\n分析结果:\n${JSON.stringify(analysis, null, 2)}`
      }]
    });

    return this.parseJSON(message.content[0].text);
  }

  async generateReport(results, promptTemplate) {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `${promptTemplate}\n\n测试结果:\n${JSON.stringify(results, null, 2)}`
      }]
    });

    return message.content[0].text;
  }
}

// ============================================
// DeepSeek AI 服务实现
// ============================================
class DeepSeekService extends BaseAIService {
  constructor(config) {
    super(config);
    this.baseURL = this.baseURL || 'https://api.deepseek.com/v1';
    this.model = this.model || 'deepseek-chat';
  }

  async makeRequest(messages) {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API 错误: ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async analyze(testConfig, promptTemplate) {
    const prompt = this.fillTemplate(promptTemplate, testConfig);

    const content = await this.makeRequest([
      {
        role: 'system',
        content: '你是一个专业的测试工程师，擅长分析Web页面并设计测试用例。'
      },
      {
        role: 'user',
        content: prompt
      }
    ]);

    return this.parseJSON(content);
  }

  async generateTestCases(analysis, promptTemplate) {
    const content = await this.makeRequest([
      {
        role: 'system',
        content: '你是测试用例设计专家，能够设计全面的测试场景。'
      },
      {
        role: 'user',
        content: `${promptTemplate}\n\n分析结果:\n${JSON.stringify(analysis, null, 2)}`
      }
    ]);

    return this.parseJSON(content);
  }

  async generateReport(results, promptTemplate) {
    const content = await this.makeRequest([
      {
        role: 'system',
        content: '你是测试报告专家，擅长生成专业的测试报告。'
      },
      {
        role: 'user',
        content: `${promptTemplate}\n\n测试结果:\n${JSON.stringify(results, null, 2)}`
      }
    ]);

    return content;
  }
}

// ============================================
// OpenAI (GPT) 服务实现
// ============================================
class OpenAIService extends BaseAIService {
  constructor(config) {
    super(config);
    const OpenAI = require('openai');
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL || 'https://api.openai.com/v1'
    });
    this.model = this.model || 'gpt-4-turbo';
  }

  async analyze(testConfig, promptTemplate) {
    const prompt = this.fillTemplate(promptTemplate, testConfig);

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的测试工程师。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    return this.parseJSON(completion.choices[0].message.content);
  }

  async generateTestCases(analysis, promptTemplate) {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: '你是测试用例设计专家。'
        },
        {
          role: 'user',
          content: `${promptTemplate}\n\n${JSON.stringify(analysis, null, 2)}`
        }
      ],
      max_tokens: 4000
    });

    return this.parseJSON(completion.choices[0].message.content);
  }

  async generateReport(results, promptTemplate) {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: '你是测试报告专家。'
        },
        {
          role: 'user',
          content: `${promptTemplate}\n\n${JSON.stringify(results, null, 2)}`
        }
      ],
      max_tokens: 4000
    });

    return completion.choices[0].message.content;
  }
}

// ============================================
// Google Gemini 服务实现
// ============================================
class GeminiService extends BaseAIService {
  constructor(config) {
    super(config);
    this.baseURL = this.baseURL || 'https://generativelanguage.googleapis.com/v1beta';
    this.model = this.model || 'gemini-pro';
  }

  async makeRequest(prompt) {
    const response = await fetch(
      `${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      }
    );

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  async analyze(testConfig, promptTemplate) {
    const prompt = this.fillTemplate(promptTemplate, testConfig);
    const content = await this.makeRequest(prompt);
    return this.parseJSON(content);
  }

  async generateTestCases(analysis, promptTemplate) {
    const prompt = `${promptTemplate}\n\n${JSON.stringify(analysis, null, 2)}`;
    const content = await this.makeRequest(prompt);
    return this.parseJSON(content);
  }

  async generateReport(results, promptTemplate) {
    const prompt = `${promptTemplate}\n\n${JSON.stringify(results, null, 2)}`;
    return await this.makeRequest(prompt);
  }
}

// ============================================
// 阿里通义千问 服务实现
// ============================================
class QwenService extends BaseAIService {
  constructor(config) {
    super(config);
    this.baseURL = this.baseURL || 'https://dashscope.aliyuncs.com/api/v1';
    this.model = this.model || 'qwen-max';
  }

  async makeRequest(messages) {
    const response = await fetch(
      `${this.baseURL}/services/aigc/text-generation/generation`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          input: { messages },
          parameters: {
            max_tokens: 4000,
            temperature: 0.7
          }
        })
      }
    );

    const data = await response.json();
    return data.output.text;
  }

  async analyze(testConfig, promptTemplate) {
    const prompt = this.fillTemplate(promptTemplate, testConfig);
    const content = await this.makeRequest([
      { role: 'system', content: '你是专业的测试工程师。' },
      { role: 'user', content: prompt }
    ]);
    return this.parseJSON(content);
  }

  async generateTestCases(analysis, promptTemplate) {
    const content = await this.makeRequest([
      { role: 'system', content: '你是测试用例设计专家。' },
      { role: 'user', content: `${promptTemplate}\n\n${JSON.stringify(analysis, null, 2)}` }
    ]);
    return this.parseJSON(content);
  }

  async generateReport(results, promptTemplate) {
    return await this.makeRequest([
      { role: 'system', content: '你是测试报告专家。' },
      { role: 'user', content: `${promptTemplate}\n\n${JSON.stringify(results, null, 2)}` }
    ]);
  }
}

// ============================================
// 智谱 GLM 服务实现
// ============================================
class GLMService extends BaseAIService {
  constructor(config) {
    super(config);
    this.baseURL = this.baseURL || 'https://open.bigmodel.cn/api/paas/v4';
    this.model = this.model || 'glm-4';
  }

  async makeRequest(messages) {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: 4000
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async analyze(testConfig, promptTemplate) {
    const prompt = this.fillTemplate(promptTemplate, testConfig);
    const content = await this.makeRequest([
      { role: 'system', content: '你是专业的测试工程师。' },
      { role: 'user', content: prompt }
    ]);
    return this.parseJSON(content);
  }

  async generateTestCases(analysis, promptTemplate) {
    const content = await this.makeRequest([
      { role: 'system', content: '你是测试用例设计专家。' },
      { role: 'user', content: `${promptTemplate}\n\n${JSON.stringify(analysis, null, 2)}` }
    ]);
    return this.parseJSON(content);
  }

  async generateReport(results, promptTemplate) {
    return await this.makeRequest([
      { role: 'system', content: '你是测试报告专家。' },
      { role: 'user', content: `${promptTemplate}\n\n${JSON.stringify(results, null, 2)}` }
    ]);
  }
}

// ============================================
// 使用示例
// ============================================

// 配置文件示例
const aiConfigs = {
  claude: {
    provider: 'claude',
    apiKey: 'sk-ant-...',
    model: 'claude-sonnet-4-20250514'
  },
  deepseek: {
    provider: 'deepseek',
    apiKey: 'sk-...',
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat'
  },
  openai: {
    provider: 'openai',
    apiKey: 'sk-...',
    model: 'gpt-4-turbo'
  },
  gemini: {
    provider: 'gemini',
    apiKey: 'AIza...',
    model: 'gemini-pro'
  },
  qwen: {
    provider: 'qwen',
    apiKey: 'sk-...',
    model: 'qwen-max'
  },
  glm: {
    provider: 'glm',
    apiKey: 'sk-...',
    model: 'glm-4'
  }
};

// 主服务类 - 集成AI服务
class AutoTestService {
  constructor(aiProvider = 'claude') {
    this.aiProvider = aiProvider;
    this.aiService = null;
  }

  // 初始化AI服务
  async init(config) {
    this.aiService = AIServiceFactory.create(this.aiProvider, config);
  }

  // 切换AI提供商
  switchAI(provider, config) {
    this.aiProvider = provider;
    this.aiService = AIServiceFactory.create(provider, config);
  }

  // 执行完整的自动化测试流程
  async runAutoTest(testConfig, prompts) {
    if (!this.aiService) {
      throw new Error('AI服务未初始化，请先调用 init() 方法');
    }

    const results = {
      provider: this.aiProvider,
      timestamp: new Date().toISOString(),
      steps: []
    };

    try {
      // 步骤1: 页面分析
      console.log('🔍 正在分析页面...');
      results.analysis = await this.aiService.analyze(testConfig, prompts.analysis);
      results.steps.push('页面分析完成');

      // 步骤2: 生成测试用例
      console.log('📋 正在生成测试用例...');
      results.testCases = await this.aiService.generateTestCases(
        results.analysis,
        prompts.testCase
      );
      results.steps.push('测试用例生成完成');

      // 步骤3: 这里可以执行实际测试（使用Puppeteer）
      // const testResults = await executeTests(results.testCases);

      // 步骤4: 生成测试报告
      console.log('📊 正在生成测试报告...');
      results.report = await this.aiService.generateReport(
        results.testCases,
        prompts.report
      );
      results.steps.push('测试报告生成完成');

      return results;

    } catch (error) {
      console.error('自动化测试失败:', error);
      results.error = error.message;
      return results;
    }
  }
}

// ============================================
// Express 服务器集成示例
// ============================================

const express = require('express');
const app = express();
app.use(express.json());

// 全局AI服务实例
let autoTestService = new AutoTestService('claude');

// API: 初始化AI服务
app.post('/api/ai/init', async (req, res) => {
  const { provider, config } = req.body;

  try {
    autoTestService = new AutoTestService(provider);
    await autoTestService.init(config);

    res.json({
      success: true,
      message: `已切换到 ${provider}`,
      provider
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: 获取支持的AI提供商列表
app.get('/api/ai/providers', (req, res) => {
  res.json({
    providers: [
      { id: 'claude', name: 'Claude (Anthropic)', recommended: true },
      { id: 'deepseek', name: 'DeepSeek', recommended: true },
      { id: 'openai', name: 'OpenAI (GPT)', recommended: false },
      { id: 'gemini', name: 'Google Gemini', recommended: false },
      { id: 'qwen', name: '阿里通义千问', recommended: false },
      { id: 'glm', name: '智谱 GLM', recommended: false }
    ]
  });
});

// API: 执行自动化测试
app.post('/api/auto-test', async (req, res) => {
  const { config, prompts } = req.body;

  try {
    const results = await autoTestService.runAutoTest(config, prompts);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = {
  AIServiceFactory,
  BaseAIService,
  ClaudeService,
  DeepSeekService,
  OpenAIService,
  GeminiService,
  QwenService,
  GLMService,
  AutoTestService
};