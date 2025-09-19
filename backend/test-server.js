// 最简单的测试服务器
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

// 基础路由
app.get('/', (req, res) => {
    res.json({
        message: '🎮 游戏时长监控后台服务',
        status: 'running',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: '服务器运行正常',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 测试服务器启动成功`);
    console.log(`📡 端口: ${PORT}`);
    console.log(`🌐 环境: ${process.env.NODE_ENV || 'development'}`);
});