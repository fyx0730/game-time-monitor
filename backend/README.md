# 游戏时长监控面板 - 后台服务说明

## 📋 概述

这个后台服务为游戏时长监控面板提供云端数据存储功能，解决不同设备间数据无法共享的问题。

## 🚀 快速开始

### 1. 安装 Node.js
确保你的系统已安装 Node.js (版本 14 或更高)：
- 访问 [https://nodejs.org/](https://nodejs.org/) 下载安装
- 或使用包管理器：`brew install node` (macOS) 或 `sudo apt install nodejs npm` (Ubuntu)

### 2. 启动后台服务

#### 方法一：使用启动脚本 (推荐)
```bash
cd backend
chmod +x start.sh
./start.sh
```

#### 方法二：手动启动
```bash
cd backend
npm install
npm start
```

### 3. 验证服务
服务启动后，访问 [http://localhost:3001/api/health](http://localhost:3001/api/health) 验证服务是否正常运行。

### 4. 配置前端
1. 打开游戏监控面板 [http://localhost:3001/index.html](http://localhost:3001/index.html)
2. 在配置面板中：
   - 勾选"启用云端存储"
   - 确认后台服务地址为 `http://localhost:3001/api`
   - 点击"测试"按钮验证连接

## 🔧 功能特性

### 多设备数据同步
- 每台设备都有唯一的用户ID
- 数据自动在不同设备间同步
- 智能合并冲突数据

### 数据持久化
- 数据存储在服务器的 `data` 目录
- 每个用户一个独立的 JSON 文件
- 自动备份和恢复

### 实时同步
- 数据变更后立即同步到云端
- 每30秒自动同步最新数据
- 页面刷新时从云端恢复数据

## 📁 项目结构

```
backend/
├── server.js          # 主服务器文件
├── package.json       # 项目依赖配置
├── start.sh          # 启动脚本
├── README.md         # 说明文档
└── data/             # 数据存储目录
    ├── user_xxx.json # 用户数据文件
    └── user_yyy.json
```

## 🌐 API 接口

### 1. 健康检查
```http
GET /api/health
```

### 2. 获取用户数据
```http
GET /api/data/{userId}
```

### 3. 保存用户数据
```http
POST /api/data/{userId}
Content-Type: application/json

{
  "data": {
    "players": [...],
    "events": [...],
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. 获取用户列表
```http
GET /api/users
```

### 5. 删除用户数据
```http
DELETE /api/data/{userId}
```

## 🔒 安全说明

### 数据隔离
- 每个用户的数据完全隔离
- 用户ID自动生成，不包含个人信息
- 无法访问其他用户的数据

### 网络安全
- 支持 CORS 跨域请求
- 数据传输使用 JSON 格式
- 本地部署，数据不会传输到外部服务器

## 🚀 部署选项

### 本地部署 (开发/个人使用)
- 按照上述步骤在本地运行
- 适合个人或小团队使用
- 数据存储在本地磁盘

### 服务器部署 (生产环境)
```bash
# 在服务器上
git clone <your-repo>
cd game-time-monitor/backend
npm install
npm start

# 或使用 PM2 进程管理
npm install -g pm2
pm2 start server.js --name "game-monitor-backend"
```

### Docker 部署
```dockerfile
# Dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

```bash
# 构建和运行
docker build -t game-monitor-backend .
docker run -p 3001:3001 -v $(pwd)/data:/app/data game-monitor-backend
```

## 🛠️ 开发配置

### 开发模式
```bash
npm install --dev
npm run dev  # 使用 nodemon 自动重启
```

### 环境变量
```bash
PORT=3001                    # 服务端口
DATA_DIR=./data             # 数据存储目录
CORS_ORIGIN=*               # 允许的跨域源
```

### 日志配置
服务器会在控制台输出详细的操作日志，包括：
- 数据保存/加载操作
- API 请求记录
- 错误信息

## ❓ 常见问题

### Q: 端口 3001 被占用怎么办？
A: 修改 `server.js` 中的 `PORT` 变量，或设置环境变量：
```bash
PORT=3002 npm start
```

### Q: 数据丢失了怎么办？
A: 检查 `backend/data` 目录中的用户数据文件，数据以 JSON 格式存储，可以手动恢复。

### Q: 如何备份数据？
A: 定期复制 `backend/data` 目录，或通过 API 导出数据：
```bash
curl http://localhost:3001/api/users > users_backup.json
```

### Q: 可以多人同时使用吗？
A: 可以。每个用户（浏览器）都有独立的用户ID，数据互不干扰。

### Q: 如何清理旧数据？
A: 可以直接删除 `backend/data` 目录中的用户文件，或通过 API 删除：
```bash
curl -X DELETE http://localhost:3001/api/data/{userId}
```

## 🔄 升级说明

### 从纯前端版本升级
1. 原有的 localStorage 数据会自动保留
2. 启用云端存储后，数据会自动同步到服务器
3. 可以在不同设备上看到相同的数据

### 数据迁移
如果需要迁移现有数据：
1. 在原设备上导出数据（调试页面 → 导出数据）
2. 在新设备上导入数据（调试页面 → 导入数据）
3. 启用云端存储进行同步

---

🎮 现在你可以在任何设备上访问相同的游戏时长数据了！