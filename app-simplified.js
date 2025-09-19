// 简化版本的 app.js - 移除了云端存储功能

class GameMonitorDashboard {
    constructor() {
        this.client = null;
        this.players = new Map();
        this.events = [];
        this.chart = null;
        this.isConnected = false;
        this.autoReconnect = true;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        // 存储配置 - 移除了云端存储
        this.storage = {
            type: localStorage.getItem('gameMonitor_storageType') || 'localStorage',
            indexedDB: null,
            githubGist: null
        };
        
        this.initializeElements();
        this.initializeChart();
        this.bindEvents();
        this.loadStoredData();
        this.loadConnectionSettings();
        
        // 页面加载后自动连接
        setTimeout(() => {
            this.autoConnect();
        }, 1000);

        // 启动定期保存
        this.startPeriodicSave();

        // 检查是否在 GitHub Pages 上运行
        if (window.location.hostname.includes('github.io')) {
            console.log('🌐 检测到 GitHub Pages 环境');
            setTimeout(() => {
                if (this.players.size === 0) {
                    this.showNotification('💡 已移除云端存储功能，使用本地存储', 'info');
                }
            }, 3000);
        }
    }

    // ... 保留所有其他方法，但移除云端存储相关的代码 ...
}