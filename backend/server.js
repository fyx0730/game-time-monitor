const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const GameDatabase = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');

// 数据库实例
const db = new GameDatabase();
let isDbInitialized = false;

// CORS 配置 - 支持多个域名
const allowedOrigins = [
    'http://localhost:8000',
    'http://localhost:3001',
    'http://127.0.0.1:8000',
    'https://fyx0730.github.io',
    'https://your-username.github.io', // 通用 GitHub Pages
    process.env.CORS_ORIGIN
].filter(Boolean); // 过滤掉 undefined

console.log('🌐 配置的跨域源:', allowedOrigins);

// 中间件
app.use(cors({
    origin: function (origin, callback) {
        console.log('🌍 请求来源:', origin);
        
        // 允许没有 origin 的请求 (如移动应用、Postman)
        if (!origin) {
            console.log('✅ 允许无来源请求');
            return callback(null, true);
        }
        
        // 检查是否在允许列表中
        if (allowedOrigins.indexOf(origin) !== -1) {
            console.log('✅ 来源在允许列表中');
            callback(null, true);
        } else if (origin.endsWith('.github.io') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
            // 动态允许 GitHub Pages 和本地开发
            console.log('✅ 动态允许的来源');
            callback(null, true);
        } else {
            console.log('❌ 不允许的来源:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
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

// 初始化数据库
async function initializeDatabase() {
    try {
        console.log('🔄 正在初始化数据库...');
        await db.initialize();
        isDbInitialized = true;
        console.log('✅ 数据库初始化完成');
    } catch (error) {
        console.error('❌ 数据库初始化失败:', error);
        console.log('⚠️ 将使用文件存储作为备用方案');
        isDbInitialized = false;
    }
}

// 数据库中间件 - 检查数据库状态
app.use(async (req, res, next) => {
    if (!isDbInitialized && req.path.startsWith('/api/')) {
        // 尝试重新初始化数据库
        try {
            await initializeDatabase();
        } catch (error) {
            console.log('数据库仍不可用，使用文件存储');
        }
    }
    next();
});

// 获取用户数据文件路径
function getUserDataPath(userId) {
    return path.join(DATA_DIR, `${userId}.json`);
}

// API: 获取用户数据
app.get('/api/data/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        console.log(`💾 请求获取用户数据: ${userId}`);
        
        // 优先使用数据库
        if (isDbInitialized) {
            try {
                const data = await db.getUserData(userId);
                res.json({
                    success: true,
                    data: data,
                    source: 'database',
                    message: '从数据库获取数据成功'
                });
                console.log(`✅ 从数据库获取数据成功: ${userId}`);
                return;
            } catch (dbError) {
                console.warn(`⚠️ 数据库读取失败，尝试文件存储:`, dbError.message);
            }
        }
        
        // 备用方案：文件存储
        const filePath = getUserDataPath(userId);
        
        try {
            const data = await fs.readFile(filePath, 'utf8');
            res.json({
                success: true,
                data: JSON.parse(data),
                source: 'file',
                message: '从文件获取数据成功'
            });
            console.log(`✅ 从文件获取数据成功: ${userId}`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // 文件不存在，返回空数据
                res.json({
                    success: true,
                    data: {
                        players: [],
                        events: [],
                        timestamp: new Date().toISOString(),
                        version: '2.0'
                    },
                    source: 'default',
                    message: '用户数据不存在，返回默认数据'
                });
                console.log(`🆕 用户数据不存在，返回默认数据: ${userId}`);
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
        
        console.log(`💾 请求保存用户数据: ${userId}`);
        
        // 优先使用数据库
        if (isDbInitialized) {
            try {
                await db.saveUserData(userId, data);
                res.json({
                    success: true,
                    source: 'database',
                    message: '数据保存到数据库成功',
                    timestamp: new Date().toISOString()
                });
                console.log(`✅ 数据保存到数据库成功: ${userId}`);
                return;
            } catch (dbError) {
                console.warn(`⚠️ 数据库保存失败，尝试文件存储:`, dbError.message);
            }
        }
        
        // 备用方案：文件存储
        const dataWithTimestamp = {
            ...data,
            serverTimestamp: new Date().toISOString(),
            version: '2.0'
        };
        
        const filePath = getUserDataPath(userId);
        await fs.writeFile(filePath, JSON.stringify(dataWithTimestamp, null, 2));
        
        res.json({
            success: true,
            source: 'file',
            message: '数据保存到文件成功',
            timestamp: dataWithTimestamp.serverTimestamp
        });
        
        console.log(`✅ 数据保存到文件成功: ${userId} (${JSON.stringify(dataWithTimestamp).length} bytes)`);
        
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
        console.log('💾 请求获取用户列表');
        
        // 优先使用数据库
        if (isDbInitialized) {
            try {
                const users = await db.getAllUsers();
                res.json({
                    success: true,
                    users: users,
                    source: 'database',
                    message: `从数据库找到 ${users.length} 个用户`
                });
                console.log(`✅ 从数据库获取用户列表成功: ${users.length} 个用户`);
                return;
            } catch (dbError) {
                console.warn(`⚠️ 数据库读取失败，尝试文件存储:`, dbError.message);
            }
        }
        
        // 备用方案：文件存储
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
            source: 'file',
            message: `从文件找到 ${users.length} 个用户`
        });
        console.log(`✅ 从文件获取用户列表成功: ${users.length} 个用户`);
        
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
        console.log(`💾 请求删除用户数据: ${userId}`);
        
        let deleted = false;
        
        // 优先使用数据库
        if (isDbInitialized) {
            try {
                deleted = await db.deleteUser(userId);
                if (deleted) {
                    res.json({
                        success: true,
                        source: 'database',
                        message: '用户数据从数据库删除成功'
                    });
                    console.log(`✅ 用户数据从数据库删除成功: ${userId}`);
                    return;
                }
            } catch (dbError) {
                console.warn(`⚠️ 数据库删除失败，尝试文件存储:`, dbError.message);
            }
        }
        
        // 备用方案：文件存储
        const filePath = getUserDataPath(userId);
        
        await fs.unlink(filePath);
        
        res.json({
            success: true,
            source: 'file',
            message: '用户数据从文件删除成功'
        });
        
        console.log(`✅ 用户数据从文件删除成功: ${userId}`);
        
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
app.get('/api/health', async (req, res) => {
    const dbStatus = isDbInitialized ? '✅ SQLite 数据库' : '⚠️ 文件存储 (备用)';
    
    let dbInfo = null;
    if (isDbInitialized) {
        try {
            const users = await db.getAllUsers();
            dbInfo = {
                userCount: users.length,
                totalSessions: users.reduce((sum, user) => sum + (user.sessionCount || 0), 0),
                totalEvents: users.reduce((sum, user) => sum + (user.eventCount || 0), 0)
            };
        } catch (error) {
            dbInfo = { error: error.message };
        }
    }
    
    res.json({
        success: true,
        message: '服务器运行正常',
        database: dbStatus,
        dbInfo: dbInfo,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API: 获取数据库统计信息
app.get('/api/stats', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!isDbInitialized) {
            return res.status(503).json({
                success: false,
                message: '数据库不可用，统计功能需要 SQLite 数据库'
            });
        }
        
        const stats = await db.getStatistics(startDate, endDate);
        
        res.json({
            success: true,
            stats: stats,
            message: `获取到 ${stats.length} 天的统计数据`
        });
        
    } catch (error) {
        console.error('获取统计数据失败:', error);
        res.status(500).json({
            success: false,
            message: '获取统计数据失败: ' + error.message
        });
    }
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
        
        // 初始化数据库
        await initializeDatabase();
        
        // 确保使用正确的主机和端口
        const host = process.env.HOST || '0.0.0.0';
        const port = process.env.PORT || 3001;
        
        const server = app.listen(port, host, () => {
            console.log('🚀 游戏时长监控后台服务已启动');
            console.log('📡 服务端口:', port);
            console.log('🏠 监听主机:', host);
            console.log('📁 数据目录:', DATA_DIR);
            console.log('💾 数据库状态:', isDbInitialized ? '✅ SQLite 数据库' : '⚠️ 文件存储 (备用)');
            console.log('🌐 允许的跨域源:', allowedOrigins.filter(Boolean));
            console.log('📱 环境:', process.env.NODE_ENV || 'development');
            
            // Railway 环境变量
            if (process.env.RAILWAY_PUBLIC_DOMAIN) {
                console.log('🔗 Railway 域名:', process.env.RAILWAY_PUBLIC_DOMAIN);
                console.log('🔗 健康检查:', `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/api/health`);
            } else {
                console.log('🔗 本地地址:', `http://${host}:${port}`);
                console.log('🔗 健康检查:', `http://${host}:${port}/api/health`);
            }
        });
        
        server.on('error', (error) => {
            console.error('❌ 服务器启动失败:', error);
            if (error.code === 'EADDRINUSE') {
                console.error(`端口 ${port} 已被占用`);
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
        
    } catch (error) {
        console.error('❌ 启动服务器时发生错误:', error);
        process.exit(1);
    }
}

startServer().catch(console.error);
