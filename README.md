# 🎮 游戏时长监控面板

一个通过 MQTT over WebSocket 实时监控设备游戏时长的可视化面板。

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-部署-brightgreen)](https://your-username.github.io/game-time-monitor/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

## 🌟 在线演示

访问 [在线演示](https://your-username.github.io/game-time-monitor/) 立即体验！

> 注意：请将上面的 `your-username` 替换为你的 GitHub 用户名

## 功能特性

- 🔗 **MQTT over WebSocket 连接** - 直接连接到 MQTT Broker
- 📊 **实时数据展示** - 实时显示玩家状态和游戏时长
- 📈 **可视化图表** - 在线玩家数量趋势图
- 📋 **事件日志** - 记录所有游戏开始/结束事件
- 💾 **数据持久化** - 本地存储累计统计数据
- 📱 **响应式设计** - 支持移动端和桌面端

## 🚀 快速开始

### 在线使用
直接访问 [在线版本](https://your-username.github.io/game-time-monitor/)，无需安装！

### 本地部署
1. **下载项目**
   ```bash
   git clone https://github.com/your-username/game-time-monitor.git
   cd game-time-monitor
   ```

2. **打开面板**
   ```bash
   # 直接用浏览器打开 index.html
   open index.html
   
   # 或者启动本地服务器
   python -m http.server 8000
   # 然后访问 http://localhost:8000
   ```

3. **配置连接**
   - MQTT Broker: 输入你的 MQTT Broker WebSocket 地址
   - 主题: 设置要监听的 MQTT 主题（默认：`game`）

4. **开始监控**
   - 点击连接按钮，面板会自动连接并开始接收数据

## 📦 部署到 GitHub Pages

详细部署指南请查看 [DEPLOY.md](DEPLOY.md)

## MQTT 消息格式

面板期望接收以下格式的 JSON 消息：

### 游戏开始事件
```json
{
  "event": "game_start",
  "playerId": "player123",
  "playerName": "玩家名称",
  "sessionId": "session456",
  "timestamp": "2024-01-01T10:00:00Z"
}
```

### 游戏结束事件
```json
{
  "event": "game_end",
  "playerId": "player123",
  "playerName": "玩家名称", 
  "sessionId": "session456",
  "timestamp": "2024-01-01T11:30:00Z"
}
```

## MQTT 主题建议

推荐使用简单的主题：
- `game` - 监听所有游戏事件（默认，最简单）

## 配置示例

### Mosquitto MQTT Broker (支持 WebSocket)
```bash
# mosquitto.conf
listener 1883
listener 8083
protocol websockets
allow_anonymous true
```

### 测试消息发送
```bash
# 发送游戏开始事件
mosquitto_pub -h localhost -t "game" -m '{"event":"game_start","playerId":"test123","playerName":"测试玩家","sessionId":"sess001","timestamp":"2024-01-01T10:00:00Z"}'

# 发送游戏结束事件  
mosquitto_pub -h localhost -t "game" -m '{"event":"game_end","playerId":"test123","playerName":"测试玩家","sessionId":"sess001","timestamp":"2024-01-01T11:30:00Z"}'
```

## 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **MQTT**: MQTT.js (WebSocket 支持)
- **图表**: Chart.js
- **存储**: localStorage (浏览器本地存储)

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 自定义配置

你可以修改以下配置来适应你的需求：

1. **默认连接参数** (在 `app.js` 中)
2. **消息格式解析** (在 `handleMessage` 方法中)
3. **UI 样式** (在 `style.css` 中)
4. **图表配置** (在 `initializeChart` 方法中)

## 🔧 故障排除

1. **连接失败**
   - 检查 MQTT Broker 是否支持 WebSocket
   - 确认防火墙设置
   - 验证 URL 格式 (ws:// 或 wss://)

2. **没有数据显示**
   - 检查 MQTT 主题是否正确
   - 验证消息格式是否符合要求
   - 查看浏览器控制台错误信息

3. **图表不显示**
   - 确保 Chart.js 库正确加载
   - 检查浏览器兼容性

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 这个仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 📄 许可证

这个项目使用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [MQTT.js](https://github.com/mqttjs/MQTT.js) - MQTT 客户端库
- [Chart.js](https://www.chartjs.org/) - 图表库
- [GitHub Pages](https://pages.github.com/) - 免费静态网站托管

## 📞 联系

如果你有任何问题或建议，请通过以下方式联系：

- 创建 [Issue](https://github.com/your-username/game-time-monitor/issues)
- 发送邮件到 your-email@example.com

---

⭐ 如果这个项目对你有帮助，请给它一个星标！