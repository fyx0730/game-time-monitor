# Railway 部署指南

## 🚄 使用 Railway 部署后台服务

Railway 是一个现代化的部署平台，支持从 GitHub 直接部署，非常适合我们的后台服务。

## 📋 部署步骤

### 1. 准备账户
1. 访问 [railway.app](https://railway.app)
2. 点击 "Login with GitHub" 
3. 授权 Railway 访问你的 GitHub 账户

### 2. 创建项目
1. 点击 "New Project"
2. 选择 "Deploy from GitHub repo"
3. 找到并选择 `game-time-monitor` 仓库
4. 点击 "Deploy"

### 3. 配置部署目录 (重要！)

Railway 默认会尝试部署整个项目，但我们只需要部署 `backend` 目录：

#### 方法一：在 Railway 面板中配置
1. 进入项目设置 (Settings)
2. 找到 "Build" 部分
3. 设置 Root Directory: `backend`
4. 或者设置：
   - Build Command: `npm install`
   - Start Command: `npm start`

#### 方法二：使用配置文件（推荐）
项目中已包含 `backend/railway.json` 配置文件，Railway 会自动识别。

### 4. 设置环境变量
在 Railway 项目面板中：
1. 点击 "Variables" 标签
2. 添加以下变量：
   ```
   NODE_ENV=production
   PORT=${{RAILWAY_PORT}}
   CORS_ORIGIN=https://你的用户名.github.io
   ```

### 5. 检查部署状态
1. 在 "Deployments" 标签中查看构建日志
2. 确认服务启动成功
3. 记录分配的域名（类似：`your-app-name.railway.app`）

## 🌐 获取 API 地址

部署成功后，Railway 会提供一个域名，格式通常是：
```
https://your-project-name-production.up.railway.app
```

你的完整 API 地址将是：
```
https://your-project-name-production.up.railway.app/api
```

## 🔧 配置前端连接

获得 Railway 域名后，需要更新前端配置：

### 方法一：修改代码中的默认地址
在 `app.js` 中找到 `getDefaultServerUrl` 方法，更新 GitHub Pages 的默认地址：

```javascript
} else if (window.location.hostname.endsWith('.github.io')) {
    // GitHub Pages 环境 - 使用 Railway 后台服务
    return 'https://your-project-name-production.up.railway.app/api';
}
```

### 方法二：在网页中手动配置
1. 访问你的 GitHub Pages 网站
2. 在配置面板中勾选"启用云端存储"
3. 输入 Railway 提供的 API 地址
4. 点击"测试"验证连接

## 🛠️ 故障排除

### 问题1：部署失败 - "No package.json found"
**解决方案：**
1. 确认在 Railway 设置中指定了 Root Directory 为 `backend`
2. 或检查 Build Command 是否正确

### 问题2：服务启动失败 - 端口错误
**解决方案：**
确认环境变量中设置了 `PORT=${{RAILWAY_PORT}}`

### 问题3：CORS 错误
**解决方案：**
1. 在 Railway 环境变量中添加：
   ```
   CORS_ORIGIN=https://你的用户名.github.io
   ```
2. 重新部署服务

### 问题4：API 无法访问
**解决方案：**
1. 检查 Railway 项目是否正在运行
2. 访问 `https://你的域名/api/health` 测试健康检查
3. 查看 Railway 的部署日志

## 🎯 验证部署成功

### 1. 健康检查
访问：`https://你的域名/api/health`
应该看到：
```json
{
  "success": true,
  "message": "服务器运行正常",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

### 2. 测试 API
使用 curl 测试：
```bash
# 健康检查
curl https://your-domain.railway.app/api/health

# 获取用户数据（应该返回空数据）
curl https://your-domain.railway.app/api/data/test-user
```

### 3. 前端连接测试
1. 访问你的 GitHub Pages 网站
2. 配置云端存储使用 Railway 地址
3. 点击"测试"按钮
4. 应该显示"✅ 云端服务连接成功"

## 💰 Railway 定价

Railway 提供免费额度：
- **免费套餐**：每月 500 小时运行时间
- **按使用付费**：超出后按小时计费
- **适合场景**：个人项目和小型应用

对于游戏时长监控面板，免费额度通常足够使用。

## 🔄 自动部署

Railway 支持 GitHub 集成，当你推送代码到 main 分支时会自动重新部署：

1. 修改后台代码
2. 提交到 GitHub：
   ```bash
   git add .
   git commit -m "更新后台服务"
   git push origin main
   ```
3. Railway 自动检测更改并重新部署

## 📞 需要帮助？

如果遇到问题：
1. 查看 Railway 项目的 "Logs" 标签了解错误信息
2. 检查 GitHub Pages 浏览器控制台的网络请求
3. 参考项目的 `GITHUB_PAGES_TROUBLESHOOTING.md`

---

🎮 使用 Railway 部署后，你就可以在任何设备上同步游戏时长数据了！