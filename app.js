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
        
        // 存储配置
        this.storage = {
            type: localStorage.getItem('gameMonitor_storageType') || 'localStorage', // 'localStorage', 'indexedDB', 'githubGist'
            indexedDB: null,
            githubGist: null
        };
        
        // 云端存储配置（已禁用）
        // this.cloudStorage = {
        //     enabled: false,
        //     serverUrl: this.getDefaultServerUrl(),
        //     userId: this.generateUserId(),
        //     syncInterval: 30000,
        //     lastSync: null
        // };
        
        this.initializeElements();
        this.initializeChart();
        this.bindEvents();
        this.loadStoredData();
        this.loadConnectionSettings();
        // this.initializeCloudStorage(); // 已禁用云端存储
        
        // 页面加载后自动连接
        setTimeout(() => {
            this.autoConnect();
        }, 1000);

        // 启动定期保存
        this.startPeriodicSave();
        
        // this.startCloudSync(); // 已禁用云端同步

        // 检查是否在 GitHub Pages 上运行
        if (window.location.hostname.includes('github.io')) {
            console.log('🌐 检测到 GitHub Pages 环境');
            // 延迟显示提示，避免干扰用户
            setTimeout(() => {
                if (this.players.size === 0) {
                    this.showNotification('💡 如遇到数据保存问题，请点击右上角 🔧 查看调试工具', 'info');
                }
            }, 10000);
        }
    }

    initializeElements() {
        this.elements = {
            status: document.getElementById('status'),
            connectBtn: document.getElementById('connectBtn'),
            brokerUrl: document.getElementById('brokerUrl'),
            topic: document.getElementById('topic'),
            onlinePlayers: document.getElementById('onlinePlayers'),
            todayTotal: document.getElementById('todayTotal'),
            playersList: document.getElementById('playersList'),
            eventsList: document.getElementById('eventsList'),
            startDate: document.getElementById('startDate'),
            endDate: document.getElementById('endDate'),
            dailyStatsList: document.getElementById('dailyStatsList')
        };
    }

    initializeChart() {
        const ctx = document.getElementById('timeChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '在线设备数',
                    data: [],
                    borderColor: '#4299e1',
                    backgroundColor: 'rgba(66, 153, 225, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    }
                }
            }
        });
    }

    bindEvents() {
        this.elements.connectBtn.addEventListener('click', () => {
            if (this.isConnected) {
                this.disconnect();
            } else {
                this.connect();
            }
        });

        // 测试按钮
        document.getElementById('testBtn').addEventListener('click', () => {
            this.testMessage();
        });

        // 添加数据状态检查按钮（开发调试用）
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') {
            this.addDebugButton();
        }

        // 日期筛选按钮
        document.getElementById('filterBtn').addEventListener('click', () => {
            this.updateDailyStats();
        });

        document.getElementById('resetFilterBtn').addEventListener('click', () => {
            this.resetDateFilter();
        });

        // 保存连接设置
        this.elements.brokerUrl.addEventListener('change', () => {
            this.saveConnectionSettings();
        });
        
        this.elements.topic.addEventListener('change', () => {
            this.saveConnectionSettings();
        });

        // 每分钟更新图表
        setInterval(() => {
            this.updateChart();
        }, 60000);

        // 页面关闭前保存数据
        window.addEventListener('beforeunload', () => {
            this.saveData();
            this.saveConnectionSettings();
        });

        // 页面获得焦点时检查连接状态
        window.addEventListener('focus', () => {
            if (!this.isConnected && this.autoReconnect) {
                console.log('页面重新获得焦点，尝试重连...');
                setTimeout(() => {
                    this.autoConnect();
                }, 500);
            }
        });
    }

    connect() {
        const brokerUrl = this.elements.brokerUrl.value;
        const topic = this.elements.topic.value;

        if (!brokerUrl) {
            console.log('MQTT Broker 地址为空，跳过连接');
            return false;
        }

        // 检查是否使用了不安全的 WebSocket 连接
        if (window.location.protocol === 'https:' && brokerUrl.startsWith('ws://')) {
            this.showNotification('⚠️ HTTPS 页面无法连接到不安全的 WebSocket (ws://)，请使用 wss://', 'warning');
            console.warn('混合内容警告: HTTPS 页面尝试连接到不安全的 WebSocket');
        }

        this.updateStatus('connecting', '连接中...');
        this.elements.connectBtn.disabled = true;

        try {
            this.client = mqtt.connect(brokerUrl, {
                clientId: 'game-monitor-' + Math.random().toString(16).substring(2, 10),
                clean: true,
                connectTimeout: 4000,
                reconnectPeriod: 1000,
            });

            this.client.on('connect', () => {
                console.log('MQTT 连接成功');
                this.isConnected = true;
                this.reconnectAttempts = 0; // 重置重连计数
                this.updateStatus('connected', '已连接');
                this.elements.connectBtn.textContent = '断开';
                this.elements.connectBtn.disabled = false;
                this.addEvent('系统', '连接成功', 'info');

                // 订阅主题
                this.client.subscribe(topic, (err) => {
                    if (err) {
                        console.error('订阅失败:', err);
                        this.addEvent('系统', '订阅主题失败: ' + err.message, 'error');
                    } else {
                        console.log('订阅成功:', topic);
                        this.addEvent('系统', '订阅主题: ' + topic, 'info');
                    }
                });

                // 保存连接设置
                this.saveConnectionSettings();
            });

            this.client.on('message', (topic, message) => {
                this.handleMessage(topic, message);
            });

            this.client.on('error', (err) => {
                console.error('MQTT 错误:', err);
                this.updateStatus('disconnected', '连接错误');
                this.elements.connectBtn.disabled = false;
                this.addEvent('系统', '连接错误: ' + err.message, 'error');
                
                // 自动重连
                this.scheduleReconnect();
            });

            this.client.on('close', () => {
                console.log('MQTT 连接关闭');
                this.isConnected = false;
                this.updateStatus('disconnected', '连接关闭');
                this.elements.connectBtn.textContent = '连接';
                this.elements.connectBtn.disabled = false;
                
                // 如果不是手动断开，则尝试重连
                if (this.autoReconnect) {
                    this.scheduleReconnect();
                }
            });

            return true;

        } catch (error) {
            console.error('连接失败:', error);
            this.updateStatus('disconnected', '连接失败');
            this.elements.connectBtn.disabled = false;
            this.addEvent('系统', '连接失败: ' + error.message, 'error');
            
            // 自动重连
            this.scheduleReconnect();
            return false;
        }
    }

    disconnect() {
        this.autoReconnect = false; // 手动断开时停止自动重连
        if (this.client) {
            this.client.end();
            this.client = null;
        }
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.updateStatus('disconnected', '未连接');
        this.elements.connectBtn.textContent = '连接';
        this.addEvent('系统', '手动断开连接', 'info');
    }

    handleMessage(topic, message) {
        try {
            console.log('=== 收到原始消息 ===');
            console.log('主题:', topic);
            console.log('消息内容:', message.toString());
            
            const data = JSON.parse(message.toString());
            console.log('解析后的数据:', data);

            // 直接从消息中获取玩家ID
            const playerId = data.playerId || data.player_id || 'unknown';
            console.log('提取的玩家ID:', playerId);

            // 添加调试事件到界面
            this.addEvent('调试', `收到消息: ${JSON.stringify(data)}`, 'info');

            this.processPlayerEvent(playerId, data);
            this.updateDisplay();
            this.saveData();

        } catch (error) {
            console.error('解析消息失败:', error);
            console.error('原始消息:', message.toString());
            this.addEvent('系统', '消息解析错误: ' + error.message, 'error');
        }
    }

    processPlayerEvent(playerId, data) {
        console.log('=== 处理设备事件 ===');
        console.log('设备ID:', playerId);
        console.log('事件数据:', data);
        
        const now = new Date();
        const event = {
            playerId,
            type: data.event || data.type,
            timestamp: data.timestamp ? new Date(data.timestamp) : now,
            sessionId: data.sessionId,
            ...data
        };

        console.log('处理的事件:', event);

        // 更新设备状态
        if (!this.players.has(playerId)) {
            console.log('创建新设备:', playerId);
            this.players.set(playerId, {
                id: playerId,
                name: data.playerName || data.deviceName || playerId,
                totalTime: 0,
                sessions: [],
                isOnline: false,
                currentSession: null,
                createdAt: new Date().toISOString()
            });
        }

        const player = this.players.get(playerId);
        console.log('当前设备状态:', player);

        if (event.type === 'game_start' || event.type === 'start') {
            console.log('处理游戏开始事件');
            player.isOnline = true;
            player.currentSession = {
                startTime: event.timestamp,
                sessionId: event.sessionId
            };
            this.addEvent(player.name, '开始游戏', 'start');

        } else if (event.type === 'game_end' || event.type === 'end') {
            console.log('处理游戏结束事件');
            
            if (player.currentSession) {
                // 正常情况：有对应的开始会话
                const duration = event.timestamp - player.currentSession.startTime;
                player.totalTime += duration;
                player.sessions.push({
                    ...player.currentSession,
                    endTime: event.timestamp,
                    duration
                });
                player.currentSession = null;
                console.log('正常结束会话，游戏时长:', this.formatDuration(duration));
            } else if (player.isOnline) {
                // 特殊情况：玩家显示在线但没有currentSession（页面刷新后的情况）
                console.log('检测到玩家在线但无会话记录，可能是页面刷新后的结束事件');
                
                // 尝试从最近的会话中估算开始时间，或使用一个合理的默认值
                let estimatedStartTime = event.timestamp;
                
                // 如果有历史会话，使用最后一次会话的结束时间作为可能的开始时间
                if (player.sessions.length > 0) {
                    const lastSession = player.sessions[player.sessions.length - 1];
                    estimatedStartTime = lastSession.endTime || event.timestamp;
                }
                
                // 如果估算的开始时间在结束时间之后，说明可能是跨天的会话，使用今天0点作为开始时间
                if (estimatedStartTime > event.timestamp) {
                    const today = new Date(event.timestamp);
                    today.setHours(0, 0, 0, 0);
                    estimatedStartTime = today;
                }
                
                const estimatedDuration = Math.max(0, event.timestamp - estimatedStartTime);
                
                // 记录这个估算的会话
                player.sessions.push({
                    startTime: estimatedStartTime,
                    endTime: event.timestamp,
                    duration: estimatedDuration,
                    sessionId: event.sessionId,
                    estimated: true // 标记为估算的会话
                });
                
                player.totalTime += estimatedDuration;
                console.log('创建估算会话，估算游戏时长:', this.formatDuration(estimatedDuration));
                this.addEvent(player.name, '结束游戏 (估算时长)', 'end');
            } else {
                // 玩家不在线且没有会话，可能是重复的结束事件
                console.log('收到结束事件但玩家不在线，可能是重复事件');
                this.addEvent(player.name, '收到结束事件 (玩家已离线)', 'info');
            }
            
            player.isOnline = false;
            
        } else {
            console.log('未识别的事件类型:', event.type);
            this.addEvent(player.name, `未知事件: ${event.type}`, 'info');
        }

        console.log('更新后的设备状态:', player);
        console.log('当前所有设备:', Array.from(this.players.entries()));

        // 立即保存重要数据变更
        this.saveData();

        this.events.unshift(event);
        if (this.events.length > 100) {
            this.events = this.events.slice(0, 100);
        }
    }

    updateDisplay() {
        this.updateStats();
        this.updatePlayersList();
        this.updateEventsList();
        this.updateDailyStats();
    }

    updateStats() {
        const onlineCount = Array.from(this.players.values()).filter(p => p.isOnline).length;
        
        // 计算今日总时长 - 使用更灵活的"今日"定义
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        
        let todayTotal = 0;
        let recentTotal = 0; // 最近24小时的总时长
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        this.players.forEach(player => {
            // 已完成的会话
            player.sessions.forEach(session => {
                const sessionStart = new Date(session.startTime);
                const sessionEnd = session.endTime ? new Date(session.endTime) : now;
                
                // 今日时长（从今天0点开始）
                if (sessionStart >= today) {
                    todayTotal += session.duration || 0;
                } else if (sessionEnd >= today) {
                    // 跨天会话：只计算今天部分的时长
                    const todayPortion = sessionEnd.getTime() - today.getTime();
                    todayTotal += Math.min(todayPortion, session.duration || 0);
                }
                
                // 最近24小时时长
                if (sessionStart >= last24Hours) {
                    recentTotal += session.duration || 0;
                } else if (sessionEnd >= last24Hours) {
                    // 跨24小时会话：只计算最近24小时部分
                    const recentPortion = sessionEnd.getTime() - last24Hours.getTime();
                    recentTotal += Math.min(recentPortion, session.duration || 0);
                }
            });
            
            // 当前进行中的会话
            if (player.currentSession) {
                const sessionStart = new Date(player.currentSession.startTime);
                const currentDuration = now.getTime() - sessionStart.getTime();
                
                // 今日进行中的会话
                if (sessionStart >= today) {
                    todayTotal += currentDuration;
                } else if (sessionStart < today) {
                    // 跨天的进行中会话：只计算今天部分
                    const todayPortion = now.getTime() - today.getTime();
                    todayTotal += todayPortion;
                }
                
                // 最近24小时进行中的会话
                if (sessionStart >= last24Hours) {
                    recentTotal += currentDuration;
                } else if (sessionStart < last24Hours) {
                    // 跨24小时的进行中会话：只计算最近24小时部分
                    const recentPortion = now.getTime() - last24Hours.getTime();
                    recentTotal += recentPortion;
                }
            }
        });

        this.elements.onlinePlayers.textContent = onlineCount;
        
        // 更新标签和数据显示
        const todayTotalLabel = document.getElementById('todayTotalLabel');
        if (todayTotal === 0 && recentTotal > 0) {
            // 显示最近24小时的数据
            this.elements.todayTotal.textContent = this.formatDuration(recentTotal);
            if (todayTotalLabel) {
                todayTotalLabel.textContent = '24小时总时长';
            }
        } else {
            // 显示今日数据
            this.elements.todayTotal.textContent = this.formatDuration(todayTotal);
            if (todayTotalLabel) {
                todayTotalLabel.textContent = '今日总时长';
            }
        }
        
        console.log('统计更新:', {
            today: today.toISOString(),
            todayTotal: this.formatDuration(todayTotal),
            recentTotal: this.formatDuration(recentTotal),
            last24Hours: last24Hours.toISOString()
        });
    }

    updatePlayersList() {
        const playersArray = Array.from(this.players.values())
            .sort((a, b) => b.isOnline - a.isOnline);

        this.elements.playersList.innerHTML = playersArray.map(player => {
            const currentDuration = player.currentSession ? 
                Date.now() - player.currentSession.startTime : 0;
            
            // 检查是否有估算的会话
            const hasEstimatedSessions = player.sessions.some(s => s.estimated);
            const estimatedNote = hasEstimatedSessions ? ' (含估算)' : '';
            
            return `
                <div class="player-item ${player.isOnline ? 'online' : 'offline'}">
                    <div class="player-header">
                        <div class="player-name">${player.name}</div>
                        <button class="delete-player-btn" onclick="dashboard.confirmDeletePlayer('${player.id}')" title="删除设备">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3,6 5,6 21,6"></polyline>
                                <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="player-status">
                        <span>状态: ${player.isOnline ? '在线' : '离线'}</span>
                        <span>总时长: ${this.formatDuration(player.totalTime + currentDuration)}${estimatedNote}</span>
                    </div>
                    ${player.isOnline && player.currentSession ? 
                        `<div class="player-status">
                            <span>本次游戏: ${this.formatDuration(currentDuration)}</span>
                        </div>` : ''
                    }
                    ${player.isOnline && !player.currentSession ? 
                        `<div class="player-status">
                            <span style="color: #ed8936;">等待游戏事件...</span>
                        </div>` : ''
                    }
                </div>
            `;
        }).join('');
    }

    updateEventsList() {
        this.elements.eventsList.innerHTML = this.events.slice(0, 20).map(event => {
            const eventType = event.type || 'info';
            const cssClass = eventType.includes('start') ? 'start' : 
                           eventType.includes('end') ? 'end' : 'info';
            
            return `
                <div class="event-item ${cssClass}">
                    <span>${event.playerId}: ${this.getEventDescription(event)}</span>
                    <span class="event-time">${this.formatTime(event.timestamp)}</span>
                </div>
            `;
        }).join('');
    }

    updateChart() {
        const now = new Date();
        const onlineCount = Array.from(this.players.values()).filter(p => p.isOnline).length;
        
        this.chart.data.labels.push(this.formatTime(now));
        this.chart.data.datasets[0].data.push(onlineCount);
        
        // 保持最近24个数据点
        if (this.chart.data.labels.length > 24) {
            this.chart.data.labels.shift();
            this.chart.data.datasets[0].data.shift();
        }
        
        this.chart.update();
    }

    addEvent(playerName, description, type) {
        const event = {
            playerId: playerName,
            type: type,
            timestamp: new Date(),
            description: description
        };
        
        console.log('添加事件到日志:', event);
        
        this.events.unshift(event);
        if (this.events.length > 100) {
            this.events = this.events.slice(0, 100);
        }
        
        this.updateEventsList();
    }

    getEventDescription(event) {
        switch (event.type) {
            case 'game_start':
            case 'start':
                return '开始游戏';
            case 'game_end':
            case 'end':
                return '结束游戏';
            default:
                return event.description || event.type;
        }
    }

    formatDuration(ms) {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }

    formatTime(date) {
        // 确保 date 是 Date 对象
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        
        // 检查是否是有效的日期
        if (isNaN(date.getTime())) {
            return '无效时间';
        }
        
        return date.toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    updateStatus(status, text) {
        this.elements.status.textContent = text;
        this.elements.status.className = status;
        
        // 更新自动连接信息
        const autoConnectInfo = document.getElementById('autoConnectInfo');
        if (autoConnectInfo) {
            if (status === 'connected') {
                autoConnectInfo.textContent = '自动重连已启用';
                autoConnectInfo.style.color = '#48bb78';
            } else if (status === 'connecting') {
                autoConnectInfo.textContent = '正在尝试连接...';
                autoConnectInfo.style.color = '#ed8936';
            } else {
                autoConnectInfo.textContent = this.autoReconnect ? '自动重连已启用' : '自动重连已禁用';
                autoConnectInfo.style.color = this.autoReconnect ? '#718096' : '#f56565';
            }
        }
    }

    saveData() {
        try {
            const data = {
                players: Array.from(this.players.entries()),
                events: this.events.slice(0, 50),
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            
            const jsonData = JSON.stringify(data);
            localStorage.setItem('gameMonitorData', jsonData);
            localStorage.setItem('gameMonitorData_timestamp', data.timestamp);
            
            console.log('✅ 数据保存成功:', {
                playersCount: this.players.size,
                eventsCount: this.events.length,
                dataSize: (jsonData.length / 1024).toFixed(2) + 'KB',
                timestamp: data.timestamp
            });
            
            // 验证保存是否成功
            const saved = localStorage.getItem('gameMonitorData');
            if (!saved) {
                console.error('❌ 数据保存失败: localStorage 返回空值');
                this.showNotification('数据保存失败', 'error');
            } else {
                // 数据已保存到本地存储
                // 云端存储功能已移除
            }
            
        } catch (error) {
            console.error('❌ 数据保存失败:', error);
            this.showNotification('数据保存失败: ' + error.message, 'error');
        }
    }

    loadStoredData() {
        try {
            console.log('🔄 开始加载存储数据...');
            
            // 检查 localStorage 是否可用
            if (typeof(Storage) === "undefined") {
                console.error('❌ 浏览器不支持 localStorage');
                this.showNotification('浏览器不支持数据存储', 'error');
                return;
            }
            
            const stored = localStorage.getItem('gameMonitorData');
            console.log('📦 从 localStorage 读取数据:', stored ? '有数据' : '无数据');
            
            if (stored) {
                const data = JSON.parse(stored);
                console.log('📊 解析数据:', {
                    version: data.version || '未知',
                    timestamp: data.timestamp || '未知',
                    playersCount: data.players ? data.players.length : 0,
                    eventsCount: data.events ? data.events.length : 0
                });
                
                this.players = new Map(data.players || []);
                this.events = data.events || [];
                
                // 页面刷新后，重置所有玩家的currentSession，但保持在线状态
                let resetCount = 0;
                this.players.forEach((player, playerId) => {
                    if (player.currentSession) {
                        console.log(`🔄 重置设备 ${playerId} 的会话状态 (页面刷新)`);
                        player.currentSession = null;
                        resetCount++;
                    }
                    
                    // 确保时间戳是Date对象
                    if (player.sessions) {
                        player.sessions = player.sessions.map(session => ({
                            ...session,
                            startTime: new Date(session.startTime),
                            endTime: session.endTime ? new Date(session.endTime) : null
                        }));
                    }
                });
                
                // 确保事件的时间戳是Date对象
                this.events = this.events.map(event => ({
                    ...event,
                    timestamp: new Date(event.timestamp)
                }));
                
                this.updateDisplay();
                
                console.log('✅ 数据加载完成:', {
                    设备数量: this.players.size,
                    事件数量: this.events.length,
                    重置会话: resetCount
                });
                
                if (this.players.size > 0) {
                    this.showNotification(`已加载 ${this.players.size} 个设备的历史数据`, 'success');
                }
                
            } else {
                console.log('📝 没有找到存储数据，使用默认设置');
            }
            
        } catch (error) {
            console.error('❌ 加载存储数据失败:', error);
            this.showNotification('数据加载失败: ' + error.message, 'error');
            
            // 尝试清除损坏的数据
            try {
                localStorage.removeItem('gameMonitorData');
                console.log('🗑️ 已清除损坏的存储数据');
            } catch (clearError) {
                console.error('清除数据失败:', clearError);
            }
        }
    }

    testMessage() {
        console.log('=== 测试消息处理 ===');
        const testData = {
            event: 'game_start',
            playerId: 'test_player_' + Date.now(),
            playerName: '测试玩家',
            sessionId: 'test_session_' + Date.now(),
            timestamp: new Date().toISOString()
        };
        
        console.log('发送测试消息:', testData);
        this.addEvent('系统', '发送测试消息', 'info');
        
        // 模拟接收到消息
        this.handleMessage('game', JSON.stringify(testData));
    }

    autoConnect() {
        const brokerUrl = this.elements.brokerUrl.value;
        if (brokerUrl && !this.isConnected) {
            console.log('自动连接到 MQTT Broker...');
            this.autoReconnect = true;
            this.connect();
        }
    }

    scheduleReconnect() {
        if (!this.autoReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                this.addEvent('系统', `重连失败，已达到最大重试次数 (${this.maxReconnectAttempts})`, 'error');
                this.updateStatus('disconnected', '重连失败');
            }
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000); // 指数退避，最大30秒
        
        console.log(`计划在 ${delay/1000} 秒后重连 (第 ${this.reconnectAttempts} 次尝试)`);
        this.updateStatus('connecting', `${delay/1000}秒后重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
            if (this.autoReconnect && !this.isConnected) {
                console.log(`开始第 ${this.reconnectAttempts} 次重连尝试`);
                this.connect();
            }
        }, delay);
    }

    saveConnectionSettings() {
        const settings = {
            brokerUrl: this.elements.brokerUrl.value,
            topic: this.elements.topic.value,
            lastConnected: new Date().toISOString()
        };
        localStorage.setItem('mqttConnectionSettings', JSON.stringify(settings));
        console.log('连接设置已保存');
    }

    loadConnectionSettings() {
        try {
            const stored = localStorage.getItem('mqttConnectionSettings');
            if (stored) {
                const settings = JSON.parse(stored);
                if (settings.brokerUrl) {
                    this.elements.brokerUrl.value = settings.brokerUrl;
                }
                if (settings.topic) {
                    this.elements.topic.value = settings.topic;
                }
                console.log('连接设置已加载:', settings);
            }
        } catch (error) {
            console.error('加载连接设置失败:', error);
        }
        
        // 初始化日期筛选器
        this.initializeDateFilter();
    }

    initializeDateFilter() {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        this.elements.startDate.value = this.formatDateForInput(thirtyDaysAgo);
        this.elements.endDate.value = this.formatDateForInput(now);
    }

    formatDateForInput(date) {
        return date.toISOString().split('T')[0];
    }

    resetDateFilter() {
        this.initializeDateFilter();
        this.updateDailyStats();
    }

    updateDailyStats() {
        const startDate = this.elements.startDate.value ? new Date(this.elements.startDate.value) : null;
        const endDate = this.elements.endDate.value ? new Date(this.elements.endDate.value) : null;
        
        if (endDate) {
            endDate.setHours(23, 59, 59, 999); // 包含结束日期的整天
        }

        // 收集所有日期的统计数据
        const dailyStats = new Map();

        this.players.forEach(player => {
            player.sessions.forEach(session => {
                const sessionStart = new Date(session.startTime);
                const sessionEnd = session.endTime ? new Date(session.endTime) : new Date();
                
                // 应用日期筛选
                if (startDate && sessionEnd < startDate) return;
                if (endDate && sessionStart > endDate) return;

                // 处理可能跨天的会话
                this.addSessionToDailyStats(dailyStats, session, player, sessionStart, sessionEnd);
            });

            // 处理当前进行中的会话
            if (player.currentSession) {
                const sessionStart = new Date(player.currentSession.startTime);
                const sessionEnd = new Date();
                
                if ((!startDate || sessionEnd >= startDate) && (!endDate || sessionStart <= endDate)) {
                    const duration = sessionEnd.getTime() - sessionStart.getTime();
                    const fakeSession = {
                        ...player.currentSession,
                        endTime: sessionEnd,
                        duration: duration,
                        ongoing: true
                    };
                    this.addSessionToDailyStats(dailyStats, fakeSession, player, sessionStart, sessionEnd);
                }
            }
        });

        this.renderDailyStats(dailyStats);
    }

    addSessionToDailyStats(dailyStats, session, player, sessionStart, sessionEnd) {
        // 获取会话涉及的所有日期
        const startDate = new Date(sessionStart);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(sessionEnd);
        endDate.setHours(0, 0, 0, 0);

        // 如果是同一天的会话
        if (startDate.getTime() === endDate.getTime()) {
            const dateKey = this.formatDateKey(startDate);
            this.addToDateStats(dailyStats, dateKey, startDate, player, session.duration || 0, session.ongoing);
        } else {
            // 跨天会话，需要分割到不同日期
            let currentDate = new Date(startDate);
            let remainingDuration = session.duration || 0;

            while (currentDate <= endDate) {
                const dateKey = this.formatDateKey(currentDate);
                const nextDay = new Date(currentDate);
                nextDay.setDate(nextDay.getDate() + 1);

                let dayDuration;
                if (currentDate.getTime() === startDate.getTime()) {
                    // 第一天：从开始时间到当天结束
                    const dayEnd = new Date(currentDate);
                    dayEnd.setHours(23, 59, 59, 999);
                    dayDuration = Math.min(dayEnd.getTime() - sessionStart.getTime(), remainingDuration);
                } else if (currentDate.getTime() === endDate.getTime()) {
                    // 最后一天：从当天开始到结束时间
                    dayDuration = remainingDuration;
                } else {
                    // 中间的完整天：24小时
                    dayDuration = Math.min(24 * 60 * 60 * 1000, remainingDuration);
                }

                this.addToDateStats(dailyStats, dateKey, currentDate, player, dayDuration, session.ongoing && currentDate.getTime() === endDate.getTime());
                remainingDuration -= dayDuration;
                currentDate = nextDay;
            }
        }
    }

    addToDateStats(dailyStats, dateKey, date, player, duration, ongoing = false) {
        if (!dailyStats.has(dateKey)) {
            dailyStats.set(dateKey, {
                date: new Date(date),
                totalDuration: 0,
                players: new Map(),

            });
        }

        const dayStats = dailyStats.get(dateKey);
        dayStats.totalDuration += duration;


        if (!dayStats.players.has(player.id)) {
            dayStats.players.set(player.id, {
                name: player.name,
                duration: 0,

                ongoing: false
            });
        }

        const playerStats = dayStats.players.get(player.id);
        playerStats.duration += duration;

        if (ongoing) playerStats.ongoing = true;
    }

    formatDateKey(date) {
        return date.toISOString().split('T')[0];
    }

    renderDailyStats(dailyStats) {
        const sortedDates = Array.from(dailyStats.entries())
            .sort((a, b) => b[1].date.getTime() - a[1].date.getTime()); // 最新日期在前

        this.elements.dailyStatsList.innerHTML = sortedDates.map(([dateKey, stats]) => {
            const playersArray = Array.from(stats.players.values())
                .sort((a, b) => b.duration - a.duration);

            return `
                <div class="daily-item">
                    <div class="daily-date">${this.formatDisplayDate(stats.date)}</div>
                    <div class="daily-stats-row">
                        <span>总时长:</span>
                        <span class="daily-total">${this.formatDuration(stats.totalDuration)}</span>
                    </div>

                    <div class="daily-stats-row">
                        <span>活跃设备:</span>
                        <span>${stats.players.size}</span>
                    </div>
                    <div class="daily-players">
                        ${playersArray.map(player => `
                            <div class="daily-player-tag">
                                ${player.name}: ${this.formatDuration(player.duration)}
                                ${player.ongoing ? ' (进行中)' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');

        // 显示总计信息
        if (sortedDates.length > 0) {
            const totalDuration = sortedDates.reduce((sum, [, stats]) => sum + stats.totalDuration, 0);

            const allPlayers = new Set();
            sortedDates.forEach(([, stats]) => {
                stats.players.forEach((_, playerId) => allPlayers.add(playerId));
            });

            const summaryHtml = `
                <div class="daily-item" style="border-left-color: #48bb78; background: linear-gradient(135deg, #f0fff4 0%, #f7fafc 100%);">
                    <div class="daily-date">📊 统计汇总 (${sortedDates.length}天)</div>
                    <div class="daily-stats-row">
                        <span>总游戏时长:</span>
                        <span class="daily-total">${this.formatDuration(totalDuration)}</span>
                    </div>

                    <div class="daily-stats-row">
                        <span>参与设备:</span>
                        <span>${allPlayers.size}</span>
                    </div>
                </div>
            `;
            this.elements.dailyStatsList.innerHTML = summaryHtml + this.elements.dailyStatsList.innerHTML;
        }
    }

    formatDisplayDate(date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        if (targetDate.getTime() === today.getTime()) {
            return '今天 ' + date.toLocaleDateString('zh-CN');
        } else if (targetDate.getTime() === yesterday.getTime()) {
            return '昨天 ' + date.toLocaleDateString('zh-CN');
        } else {
            const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            return date.toLocaleDateString('zh-CN') + ' ' + weekdays[date.getDay()];
        }
    }

    confirmDeletePlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) {
            this.showNotification('设备不存在', 'error');
            return;
        }

        const totalTime = this.formatDuration(player.totalTime);
        const sessionsCount = player.sessions.length;
        const isOnline = player.isOnline ? '在线' : '离线';

        const message = `确定要删除设备 "${player.name}" 吗？\n\n设备信息：\n• 状态：${isOnline}\n• 总时长：${totalTime}\n• 历史记录：${sessionsCount} 条\n\n删除后将无法恢复所有相关数据！`;

        if (confirm(message)) {
            this.deletePlayer(playerId);
        }
    }

    deletePlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) {
            this.showNotification('设备不存在', 'error');
            return;
        }

        // 删除设备
        this.players.delete(playerId);

        // 从事件日志中删除相关事件
        this.events = this.events.filter(event => event.playerId !== player.name && event.playerId !== playerId);

        // 保存数据
        this.saveData();

        // 更新显示
        this.updateDisplay();

        // 显示成功提示
        this.showNotification(`设备 "${player.name}" 已删除`, 'success');

        // 添加删除事件到日志
        this.addEvent('系统', `删除设备: ${player.name}`, 'info');
    }

    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // 添加到页面
        document.body.appendChild(notification);

        // 显示动画
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // 自动隐藏
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    addDebugButton() {
        const debugBtn = document.createElement('button');
        debugBtn.textContent = '数据状态';
        debugBtn.style.cssText = 'position: fixed; top: 10px; left: 10px; z-index: 9999; padding: 5px 10px; background: #ed8936; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;';
        debugBtn.onclick = () => this.showDataStatus();
        document.body.appendChild(debugBtn);
    }

    showDataStatus() {
        const stored = localStorage.getItem('gameMonitorData');
        const settings = localStorage.getItem('mqttConnectionSettings');
        
        const status = {
            localStorage可用: typeof(Storage) !== "undefined",
            数据存在: !!stored,
            数据大小: stored ? (stored.length / 1024).toFixed(2) + 'KB' : '0KB',
            设备数量: this.players.size,
            事件数量: this.events.length,
            连接设置: !!settings,
            当前URL: window.location.href,
            协议: window.location.protocol,
            域名: window.location.hostname
        };
        
        console.table(status);
        alert('数据状态（详细信息请查看控制台）:\n' + JSON.stringify(status, null, 2));
    }

    // 定期保存数据（防止数据丢失）
    startPeriodicSave() {
        setInterval(() => {
            if (this.players.size > 0) {
                this.saveData();
                console.log('🔄 定期保存数据完成');
            }
        }, 60000); // 每分钟保存一次
    }

    // ============ 云端存储相关方法 ============
    
    generateUserId() {
        // 尝试从本地存储获取用户ID
        let userId = localStorage.getItem('cloudUserId');
        if (!userId) {
            // 生成新的用户ID
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
            localStorage.setItem('cloudUserId', userId);
        }
        return userId;
    }
    
    getDefaultServerUrl() {
        // 根据环境自动选择默认后台服务地址
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // 本地开发环境
            return 'http://localhost:3001/api';
        } else if (window.location.hostname.endsWith('.github.io')) {
            // GitHub Pages 环境 - 使用 Railway 后台服务
            // 如果 Railway 服务不可用，可以使用以下任意一个备用服务：
            // return 'https://jsonplaceholder.typicode.com'; // 仅供测试
            return 'https://game-time-monitor-production.up.railway.app/api';
        } else {
            // 其他环境，默认使用相对路径
            return '/api';
        }
    }
    
    initializeCloudStorage() {
        // 从本地存储加载云端存储配置
        const storedConfig = localStorage.getItem('cloudStorageConfig');
        if (storedConfig) {
            try {
                const config = JSON.parse(storedConfig);
                this.cloudStorage = { ...this.cloudStorage, ...config };
                console.log('🌐 云端存储配置已加载:', this.cloudStorage);
            } catch (error) {
                console.error('云端存储配置解析失败:', error);
            }
        }
        
        // 添加云端存储设置界面
        this.addCloudStorageUI();
    }
    
    addCloudStorageUI() {
        const configPanel = document.querySelector('.config-panel');
        if (!configPanel) return;
        
        const cloudConfigHtml = `
            <div class="config-item">
                <label>云端存储:</label>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="checkbox" id="cloudEnabled" ${this.cloudStorage.enabled ? 'checked' : ''}>
                    <label for="cloudEnabled" style="margin: 0;">启用</label>
                    <input type="text" id="serverUrl" placeholder="后台服务地址" value="${this.cloudStorage.serverUrl}" style="flex: 1; margin: 0;">
                    <button id="testCloudBtn" style="padding: 8px 12px; margin: 0;">测试</button>
                </div>
                <small style="color: #718096; font-size: 0.8rem;">用户ID: ${this.cloudStorage.userId}</small>
            </div>
        `;
        
        configPanel.insertAdjacentHTML('beforeend', cloudConfigHtml);
        
        // 绑定事件
        document.getElementById('cloudEnabled').addEventListener('change', (e) => {
            this.cloudStorage.enabled = e.target.checked;
            this.saveCloudStorageConfig();
            this.updateCloudStatus();
            if (this.cloudStorage.enabled) {
                this.syncToCloud();
            }
        });
        
        document.getElementById('serverUrl').addEventListener('change', (e) => {
            this.cloudStorage.serverUrl = e.target.value;
            this.saveCloudStorageConfig();
        });
        
        document.getElementById('testCloudBtn').addEventListener('click', () => {
            this.testCloudConnection();
        });
    }
    
    saveCloudStorageConfig() {
        localStorage.setItem('cloudStorageConfig', JSON.stringify(this.cloudStorage));
        this.updateCloudStatus();
    }
    
    updateCloudStatus() {
        const cloudStatusElement = document.getElementById('cloudStatus');
        if (cloudStatusElement) {
            if (this.cloudStorage.enabled) {
                const lastSync = this.cloudStorage.lastSync;
                const syncText = lastSync ? 
                    `上次同步: ${lastSync.toLocaleTimeString()}` : 
                    '正在同步...';
                cloudStatusElement.textContent = `☁️ 云端存储: 已启用 (${syncText})`;
                cloudStatusElement.style.color = '#48bb78';
            } else {
                cloudStatusElement.textContent = '云端存储: 未启用';
                cloudStatusElement.style.color = '#718096';
            }
        }
    }
    
    async testCloudConnection() {
        const testUrl = `${this.cloudStorage.serverUrl}/health`;
        
        try {
            console.log('🔍 正在测试云端连接...', testUrl);
            
            const response = await fetch(testUrl, {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit'
            });
            
            console.log('📶 测试响应:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('✅ 云端服务连接成功', 'success');
                console.log('✅ 连接测试成功:', result);
            } else {
                this.showNotification('❌ 云端服务响应异常', 'error');
            }
        } catch (error) {
            console.error('云端连接测试失败:', error);
            
            let errorMessage = '云端服务连接失败';
            
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                errorMessage = '无法连接到后台服务，请检查：\n1. 服务地址是否正确\n2. 后台服务是否正在运行\n3. 网络连接是否正常';
            } else if (error.message.includes('CORS')) {
                errorMessage = 'CORS 错误：跨域访问被阻止';
            }
            
            this.showNotification('❌ ' + errorMessage, 'error');
        }
    }
    
    startCloudSync() {
        if (!this.cloudStorage.enabled) return;
        
        // 首次加载时尝试从云端同步
        setTimeout(() => {
            this.syncFromCloud();
        }, 2000);
        
        // 定期同步到云端
        setInterval(() => {
            if (this.cloudStorage.enabled && this.players.size > 0) {
                this.syncToCloud();
            }
        }, this.cloudStorage.syncInterval);
    }
    
    async syncToCloud() {
        if (!this.cloudStorage.enabled) return;
        
        try {
            console.log('☁️ 开始同步到云端...', this.cloudStorage.serverUrl);
            
            const data = {
                players: Array.from(this.players.entries()),
                events: this.events.slice(0, 50),
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            
            const requestUrl = `${this.cloudStorage.serverUrl}/data/${this.cloudStorage.userId}`;
            console.log('🔗 请求地址:', requestUrl);
            
            const response = await fetch(requestUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data }),
                mode: 'cors', // 显式设置 CORS 模式
                credentials: 'omit' // 不发送 cookies
            });
            
            console.log('📶 响应状态:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.cloudStorage.lastSync = new Date();
                this.updateCloudStatus();
                console.log('☁️ 数据已同步到云端:', result.timestamp);
            } else {
                console.error('云端同步失败:', result.message);
                this.showNotification('云端同步失败: ' + result.message, 'error');
            }
            
        } catch (error) {
            console.error('云端同步异常:', error);
            
            // 根据错误类型提供更具体的错误信息
            let errorMessage = '云端同步失败';
            
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                errorMessage = '无法连接到云端服务，请检查网络或后台服务状态';
            } else if (error.message.includes('CORS')) {
                errorMessage = '跨域访问被阻止，请检查后台服务 CORS 配置';
            } else if (error.message.includes('HTTP 500')) {
                errorMessage = '后台服务器内部错误';
            } else if (error.message.includes('HTTP 404')) {
                errorMessage = 'API 接口不存在，请检查后台服务地址';
            }
            
            this.showNotification(errorMessage, 'error');
        }
    }
    
    async syncFromCloud() {
        if (!this.cloudStorage.enabled) return;
        
        try {
            const response = await fetch(`${this.cloudStorage.serverUrl}/data/${this.cloudStorage.userId}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                const cloudData = result.data;
                
                // 检查云端数据是否比本地数据新
                const localTimestamp = localStorage.getItem('gameMonitorData_timestamp') || '1970-01-01T00:00:00.000Z';
                const cloudTimestamp = cloudData.timestamp || cloudData.serverTimestamp || '1970-01-01T00:00:00.000Z';
                
                if (new Date(cloudTimestamp) > new Date(localTimestamp)) {
                    console.log('☁️ 发现更新的云端数据，正在同步...');
                    
                    // 合并数据而不是直接覆盖
                    this.mergeCloudData(cloudData);
                    
                    this.updateDisplay();
                    this.showNotification('☁️ 已从云端同步最新数据', 'success');
                    
                } else {
                    console.log('☁️ 本地数据已是最新版本');
                }
                
            } else {
                console.log('☁️ 云端暂无数据或数据格式错误');
            }
            
        } catch (error) {
            console.error('从云端同步数据失败:', error);
        }
    }
    
    mergeCloudData(cloudData) {
        try {
            // 合并玩家数据
            if (cloudData.players && Array.isArray(cloudData.players)) {
                const cloudPlayers = new Map(cloudData.players);
                
                cloudPlayers.forEach((cloudPlayer, playerId) => {
                    const localPlayer = this.players.get(playerId);
                    
                    if (!localPlayer) {
                        // 本地没有此玩家，直接添加
                        this.players.set(playerId, {
                            ...cloudPlayer,
                            sessions: cloudPlayer.sessions ? cloudPlayer.sessions.map(s => ({
                                ...s,
                                startTime: new Date(s.startTime),
                                endTime: s.endTime ? new Date(s.endTime) : null
                            })) : []
                        });
                    } else {
                        // 合并玩家数据，保留最新的总时长和会话
                        if (cloudPlayer.totalTime > localPlayer.totalTime) {
                            localPlayer.totalTime = cloudPlayer.totalTime;
                        }
                        
                        // 合并会话数据
                        if (cloudPlayer.sessions && cloudPlayer.sessions.length > 0) {
                            const cloudSessions = cloudPlayer.sessions.map(s => ({
                                ...s,
                                startTime: new Date(s.startTime),
                                endTime: s.endTime ? new Date(s.endTime) : null
                            }));
                            
                            // 简单合并：取最新的会话数据
                            if (cloudSessions.length > localPlayer.sessions.length) {
                                localPlayer.sessions = cloudSessions;
                            }
                        }
                    }
                });
            }
            
            // 合并事件数据
            if (cloudData.events && Array.isArray(cloudData.events)) {
                const cloudEvents = cloudData.events.map(event => ({
                    ...event,
                    timestamp: new Date(event.timestamp)
                }));
                
                // 合并事件，去重
                const allEvents = [...this.events, ...cloudEvents];
                const uniqueEvents = allEvents.filter((event, index, arr) => 
                    arr.findIndex(e => 
                        e.playerId === event.playerId && 
                        e.type === event.type && 
                        Math.abs(new Date(e.timestamp) - new Date(event.timestamp)) < 1000
                    ) === index
                );
                
                this.events = uniqueEvents
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .slice(0, 100);
            }
            
            // 保存到本地
            this.saveData();
            localStorage.setItem('gameMonitorData_timestamp', cloudData.timestamp || cloudData.serverTimestamp || new Date().toISOString());
            
            console.log('✅ 云端数据合并完成');
            
        } catch (error) {
            console.error('合并云端数据失败:', error);
        }
    }
}

// 初始化应用
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new GameMonitorDashboard();
});