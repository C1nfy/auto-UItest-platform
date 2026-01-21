// 前端主应用逻辑
let currentAI = 'deepseek';

// 加载AI提供商列表
async function loadProviders() {
  const response = await fetch('/api/ai/providers');
  const data = await response.json();

  const container = document.getElementById('providers-list');
  container.innerHTML = data.providers.map(provider => `
    <div class="provider-card ${provider.id === currentAI ? 'active' : ''}"
         onclick="selectAI('${provider.id}')">
      <h3>
        ${provider.name}
        ${provider.recommended ? '<span class="badge">推荐</span>' : ''}
      </h3>
      <p>${provider.description}</p>
      <p><small>成本: ${provider.cost}</small></p>
    </div>
  `).join('');
}

// 选择AI
async function selectAI(provider) {
  const apiKey = prompt(`请输入 ${provider.toUpperCase()} 的 API Key:`);
  if (!apiKey) return;

  const response = await fetch('/api/ai/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      config: {
        apiKey,
        baseURL: getBaseURL(provider),
        model: getModel(provider)
      }
    })
  });

  const result = await response.json();
  if (result.success) {
    currentAI = provider;
    alert(`已切换到 ${provider}`);
    loadProviders();
  }
}

// 提交测试
document.getElementById('config-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const config = {
    url: document.getElementById('url').value,
    username: document.getElementById('username').value,
    password: document.getElementById('password').value,
    tabName: document.getElementById('tabName').value,
    testData: document.getElementById('testData').value
  };

  // 调用测试API
  const response = await fetch('/api/test/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config })
  });

  const results = await response.json();
  displayResults(results);
});

// 显示结果
function displayResults(results) {
  const container = document.getElementById('results-content');
  container.innerHTML = `
    <h3>测试完成 - 使用 ${results.provider}</h3>
    <pre>${JSON.stringify(results, null, 2)}</pre>
  `;
}

// 辅助函数
function getBaseURL(provider) {
  const urls = {
    deepseek: 'https://api.deepseek.com/v1',
    claude: 'https://api.anthropic.com',
    openai: 'https://api.openai.com/v1'
  };
  return urls[provider];
}

function getModel(provider) {
  const models = {
    deepseek: 'deepseek-chat',
    claude: 'claude-sonnet-4-20250514',
    openai: 'gpt-4-turbo'
  };
  return models[provider];
}

// 页面加载时初始化
window.onload = () => {
  loadProviders();
};