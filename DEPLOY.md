# 部署到 GitHub Pages 指南

## 📋 部署步骤

### 1. 创建 GitHub 仓库

1. 登录 [GitHub](https://github.com)
2. 点击右上角的 "+" 按钮，选择 "New repository"
3. 填写仓库信息：
   - **Repository name**: `game-time-monitor` (或其他你喜欢的名称)
   - **Description**: `游戏时长监控面板 - 通过 MQTT 实时监控设备游戏时长`
   - **Public**: 选择 Public (GitHub Pages 免费版需要公开仓库)
   - **Initialize with README**: 不勾选 (我们已有文件)
4. 点击 "Create repository"

### 2. 上传项目文件

#### 方法一：使用 Git 命令行

```bash
# 在项目目录中初始化 Git
git init

# 添加所有文件
git add .

# 提交文件
git commit -m "Initial commit: 游戏时长监控面板"

# 添加远程仓库 (替换为你的仓库地址)
git remote add origin https://github.com/YOUR_USERNAME/game-time-monitor.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

#### 方法二：使用 GitHub 网页界面

1. 在新创建的仓库页面，点击 "uploading an existing file"
2. 将所有项目文件拖拽到上传区域：
   - `index.html`
   - `style.css`
   - `app.js`
   - `README.md`
   - `.gitignore`
   - `DEPLOY.md`
3. 填写提交信息：`Initial commit: 游戏时长监控面板`
4. 点击 "Commit changes"

### 3. 启用 GitHub Pages

1. 在仓库页面，点击 "Settings" 标签
2. 在左侧菜单中找到 "Pages"
3. 在 "Source" 部分：
   - 选择 "Deploy from a branch"
   - Branch: 选择 "main"
   - Folder: 选择 "/ (root)"
4. 点击 "Save"

### 4. 访问你的网站

- GitHub Pages 会自动构建和部署
- 几分钟后，你的网站将在以下地址可用：
  ```
  https://YOUR_USERNAME.github.io/game-time-monitor/
  ```
- 你也可以在 Settings > Pages 页面看到确切的 URL

## 🔧 配置说明

### 自定义域名 (可选)

如果你有自己的域名：

1. 在仓库根目录创建 `CNAME` 文件
2. 文件内容为你的域名，如：`monitor.yourdomain.com`
3. 在域名提供商处设置 CNAME 记录指向 `YOUR_USERNAME.github.io`

### HTTPS 设置

- GitHub Pages 自动提供 HTTPS
- 在 Settings > Pages 中确保 "Enforce HTTPS" 已勾选

## 📱 使用说明

部署完成后，用户可以：

1. **直接访问** - 打开网页即可使用
2. **配置 MQTT** - 输入自己的 MQTT Broker 地址
3. **数据持久化** - 所有数据保存在浏览器本地
4. **跨设备同步** - 每个设备/浏览器独立存储数据

## 🔄 更新部署

当你修改代码后，重新部署：

```bash
# 添加修改的文件
git add .

# 提交更改
git commit -m "更新功能: 描述你的修改"

# 推送到 GitHub
git push origin main
```

GitHub Pages 会自动重新部署，通常在几分钟内生效。

## 🌐 分享你的项目

部署完成后，你可以：

- 将 URL 分享给朋友使用
- 在社交媒体上展示你的项目
- 添加到你的个人网站或简历中
- 接受其他开发者的贡献 (Pull Requests)

## 🚀 进阶配置

### 自定义 404 页面

创建 `404.html` 文件来自定义 404 错误页面。

### 添加 favicon

在根目录添加 `favicon.ico` 文件来设置网站图标。

### SEO 优化

在 `index.html` 中添加更多 meta 标签来优化搜索引擎收录。

## 📊 监控和分析

- 使用 GitHub 仓库的 Insights 查看访问统计
- 可以集成 Google Analytics 进行详细分析
- 通过 GitHub Issues 收集用户反馈

## ❓ 常见问题

**Q: 网站无法访问？**
A: 检查 GitHub Pages 设置，确保选择了正确的分支和文件夹。

**Q: 更新后网站没有变化？**
A: GitHub Pages 可能需要几分钟来更新，也可以尝试清除浏览器缓存。

**Q: 可以使用私有仓库吗？**
A: GitHub Pages 的免费版本需要公开仓库，私有仓库需要 GitHub Pro 订阅。

**Q: 如何添加自定义域名？**
A: 在仓库根目录添加 CNAME 文件，并在域名提供商处设置相应的 DNS 记录。