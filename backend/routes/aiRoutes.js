const express = require('express');
const router = express.Router();
const { AutoTestService } = require('../services/aiService');

let autoTestService;

// 获取支持的AI提供商列表
router.get('/providers', (req, res) => {
  res.json({
    providers: [
      {
        id: 'deepseek',
        name: 'DeepSeek',
        recommended: true,
        cost: '$0.0005/次',
        description: '性价比最高，速度快'
      },
      {
        id: 'claude',
        name: 'Claude (Anthropic)',
        recommended: true,
        cost: '$0.015/次',
        description: '最智能，理解力最强'
      },
      {
        id: 'openai',
        name: 'OpenAI GPT-4',
        recommended: false,
        cost: '$0.050/次',
        description: '通用性强，生态完善'
      },
      {
        id: 'gemini',
        name: 'Google Gemini',
        recommended: false,
        cost: '$0.0025/次',
        description: '多模态能力强'
      },
      {
        id: 'qwen',
        name: '阿里通义千问',
        recommended: false,
        cost: '$0.004/次',
        description: '中文能力优秀'
      },
      {
        id: 'glm',
        name: '智谱GLM',
        recommended: false,
        cost: '$0.0025/次',
        description: '国产优秀模型'
      }
    ],
    current: autoTestService?.aiProvider || 'deepseek'
  });
});

// 初始化/切换AI服务
router.post('/init', async (req, res) => {
  try {
    const { provider, config } = req.body;

    autoTestService = new AutoTestService(provider);
    await autoTestService.init(config);

    res.json({
      success: true,
      message: `已切换到 ${provider}`,
      provider
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取当前AI状态
router.get('/status', (req, res) => {
  res.json({
    initialized: !!autoTestService,
    provider: autoTestService?.aiProvider || null
  });
});

module.exports = router;