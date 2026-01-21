const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 导入服务
const { AutoTestService } = require('./services/aiService');
const TestExecutor = require('./services/testExecutor');
const ScriptGenerator = require('./services/scriptGenerator');
const FileManager = require('./services/fileManager');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// 初始化服务
const defaultProvider = process.env.DEFAULT_AI_PROVIDER || 'deepseek';
const autoTestService = new AutoTestService(defaultProvider);

// 初始化AI服务
const initAI = async () => {
  const config = {
    apiKey: process.env[`${defaultProvider.toUpperCase()}_API_KEY`],
    baseURL: process.env[`${defaultProvider.toUpperCase()}_BASE_URL`],
    model: process.env[`${defaultProvider.toUpperCase()}_MODEL`]
  };

  await autoTestService.init(config);
  console.log(`✅ AI服务已初始化: ${defaultProvider}`);
};

// API路由
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/test', require('./routes/testRoutes'));
app.use('/api/files', require('./routes/fileRoutes'));

// 启动服务器
const PORT = process.env.PORT || 3000;

initAI().then(() => {
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║   🚀 自动化测试平台已启动                ║
║                                          ║
║   访问地址: http://localhost:${PORT}      ║
║   AI引擎: ${defaultProvider.toUpperCase().padEnd(28)} ║
║                                          ║
║   文档: http://localhost:${PORT}/docs     ║
╚══════════════════════════════════════════╝
    `);
  });
}).catch(error => {
  console.error('❌ 服务启动失败:', error);
  process.exit(1);
});

module.exports = app;