// 最简单的测试服务器 - 用于排除 Railway 部署问题
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

console.log('🚀 正在启动测试服务器...');
console.log('📋 环境变量:');
console.log('  - NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('  - PORT:', PORT);
console.log('  - HOST:', HOST);
console.log('  - RAILWAY_PUBLIC_DOMAIN:', process.env.RAILWAY_PUBLIC_DOMAIN || '未设置');

// CORS 配置
app.use(cors({
    origin: '*', // 临时允许所有源进行测试
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 基础路由
app.get('/', (req, res) => {
    const response = {
        message: '🎮 游戏时长监控后台服务 (测试版)',
        status: 'running',
        timestamp: new Date().toISOString(),
        environment: {
            port: PORT,
            host: HOST,
            nodeEnv: process.env.NODE_ENV || 'development',
            railwayDomain: process.env.RAILWAY_PUBLIC_DOMAIN || null
        },
        uptime: process.uptime()
    };
    
    console.log('📊 根路径请求:', req.get('origin') || 'no-origin');
    res.json(response);
});

app.get('/api/health', (req, res) => {
    const response = {
        success: true,
        message: '服务器运行正常',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0-test'
    };
    
    console.log('🏥 健康检查请求:', req.get('origin') || 'no-origin');
    res.json(response);
});

// 简单的数据测试端点
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: '测试端点正常',
        timestamp: new Date().toISOString()
    });
});

// 错误处理
app.use((err, req, res, next) => {
    console.error('❌ 服务器错误:', err);
    res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: err.message
    });
});

// 404 处理
app.use((req, res) => {
    console.log('❓ 404 请求:', req.method, req.path);
    res.status(404).json({
        success: false,
        message: '接口不存在',
        path: req.path
    });
});

// 启动服务器
const server = app.listen(PORT, HOST, () => {
    console.log('✅ 测试服务器启动成功');
    console.log(`📡 监听地址: ${HOST}:${PORT}`);
    console.log(`🔗 健康检查: http://${HOST}:${PORT}/api/health`);
    
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
        console.log(`🌐 Railway 域名: https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
        console.log(`🔗 公网健康检查: https://${process.env.RAILWAY_PUBLIC_DOMAIN}/api/health`);
    }
});

server.on('error', (error) => {
    console.error('❌ 服务器启动失败:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`端口 ${PORT} 已被占用`);
    }
    process.exit(1);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('🛑 收到 SIGTERM 信号，正在关闭服务器...');
    server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 收到 SIGINT 信号，正在关闭服务器...');
    server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
    });
});