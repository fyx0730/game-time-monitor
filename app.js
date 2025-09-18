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
        
        this.initializeElements();
        this.initializeChart();
        this.bindEvents();
        this.loadStoredData();
        this.loadConnectionSettings();
        
        // 页面加载后自动连接
        setTimeout(() => {
            this.autoConnect();
        }, 1000);
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
        console.log('=== 处理玩家事件 ===');
        console.log('玩家ID:', playerId);
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

        // 更新玩家状态
        if (!this.players.has(playerId)) {
            console.log('创建新玩家:', playerId);
            this.players.set(playerId, {
                id: playerId,
                name: data.playerName || playerId,
                totalTime: 0,
                sessions: [],
                isOnline: false,
                currentSession: null
            });
        }

        const player = this.players.get(playerId);
        console.log('当前玩家状态:', player);

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

        console.log('更新后的玩家状态:', player);
        console.log('当前所有玩家:', Array.from(this.players.entries()));

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
        const data = {
            players: Array.from(this.players.entries()),
            events: this.events.slice(0, 50)
        };
        localStorage.setItem('gameMonitorData', JSON.stringify(data));
    }

    loadStoredData() {
        try {
            const stored = localStorage.getItem('gameMonitorData');
            if (stored) {
                const data = JSON.parse(stored);
                this.players = new Map(data.players || []);
                this.events = data.events || [];
                
                // 页面刷新后，重置所有玩家的currentSession，但保持在线状态
                // 这样可以正确处理后续的结束事件
                this.players.forEach((player, playerId) => {
                    if (player.currentSession) {
                        console.log(`重置玩家 ${playerId} 的会话状态 (页面刷新)`);
                        // 保持在线状态，但清除currentSession
                        // 这样如果收到结束事件，会触发估算逻辑
                        player.currentSession = null;
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
                console.log('数据加载完成，玩家数量:', this.players.size);
            }
        } catch (error) {
            console.error('加载存储数据失败:', error);
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
}

// 初始化应用
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new GameMonitorDashboard();
});