# GitHub Pages 故障排除指南

## 🚨 常见问题：游戏时长无法累计

如果你在 GitHub Pages 上发现游戏时长总是清零，请按以下步骤排查：

### 1. 🔍 快速诊断

访问调试页面进行自动诊断：
```
https://your-username.github.io/game-time-monitor/debug.html
```

### 2. 📋 常见原因和解决方案

#### 问题 A: 混合内容阻止
**现象**: 无法连接到 MQTT Broker，控制台显示混合内容错误
**原因**: GitHub Pages 使用 HTTPS，但 MQTT Broker 使用 HTTP (ws://)
**解决方案**:
- ✅ 使用 WSS (安全 WebSocket): `wss://your-broker.com:8084/mqtt`
- ❌ 避免使用 WS (不安全): `ws://your-broker.com:8083/mqtt`

#### 问题 B: localStorage 被清除
**现象**: 每次刷新页面数据都丢失
**原因**: 浏览器隐私设置或第三方 Cookie 阻止
**解决方案**:
1. 检查浏览器设置，允许 GitHub Pages 域名存储数据
2. 在浏览器中添加 `*.github.io` 到信任站点
3. 禁用严格的隐私模式

#### 问题 C: 跨域问题
**现象**: MQTT 连接失败，控制台显示 CORS 错误
**原因**: MQTT Broker 不允许来自 GitHub Pages 的连接
**解决方案**:
1. 配置 MQTT Broker 允许跨域连接
2. 使用支持 CORS 的公共 MQTT Broker
3. 使用代理服务器

#### 问题 D: 缓存问题
**现象**: 修改后的代码没有生效
**原因**: 浏览器或 CDN 缓存
**解决方案**:
1. 强制刷新: `Ctrl+F5` (Windows) 或 `Cmd+Shift+R` (Mac)
2. 清除浏览器缓存
3. 使用隐身模式测试

### 3. 🔧 推荐的 MQTT Broker 配置

#### 免费公共 Broker (支持 WSS)
```javascript
// HiveMQ 公共 Broker
wss://broker.hivemq.com:8884/mqtt

// Eclipse Mosquitto 测试服务器
wss://test.mosquitto.org:8081/mqtt

// EMQX 公共 Broker
wss://broker.emqx.io:8084/mqtt
```

#### 自建 Broker 配置示例
```bash
# Mosquitto 配置文件 mosquitto.conf
listener 1883
listener 8083
protocol websockets

listener 8084
protocol websockets
cafile /path/to/ca.crt
certfile /path/to/server.crt
keyfile /path/to/server.key

# 允许跨域
allow_anonymous true
```

### 4. 🛠️ 调试步骤

#### 步骤 1: 检查浏览器控制台
1. 按 `F12` 打开开发者工具
2. 查看 Console 标签页的错误信息
3. 查看 Network 标签页的网络请求

#### 步骤 2: 测试 localStorage
```javascript
// 在控制台中运行
localStorage.setItem('test', 'hello');
console.log(localStorage.getItem('test')); // 应该输出 'hello'
localStorage.removeItem('test');
```

#### 步骤 3: 测试 WebSocket 连接
```javascript
// 在控制台中运行
const ws = new WebSocket('wss://broker.hivemq.com:8884/mqtt');
ws.onopen = () => console.log('WebSocket 连接成功');
ws.onerror = (err) => console.error('WebSocket 错误:', err);
```

#### 步骤 4: 检查 MQTT 连接
使用调试页面的 "测试 MQTT 连接" 功能

### 5. 📱 浏览器兼容性

#### 支持的浏览器
- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

#### 不支持的浏览器
- ❌ Internet Explorer
- ❌ 旧版本移动浏览器

### 6. 🔒 隐私和安全设置

#### Chrome 设置
1. 进入 `chrome://settings/content/cookies`
2. 确保 "阻止第三方 Cookie" 未启用
3. 将 `[*.]github.io` 添加到允许列表

#### Firefox 设置
1. 进入 `about:preferences#privacy`
2. 设置为 "标准" 隐私保护
3. 或将 GitHub Pages 添加到例外

#### Safari 设置
1. 进入 Safari > 偏好设置 > 隐私
2. 取消勾选 "阻止所有 Cookie"
3. 或选择 "阻止来自第三方和广告商的 Cookie"

### 7. 🚀 性能优化建议

#### 减少数据大小
- 限制历史事件数量 (当前: 50条)
- 定期清理旧数据
- 使用数据压缩

#### 提高连接稳定性
- 使用可靠的 MQTT Broker
- 实现重连机制 (已内置)
- 监控连接状态

### 8. 📊 数据备份和恢复

#### 导出数据
1. 访问调试页面
2. 点击 "导出数据" 按钮
3. 保存 JSON 文件

#### 导入数据
1. 访问调试页面
2. 点击 "导入数据" 按钮
3. 选择之前导出的 JSON 文件

### 9. 🆘 获取帮助

如果以上方法都无法解决问题：

1. **创建 Issue**: 在 GitHub 仓库中创建详细的问题报告
2. **提供信息**: 包含浏览器版本、错误信息、调试页面截图
3. **测试环境**: 说明是否在本地环境正常工作

#### Issue 模板
```markdown
**问题描述**
简要描述遇到的问题

**环境信息**
- 浏览器: Chrome 120.0.0.0
- 操作系统: Windows 11
- 访问地址: https://username.github.io/game-time-monitor/

**错误信息**
粘贴控制台中的错误信息

**调试信息**
访问 debug.html 页面，提供系统状态和数据存储状态的截图

**重现步骤**
1. 打开页面
2. 连接 MQTT
3. 发送测试消息
4. 刷新页面
5. 观察数据是否丢失

**期望行为**
数据应该持久保存，刷新后仍然存在
```

### 10. 🔄 临时解决方案

如果问题暂时无法解决，可以使用以下临时方案：

1. **本地部署**: 在本地运行项目
2. **其他托管**: 使用 Netlify、Vercel 等其他静态托管服务
3. **数据导出**: 定期导出数据作为备份

---

💡 **提示**: 大多数问题都与浏览器的安全策略和隐私设置有关。确保允许 GitHub Pages 存储数据是解决问题的关键。