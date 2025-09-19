// IndexedDB 存储方案 - 替代 Railway 后台
class IndexedDBStorage {
    constructor() {
        this.dbName = 'GameMonitorDB';
        this.version = 1;
        this.db = null;
    }

    // 初始化数据库
    async initialize() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => {
                console.error('IndexedDB 打开失败:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB 初始化成功');
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 创建用户表
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'id' });
                    userStore.createIndex('name', 'name', { unique: false });
                    userStore.createIndex('lastActive', 'lastActive', { unique: false });
                }
                
                // 创建会话表
                if (!db.objectStoreNames.contains('sessions')) {
                    const sessionStore = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
                    sessionStore.createIndex('userId', 'userId', { unique: false });
                    sessionStore.createIndex('startTime', 'startTime', { unique: false });
                }
                
                // 创建事件表
                if (!db.objectStoreNames.contains('events')) {
                    const eventStore = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
                    eventStore.createIndex('userId', 'userId', { unique: false });
                    eventStore.createIndex('timestamp', 'timestamp', { unique: false });
                    eventStore.createIndex('type', 'type', { unique: false });
                }
                
                console.log('✅ IndexedDB 表结构创建完成');
            };
        });
    }

    // 保存用户数据
    async saveUserData(userId, data) {
        if (!this.db) await this.initialize();
        
        const transaction = this.db.transaction(['users', 'sessions', 'events'], 'readwrite');
        const userStore = transaction.objectStore('users');
        const sessionStore = transaction.objectStore('sessions');
        const eventStore = transaction.objectStore('events');
        
        try {
            // 保存用户信息
            if (data.players && data.players.length > 0) {
                for (const [playerId, playerData] of data.players) {
                    const user = {
                        id: playerId,
                        name: playerData.name || playerId,
                        totalTime: playerData.totalTime || 0,
                        isOnline: playerData.isOnline || false,
                        lastActive: new Date(),
                        metadata: {
                            sessions: playerData.sessions?.length || 0,
                            createdAt: playerData.createdAt || new Date()
                        }
                    };
                    await this.putData(userStore, user);
                    
                    // 保存会话数据
                    if (playerData.sessions) {
                        for (const session of playerData.sessions) {
                            if (session.startTime && session.duration > 0) {
                                const sessionData = {
                                    userId: playerId,
                                    sessionId: session.sessionId,
                                    startTime: new Date(session.startTime),
                                    endTime: session.endTime ? new Date(session.endTime) : null,
                                    duration: session.duration,
                                    estimated: session.estimated || false
                                };
                                await this.putData(sessionStore, sessionData);
                            }
                        }
                    }
                }
            }
            
            // 保存事件数据
            if (data.events) {
                for (const event of data.events.slice(0, 50)) { // 限制事件数量
                    const eventData = {
                        userId: event.playerId,
                        type: event.type,
                        message: event.description,
                        sessionId: event.sessionId,
                        timestamp: new Date(event.timestamp)
                    };
                    await this.putData(eventStore, eventData);
                }
            }
            
            console.log(`✅ 用户数据已保存到 IndexedDB: ${userId}`);
            return true;
            
        } catch (error) {
            console.error('保存到 IndexedDB 失败:', error);
            throw error;
        }
    }

    // 获取用户数据
    async getUserData(userId) {
        if (!this.db) await this.initialize();
        
        try {
            const transaction = this.db.transaction(['users', 'sessions', 'events'], 'readonly');
            const userStore = transaction.objectStore('users');
            const sessionStore = transaction.objectStore('sessions');
            const eventStore = transaction.objectStore('events');
            
            // 获取用户信息
            const user = await this.getData(userStore, userId);
            
            if (!user) {
                return {
                    players: [],
                    events: [],
                    timestamp: new Date().toISOString(),
                    version: '2.0'
                };
            }
            
            // 获取用户的会话
            const sessions = await this.getDataByIndex(sessionStore, 'userId', userId);
            
            // 获取用户的事件
            const events = await this.getDataByIndex(eventStore, 'userId', userId);
            
            // 转换为前端期望的格式
            const playerData = [userId, {
                id: user.id,
                name: user.name,
                totalTime: user.totalTime,
                sessions: sessions.map(session => ({
                    startTime: session.startTime,
                    endTime: session.endTime,
                    duration: session.duration,
                    sessionId: session.sessionId,
                    estimated: session.estimated
                })),
                isOnline: user.isOnline,
                currentSession: user.isOnline ? sessions[0] : null,
                createdAt: user.metadata?.createdAt
            }];
            
            const formattedEvents = events.map(event => ({
                playerId: event.userId,
                type: event.type,
                timestamp: event.timestamp,
                description: event.message,
                sessionId: event.sessionId
            }));
            
            return {
                players: [playerData],
                events: formattedEvents,
                timestamp: new Date().toISOString(),
                version: '2.0'
            };
            
        } catch (error) {
            console.error('从 IndexedDB 获取数据失败:', error);
            throw error;
        }
    }

    // 获取所有用户
    async getAllUsers() {
        if (!this.db) await this.initialize();
        
        try {
            const transaction = this.db.transaction(['users'], 'readonly');
            const userStore = transaction.objectStore('users');
            
            const users = await this.getAllData(userStore);
            
            return users.map(user => ({
                userId: user.id,
                name: user.name,
                totalTime: user.totalTime,
                isOnline: user.isOnline,
                sessionCount: user.metadata?.sessions || 0,
                lastActive: user.lastActive
            }));
            
        } catch (error) {
            console.error('获取所有用户失败:', error);
            throw error;
        }
    }

    // 删除用户数据
    async deleteUser(userId) {
        if (!this.db) await this.initialize();
        
        try {
            const transaction = this.db.transaction(['users', 'sessions', 'events'], 'readwrite');
            const userStore = transaction.objectStore('users');
            const sessionStore = transaction.objectStore('sessions');
            const eventStore = transaction.objectStore('events');
            
            // 删除用户
            await this.deleteData(userStore, userId);
            
            // 删除用户的会话
            const sessions = await this.getDataByIndex(sessionStore, 'userId', userId);
            for (const session of sessions) {
                await this.deleteData(sessionStore, session.id);
            }
            
            // 删除用户的事件
            const events = await this.getDataByIndex(eventStore, 'userId', userId);
            for (const event of events) {
                await this.deleteData(eventStore, event.id);
            }
            
            console.log(`✅ 用户已删除: ${userId}`);
            return true;
            
        } catch (error) {
            console.error('删除用户失败:', error);
            throw error;
        }
    }

    // 辅助方法：Promise 包装的 IndexedDB 操作
    putData(store, data) {
        return new Promise((resolve, reject) => {
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    getData(store, key) {
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    getDataByIndex(store, indexName, value) {
        return new Promise((resolve, reject) => {
            const index = store.index(indexName);
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    getAllData(store) {
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    deleteData(store, key) {
        return new Promise((resolve, reject) => {
            const request = store.delete(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 导出数据（用于备份）
    async exportData() {
        try {
            const users = await this.getAllUsers();
            const allData = {
                users: users,
                exportTime: new Date().toISOString(),
                version: '2.0'
            };
            
            const dataStr = JSON.stringify(allData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `game-monitor-indexeddb-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            console.log('✅ IndexedDB 数据导出成功');
            
        } catch (error) {
            console.error('导出数据失败:', error);
            throw error;
        }
    }

    // 获取存储统计信息
    async getStorageStats() {
        if (!this.db) await this.initialize();
        
        try {
            const users = await this.getAllUsers();
            
            // 估算存储使用量（如果浏览器支持）
            let storageEstimate = null;
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                storageEstimate = await navigator.storage.estimate();
            }
            
            return {
                userCount: users.length,
                totalUsers: users.length,
                onlineUsers: users.filter(u => u.isOnline).length,
                storageEstimate: storageEstimate,
                dbVersion: this.version,
                dbName: this.dbName
            };
            
        } catch (error) {
            console.error('获取存储统计失败:', error);
            return null;
        }
    }
}

// 导出类供全局使用
window.IndexedDBStorage = IndexedDBStorage;
