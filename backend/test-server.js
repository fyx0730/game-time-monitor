// 最简单的测试服务器 - 用于排除 Railway 部署问题
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = parseInt(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

console.log('🚀 正在启动测试服务器...');
console.log('📋 环境变量:');
console.log('  - NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('  - PORT:', PORT, '(type:', typeof PORT, ')');
console.log('  - HOST:', HOST);
console.log('  - RAILWAY_PUBLIC_DOMAIN:', process.env.RAILWAY_PUBLIC_DOMAIN || '未设置');

// 简单的健康检查，确保进程不会立即退出
let isHealthy = true;
let startTime = Date.now();

// CORS 配置
app.use(cors({
    origin: '*', // 临时允许所有源进行测试
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 添加请求日志
app.use((req, res, next) => {
    console.log(`📡 ${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.get('origin') || 'none'}`);
    next();
});

// 基础路由
app.get('/', (req, res) => {
    const uptime = Date.now() - startTime;
    const response = {
        message: '🎮 游戏时长监控后台服务 (测试版)',
        status: 'running',
        healthy: isHealthy,
        timestamp: new Date().toISOString(),
        environment: {
            port: PORT,
            host: HOST,
            nodeEnv: process.env.NODE_ENV || 'development',
            railwayDomain: process.env.RAILWAY_PUBLIC_DOMAIN || null,
            nodeVersion: process.version
        },
        uptime: {
            seconds: Math.floor(uptime / 1000),
            human: `${Math.floor(uptime / 1000)}秒`
        },
        memory: process.memoryUsage()
    };
    
    res.json(response);
});

app.get('/api/health', (req, res) => {
    const uptime = Date.now() - startTime;
    const response = {
        success: true,
        message: '服务器运行正常',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(uptime / 1000),
        memory: process.memoryUsage(),
        version: '1.0.0-test',
        healthy: isHealthy
    };
    
    res.json(response);
});

// 简单的数据测试端点
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: '测试端点正常',
        timestamp: new Date().toISOString(),
        testData: {
            random: Math.random(),
            uptime: Math.floor((Date.now() - startTime) / 1000)
        }
    });
});

// 模拟数据端点（为了测试云端同步）
app.post('/api/data/:userId', (req, res) => {
    console.log('📝 收到数据保存请求:', req.params.userId);
    res.json({
        success: true,
        message: '测试数据保存成功',
        timestamp: new Date().toISOString(),
        userId: req.params.userId
    });
});

app.get('/api/data/:userId', (req, res) => {
    console.log('📖 收到数据获取请求:', req.params.userId);
    res.json({
        success: true,
        data: {
            players: [],
            events: [],
            timestamp: new Date().toISOString(),
            version: '1.0'
        },
        message: '测试数据获取成功'
    });
});

// 错误处理
app.use((err, req, res, next) => {
    console.error('❌ 服务器错误:', err);
    isHealthy = false;
    res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: err.message,
        timestamp: new Date().toISOString()
    });
});

// 404 处理
app.use((req, res) => {
    console.log('❓ 404 请求:', req.method, req.path);
    res.status(404).json({
        success: false,
        message: '接口不存在',
        path: req.path,
        timestamp: new Date().toISOString()
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
    
    // 添加定时检查，确保服务器保持活跃
    setInterval(() => {
        console.log(`🔄 服务器运行中... 运行时间: ${Math.floor((Date.now() - startTime) / 1000)}秒`);
    }, 60000); // 每分钟输出一次
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
    isHealthy = false;
    server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 收到 SIGINT 信号，正在关闭服务器...');
    isHealthy = false;
    server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
    });
});

// 防止未捕获的异常导致进程退出
process.on('uncaughtException', (err) => {
    console.error('❌ 未捕获的异常:', err);
    isHealthy = false;
    // 不立即退出，给 Railway 时间收集日志
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未处理的 Promise 拒绝:', reason);
    isHealthy = false;
});

console.log('🚦 服务器初始化完成，等待连接...');
console.log('📋 进程 PID:', process.pid);
console.log('📋 Node.js 版本:', process.version);