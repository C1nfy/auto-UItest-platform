#!/bin/bash

echo "🚀 开始创建项目结构..."

# 创建目录
mkdir -p auto-test-platform/{backend/{services,routes,utils},frontend/{css,js},config,prompts,outputs/{scripts,reports,screenshots},docs,tests,scripts}

cd auto-test-platform

# 创建 package.json
cat > package.json << 'EOF'
{
  "name": "auto-test-platform",
  "version": "1.0.0",
  "main": "backend/server.js",
  "scripts": {
    "start": "node backend/server.js",
    "dev": "nodemon backend/server.js"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "puppeteer": "^21.0.0",
    "openai": "^4.28.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
EOF

# 创建 .env.example
cat > .env.example << 'EOF'
DEFAULT_AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
PORT=3000
EOF

# 创建 .gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
outputs/
*.log
.DS_Store
EOF
pause
echo "✅ 项目结构创建完成！"
echo "📝 下一步："
echo "   1. 将我提供的代码复制到对应文件"
echo "   2. 运行: npm install"
echo "   3. 复制 .env.example 到 .env 并配置API Key"
echo "   4. 运行: npm start"