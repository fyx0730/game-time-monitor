// 数据库配置和模型定义
const { Sequelize, DataTypes, Op } = require('sequelize');
const path = require('path');

// 数据库配置
const DB_PATH = process.env.DATABASE_URL || path.join(__dirname, 'data', 'game_monitor.db');

// 创建 Sequelize 实例
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: DB_PATH,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
    }
});

// 用户模型
const User = sequelize.define('users', {
    id: {
        type: DataTypes.STRING(50),
        primaryKey: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    total_time: {
        type: DataTypes.BIGINT,
        defaultValue: 0,
        allowNull: false
    },
    last_active: {
        type: DataTypes.DATE,
        allowNull: true
    },
    is_online: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    }
});

// 游戏会话模型
const GameSession = sequelize.define('game_sessions', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    session_id: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    start_time: {
        type: DataTypes.DATE,
        allowNull: false
    },
    end_time: {
        type: DataTypes.DATE,
        allowNull: true
    },
    duration: {
        type: DataTypes.BIGINT,
        allowNull: true
    },
    is_estimated: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
});

// 事件日志模型
const EventLog = sequelize.define('event_logs', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    event_type: {
        type: DataTypes.ENUM('game_start', 'game_end', 'system', 'info'),
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    session_id: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    }
});

// 设置关联关系
User.hasMany(GameSession, { foreignKey: 'user_id', as: 'sessions' });
User.hasMany(EventLog, { foreignKey: 'user_id', as: 'events' });
GameSession.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
EventLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// 数据库操作类
class GameDatabase {
    constructor() {
        this.sequelize = sequelize;
        this.User = User;
        this.GameSession = GameSession;
        this.EventLog = EventLog;
        this.Op = Op;
    }

    // 初始化数据库
    async initialize() {
        try {
            await sequelize.authenticate();
            console.log('✅ SQLite 数据库连接成功');
            
            // 同步表结构
            await sequelize.sync({ alter: true });
            console.log('✅ 数据库表结构同步完成');
            
            return true;
        } catch (error) {
            console.error('❌ 数据库初始化失败:', error);
            throw error;
        }
    }

    // 获取用户数据
    async getUserData(userId) {
        try {
            const user = await User.findOne({
                where: { id: userId },
                include: [
                    {
                        model: GameSession,
                        as: 'sessions',
                        order: [['start_time', 'DESC']],
                        limit: 100
                    },
                    {
                        model: EventLog,
                        as: 'events',
                        order: [['timestamp', 'DESC']],
                        limit: 50
                    }
                ]
            });

            if (!user) {
                return {
                    players: [],
                    events: [],
                    timestamp: new Date().toISOString(),
                    version: '2.0'
                };
            }

            // 转换为前端期望的格式
            const playerData = [user.id, {
                id: user.id,
                name: user.name || user.id,
                totalTime: parseInt(user.total_time) || 0,
                sessions: user.sessions.map(session => ({
                    startTime: session.start_time,
                    endTime: session.end_time,
                    duration: parseInt(session.duration) || 0,
                    sessionId: session.session_id,
                    estimated: session.is_estimated
                })),
                isOnline: user.is_online,
                currentSession: user.is_online ? {
                    startTime: user.sessions[0]?.start_time,
                    sessionId: user.sessions[0]?.session_id
                } : null,
                createdAt: user.created_at
            }];

            const events = user.events.map(event => ({
                playerId: event.user_id,
                type: event.event_type,
                timestamp: event.timestamp,
                description: event.message,
                sessionId: event.session_id
            }));

            return {
                players: [playerData],
                events: events,
                timestamp: new Date().toISOString(),
                version: '2.0'
            };

        } catch (error) {
            console.error('获取用户数据失败:', error);
            throw error;
        }
    }

