const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');

// CORS 配置 - 支持多个域名
const allowedOrigins = [
    'http://localhost:8000',
    'http://localhost:3001',
    'http://127.0.0.1:8000',
    'https://fyx0730.github.io',
    process.env.CORS_ORIGIN
].filter(Boolean); // 过滤掉 undefined

// 中间件
app.use(cors({
    origin: function (origin, callback) {
        // 允许没有 origin 的请求 (如移动应用)
        if (!origin) return callback(null, true);
        
        // 检查是否在允许列表中
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else if (origin.endsWith('.github.io') || origin.includes('localhost')) {
            // 动态允许 GitHub Pages 和本地开发
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// 静态文件服务 (可选，用于本地开发)
if (process.env.NODE_ENV !== 'production') {
    app.use(express.static(path.join(__dirname, '../')));
}

// 确保数据目录存在
async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

// 获取用户数据文件路径
function getUserDataPath(userId) {
    return path.join(DATA_DIR, `${userId}.json`);
}

// API: 获取用户数据
app.get('/api/data/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const filePath = getUserDataPath(userId);
        
        try {
            const data = await fs.readFile(filePath, 'utf8');
            res.json({
                success: true,
                data: JSON.parse(data),
                message: '数据获取成功'
            });
        } catch (error) {
            if (error.code === 'ENOENT') {
                // 文件不存在，返回空数据
                res.json({
                    success: true,
                    data: {
                        players: [],
                        events: [],
                        timestamp: new Date().toISOString(),
                        version: '1.0'
                    },
                    message: '用户数据不存在，返回默认数据'
                });
            } else {
                throw error;
            }
        }
    } catch (error) {
        console.error('获取数据失败:', error);
        res.status(500).json({
            success: false,
            message: '获取数据失败: ' + error.message
        });
    }
});

// API: 保存用户数据
app.post('/api/data/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { data } = req.body;
        
        if (!data) {
            return res.status(400).json({
                success: false,
                message: '数据不能为空'
            });
        }
        
        // 添加服务器时间戳
        const dataWithTimestamp = {
            ...data,
            serverTimestamp: new Date().toISOString(),
            version: '1.0'
        };
        
        const filePath = getUserDataPath(userId);
        await fs.writeFile(filePath, JSON.stringify(dataWithTimestamp, null, 2));
        
        res.json({
            success: true,
            message: '数据保存成功',
            timestamp: dataWithTimestamp.serverTimestamp
        });
        
        console.log(`数据已保存: ${userId} (${JSON.stringify(dataWithTimestamp).length} bytes)`);
        
    } catch (error) {
        console.error('保存数据失败:', error);
        res.status(500).json({
            success: false,
            message: '保存数据失败: ' + error.message
        });
    }
});

// API: 获取所有用户列表
app.get('/api/users', async (req, res) => {
    try {
        const files = await fs.readdir(DATA_DIR);
        const users = files
            .filter(file => file.endsWith('.json'))
            .map(file => file.replace('.json', ''));
        
        // 获取每个用户的基本信息
        const userInfos = await Promise.all(
            users.map(async (userId) => {
                try {
                    const filePath = getUserDataPath(userId);
                    const stats = await fs.stat(filePath);
                    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
                    
                    return {
                        userId,
                        playerCount: data.players ? data.players.length : 0,
                        eventCount: data.events ? data.events.length : 0,
                        lastModified: stats.mtime,
                        lastSaved: data.timestamp || data.serverTimestamp
                    };
                } catch (error) {
                    return {
                        userId,
                        error: error.message
                    };
                }
            })
        );
        
        res.json({
            success: true,
            users: userInfos,
            message: `找到 ${users.length} 个用户`
        });
        
    } catch (error) {
        console.error('获取用户列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取用户列表失败: ' + error.message
        });
    }
});

// API: 删除用户数据
app.delete('/api/data/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const filePath = getUserDataPath(userId);
        
        await fs.unlink(filePath);
        
        res.json({
            success: true,
            message: '用户数据已删除'
        });
        
        console.log(`用户数据已删除: ${userId}`);
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({
                success: false,
                message: '用户数据不存在'
            });
        } else {
            console.error('删除数据失败:', error);
            res.status(500).json({
                success: false,
                message: '删除数据失败: ' + error.message
            });
        }
    }
});

// API: 健康检查
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: '服务器运行正常',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 根路径处理
app.get('/', (req, res) => {
    res.json({
        message: '🎮 游戏时长监控后台服务',
        status: 'running',
        endpoints: {
            health: '/api/health',
            users: '/api/users',
            userData: '/api/data/:userId'
        },
        timestamp: new Date().toISOString()
    });
});

// 启动服务器
async function startServer() {
    try {
        await ensureDataDir();
        console.log('✅ 数据目录已创建');
        
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log('🚀 游戏时长监控后台服务已启动');
            console.log('📡 服务端口:', PORT);
            console.log('📁 数据目录:', DATA_DIR);
            console.log('🌐 允许的跨域源:', allowedOrigins.filter(Boolean));
            console.log('📱 环境:', process.env.NODE_ENV || 'development');
            
            // Railway 环境变量
            if (process.env.RAILWAY_PUBLIC_DOMAIN) {
                console.log('🔗 Railway 域名:', process.env.RAILWAY_PUBLIC_DOMAIN);
                console.log('🔗 健康检查:', `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/api/health`);
            } else {
                console.log('🔗 本地地址:', `http://localhost:${PORT}`);
                console.log('🔗 健康检查:', `http://localhost:${PORT}/api/health`);
            }
        });
        
        server.on('error', (error) => {
            console.error('❌ 服务器启动失败:', error);
            process.exit(1);
        });
        
    } catch (error) {
        console.error('❌ 启动服务器时发生错误:', error);
        process.exit(1);
    }
}

startServer().catch(console.error);
