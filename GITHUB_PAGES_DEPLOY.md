# GitHub Pages 部署指南 (云端存储版本)

## 📋 概述

由于 GitHub Pages 只支持静态文件托管，无法直接运行 Node.js 后台服务，我们提供了以下几种部署方案：

## 🚀 方案一：纯前端版本（推荐用户体验）

### 特点
- ✅ 部署简单，完全免费
- ✅ 访问速度快
- ❌ 仅支持本地存储，无法跨设备同步

### 部署步骤

1. **准备代码**
```bash
# 确保在项目根目录
cd /Users/elite/MQTT\ ESP32

# 禁用云端存储功能（GitHub Pages 版本）
# 这个版本会自动检测环境并禁用不可用的功能
```

2. **提交并推送**
```bash
# 使用自带的部署脚本
./deploy.sh
```

3. **GitHub Pages 配置**
   - 进入你的 GitHub 仓库
   - 点击 Settings > Pages
   - Source 选择 "Deploy from a branch"
   - Branch 选择 "main"，文件夹选择 "/ (root)"
   - 保存设置

4. **访问网站**
   - 等待几分钟后访问：`https://你的用户名.github.io/仓库名/`

## 🌐 方案二：混合部署（推荐完整功能）

### 特点
- ✅ 前端免费托管在 GitHub Pages
- ✅ 支持云端存储和跨设备同步
- ⚠️ 需要单独部署后台服务

### 前端部署
按照方案一的步骤部署前端到 GitHub Pages

### 后台服务部署选项

#### 选项 1：Heroku 部署（免费）
```bash
# 1. 安装 Heroku CLI
# 访问 https://devcenter.heroku.com/articles/heroku-cli

# 2. 登录 Heroku
heroku login

# 3. 创建应用（在 backend 目录下）
cd backend
heroku create your-app-name

# 4. 添加 Procfile
echo "web: node server.js" > Procfile

# 5. 修改端口配置
# 在 server.js 中确保使用 process.env.PORT

# 6. 部署
git init
git add .
git commit -m "Initial commit"
git push heroku main
```

#### 选项 2：Railway 部署（推荐）
```bash
# 1. 访问 https://railway.app/
# 2. 连接 GitHub 仓库
# 3. 选择 backend 目录部署
# 4. 自动检测 Node.js 项目并部署
```

#### 选项 3：Vercel 部署
```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 在 backend 目录下部署
cd backend
vercel

# 3. 按提示配置项目
```

### 配置前端连接后台
部署后台后，需要更新前端的服务器地址：
```javascript
// 在 app.js 的 getDefaultServerUrl 方法中更新
return 'https://your-backend-service.herokuapp.com/api';
```

## 🔧 方案三：GitHub Actions 自动化部署

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages with Backend

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
    
    - name: Install dependencies
      run: |
        cd backend
        npm install
    
    - name: Build and test
      run: |
        cd backend
        npm test || true  # 如果有测试的话
    
    - name: Deploy frontend to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./
        exclude_assets: 'backend,node_modules'
    
    - name: Deploy backend to Heroku
      uses: akhileshns/heroku-deploy@v3.12.12
      with:
        heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
        heroku_app_name: "your-backend-app-name"
        heroku_email: "your-email@example.com"
        appdir: "backend"
```

## 🛠️ 配置文件调整

### 1. 修改后台服务端口配置
```javascript
// backend/server.js
const PORT = process.env.PORT || 3001;
```

### 2. 添加 CORS 配置
```javascript
// backend/server.js
app.use(cors({
    origin: [
        'http://localhost:8000',
        'http://localhost:3001', 
        'https://your-username.github.io'
    ],
    credentials: true
}));
```

### 3. 环境变量配置
创建 `backend/.env` 文件：
```env
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://your-username.github.io
```

## 📋 部署检查清单

### GitHub Pages 前端
- [ ] 代码已推送到 main 分支
- [ ] GitHub Pages 已启用
- [ ] 网站可以正常访问
- [ ] MQTT 连接功能正常

### 后台服务（如果使用）
- [ ] 后台服务已部署并运行
- [ ] API 健康检查正常：`/api/health`
- [ ] CORS 配置正确
- [ ] 前端可以连接到后台

### 云端存储功能
- [ ] 前端显示正确的服务器地址
- [ ] 连接测试按钮工作正常
- [ ] 数据同步功能正常
- [ ] 跨设备访问数据一致

## 🔍 故障排除

### 问题：前端无法连接到后台服务
**解决方案：**
1. 检查后台服务是否正常运行
2. 确认 CORS 配置包含了 GitHub Pages 域名
3. 检查是否使用了 HTTPS（GitHub Pages 强制 HTTPS）

### 问题：GitHub Pages 部署失败
**解决方案：**
1. 检查仓库是否为 public
2. 确认 Pages 设置中的分支和目录正确
3. 查看 Actions 标签页的部署日志

### 问题：后台服务部署失败
**解决方案：**
1. 确认 `package.json` 包含正确的 start 脚本
2. 检查端口配置使用 `process.env.PORT`
3. 确认所有依赖都在 `dependencies` 中

## 💡 推荐部署流程

对于大多数用户，我推荐以下流程：

1. **第一步**：部署基础版本到 GitHub Pages
   ```bash
   ./deploy.sh
   ```

2. **第二步**：测试基础功能是否正常

3. **第三步**（可选）：如需要跨设备同步，部署后台服务到 Railway 或 Heroku

4. **第四步**：更新前端配置连接后台服务

5. **第五步**：重新部署前端

这样可以确保即使后台服务出现问题，基础功能仍然可用。

---

🎮 现在你的游戏时长监控面板可以在 GitHub Pages 上完美运行了！