    // 保存用户数据
    async saveUserData(userId, data) {
        const transaction = await sequelize.transaction();
        
        try {
            if (!data.players || !Array.isArray(data.players)) {
                throw new Error('无效的数据格式');
            }

            for (const [playerId, playerData] of data.players) {
                // 更新或创建用户
                const [user] = await User.upsert({
                    id: playerId,
                    name: playerData.name || playerId,
                    total_time: playerData.totalTime || 0,
                    is_online: playerData.isOnline || false,
                    last_active: new Date()
                }, { transaction });

                // 保存会话数据
                if (playerData.sessions && Array.isArray(playerData.sessions)) {
                    for (const session of playerData.sessions) {
                        if (session.startTime && session.duration > 0) {
                            await GameSession.upsert({
                                user_id: playerId,
                                session_id: session.sessionId,
                                start_time: new Date(session.startTime),
                                end_time: session.endTime ? new Date(session.endTime) : null,
                                duration: session.duration,
                                is_estimated: session.estimated || false
                            }, { transaction });
                        }
                    }
                }
            }

            // 保存事件日志
            if (data.events && Array.isArray(data.events)) {
                for (const event of data.events.slice(0, 10)) { // 限制事件数量
                    await EventLog.create({
                        user_id: event.playerId,
                        event_type: event.type,
                        message: event.description,
                        session_id: event.sessionId,
                        timestamp: new Date(event.timestamp)
                    }, { transaction });
                }
            }

            await transaction.commit();
            console.log(`✅ 用户数据已保存: ${userId}`);
            return true;

        } catch (error) {
            await transaction.rollback();
            console.error('保存用户数据失败:', error);
            throw error;
        }
    }

    // 获取所有用户列表
    async getAllUsers() {
        try {
            const users = await User.findAll({
                attributes: ['id', 'name', 'total_time', 'is_online', 'last_active', 'updated_at'],
                include: [
                    {
                        model: GameSession,
                        as: 'sessions',
                        attributes: [[sequelize.fn('COUNT', sequelize.col('sessions.id')), 'session_count']]
                    },
                    {
                        model: EventLog,
                        as: 'events',
                        attributes: [[sequelize.fn('COUNT', sequelize.col('events.id')), 'event_count']]
                    }
                ],
                group: ['users.id']
            });

            return users.map(user => ({
                userId: user.id,
                name: user.name,
                totalTime: parseInt(user.total_time) || 0,
                isOnline: user.is_online,
                sessionCount: user.sessions[0]?.dataValues?.session_count || 0,
                eventCount: user.events[0]?.dataValues?.event_count || 0,
                lastActive: user.last_active,
                lastModified: user.updated_at
            }));

        } catch (error) {
            console.error('获取用户列表失败:', error);
            throw error;
        }
    }

    // 删除用户数据
    async deleteUser(userId) {
        const transaction = await sequelize.transaction();
        
        try {
            // 删除相关的会话和事件
            await GameSession.destroy({ where: { user_id: userId }, transaction });
            await EventLog.destroy({ where: { user_id: userId }, transaction });
            
            // 删除用户
            const deleted = await User.destroy({ where: { id: userId }, transaction });
            
            await transaction.commit();
            
            if (deleted > 0) {
                console.log(`✅ 用户已删除: ${userId}`);
                return true;
            } else {
                return false;
            }

        } catch (error) {
            await transaction.rollback();
            console.error('删除用户失败:', error);
            throw error;
        }
    }

    // 获取统计数据
    async getStatistics(startDate = null, endDate = null) {
        try {
            const whereClause = {};
            if (startDate && endDate) {
                whereClause.start_time = {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                };
            }

            const stats = await GameSession.findAll({
                where: whereClause,
                attributes: [
                    [sequelize.fn('DATE', sequelize.col('start_time')), 'date'],
                    [sequelize.fn('SUM', sequelize.col('duration')), 'total_duration'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'session_count'],
                    [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('user_id'))), 'unique_users']
                ],
                group: [sequelize.fn('DATE', sequelize.col('start_time'))],
                order: [[sequelize.fn('DATE', sequelize.col('start_time')), 'DESC']]
            });

            return stats.map(stat => ({
                date: stat.dataValues.date,
                totalDuration: parseInt(stat.dataValues.total_duration) || 0,
                sessionCount: parseInt(stat.dataValues.session_count) || 0,
                uniqueUsers: parseInt(stat.dataValues.unique_users) || 0
            }));

        } catch (error) {
            console.error('获取统计数据失败:', error);
            throw error;
        }
    }

    // 关闭数据库连接
    async close() {
        await sequelize.close();
        console.log('✅ 数据库连接已关闭');
    }
}

module.exports = GameDatabase;
